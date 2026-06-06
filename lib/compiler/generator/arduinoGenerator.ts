import { Node, Edge } from '@xyflow/react';
import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  BlockStatementNode,
  VariableDeclarationNode,
  AssignmentNode,
  IfStatementNode,
  ForLoopNode,
  ReturnStatementNode,
  ExpressionStatementNode,
  LiteralExpressionNode,
  IdentifierExpressionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  FunctionDeclarationNode
} from '../ast/ast';
import { pluginRegistry, mapLabelToPluginType } from '../../ir/plugin';
import { resolvePinMapping, interpolateTemplate, resolveOperationTemplate } from '../../runtime/templates';
import { componentsRegistry } from '../../registry/components';

export interface CodeGeneratorOutput {
  main: string;
  files: Record<string, string>;
}

export interface Connection {
  componentId: string;
  componentLabel: string;
  componentType: string;
  pin: string;
  arduinoPin: string;
}

export class ArduinoUnoGenerator {
  private connections: Connection[] = [];
  private declaredVarsGlobal: Set<string> = new Set();
  private schemaNodes: Node[] = [];
  private schemaEdges: Edge[] = [];

  public generate(
    program: ProgramNode,
    schemaNodes: Node[],
    schemaEdges: Edge[]
  ): CodeGeneratorOutput {
    this.schemaNodes = schemaNodes;
    this.schemaEdges = schemaEdges;
    this.connections = this.parseConnections(schemaNodes, schemaEdges);
    this.declaredVarsGlobal.clear();

    const includes: Set<string> = new Set();
    const defines: string[] = [];
    const globals: string[] = [];
    const setups: string[] = [`  Serial.begin(9600);`];
    const functionPrototypes: string[] = [];
    const functionDefinitions: string[] = [];
    const functionFiles: Record<string, string> = {};

    // 1. Gather component-specific configurations (includes, defines, globals, setups)
    const seenComponents = new Set<string>();

    schemaNodes.forEach(node => {
      if (node.id === 'arduino-uno') return;

      const componentType = (node.data?.componentType as string) || node.type || '';
      const compDef = componentsRegistry[componentType];
      if (!compDef) {
        // Fallback to legacy plugin system for backwards compatibility
        const pluginType = (mapLabelToPluginType((node.data as any)?.label) || componentType) as string;
        const plugin = pluginRegistry.get(pluginType);
        if (!plugin) return;

        const instanceName = this.safeVarName((node.data as any)?.label || node.id);
        plugin.codegen.includes.forEach((inc: string) => includes.add(inc));

        if (seenComponents.has(node.id)) return;
        seenComponents.add(node.id);

        const compConnections = this.connections.filter(c => c.componentId === node.id && !this.isPowerPin(c));
        const pinsMap: Record<string, string> = {};
        compConnections.forEach(c => {
          pinsMap[c.pin] = this.pinToNumber(c.arduinoPin);
        });

        const params = (node.data?.params as Record<string, string>) || {};

        if (plugin.codegen.defines) {
          defines.push(...plugin.codegen.defines(instanceName, pinsMap));
        } else {
          compConnections.forEach(c => {
            const defineName = `${((node.data as any)?.label || node.id).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${c.pin.toUpperCase()}`;
            defines.push(`#define ${defineName} ${this.pinToNumber(c.arduinoPin)}`);
          });
        }

        if (plugin.codegen.globals) {
          globals.push(...plugin.codegen.globals(instanceName, pinsMap, params));
        }

        if (plugin.codegen.setup) {
          setups.push(...plugin.codegen.setup(instanceName, pinsMap, params).map((line: string) => `  ${line}`));
        }
        return;
      }

      if (seenComponents.has(node.id)) return;
      seenComponents.add(node.id);

      const pinMapping = resolvePinMapping(node.id, schemaEdges);
      const params = (node.data?.params as Record<string, string>) || {};

      // Resolve Includes
      const compIncludes = (compDef.runtime.includes || []).map((inc: string) =>
        interpolateTemplate(inc, node.id, pinMapping, params)
      );
      compIncludes.forEach((inc: string) => includes.add(inc));

      // Resolve Globals
      if (compDef.runtime.globals) {
        const globalCode = interpolateTemplate(compDef.runtime.globals, node.id, pinMapping, params);
        globals.push(globalCode);
      }

      // Resolve Setup
      if (compDef.runtime.setup) {
        const setupCode = interpolateTemplate(compDef.runtime.setup, node.id, pinMapping, params);
        setups.push(...setupCode.split('\n').filter(line => line.trim() !== '').map((line: string) => `  ${line}`));
      }
    });

    // 2. Separate global function declarations and main program statements
    const mainBody: StatementNode[] = [];
    
    program.body.forEach(stmt => {
      if (stmt.kind === 'FunctionDeclaration') {
        const funcDecl = stmt as FunctionDeclarationNode;
        
        // Add Prototype
        const paramsStr = funcDecl.params.map(p => `${p.dataType} ${p.name}`).join(', ');
        functionPrototypes.push(`${funcDecl.returnType} ${funcDecl.name}(${paramsStr});`);
        
        // Compile Function definition body
        const bodyCode = this.generateBlock(funcDecl.body, 1, new Set(funcDecl.params.map(p => p.name)));
        const funcCode = [
          `${funcDecl.returnType} ${funcDecl.name}(${paramsStr}) {`,
          bodyCode,
          `}`
        ].join('\n');
        
        functionDefinitions.push(funcCode);
        functionFiles[`${funcDecl.name}.ino`] = funcCode;
      } else {
        mainBody.push(stmt);
      }
    });

    // 3. Compile main loop body
    const mainBlock: BlockStatementNode = {
      kind: 'BlockStatement',
      body: mainBody
    };
    const loopCode = this.generateBlock(mainBlock, 1, new Set());

    // 4. Construct final file
    const componentSummary = [...new Set(this.connections.map(c => c.componentLabel))]
      .map(l => ` *   - ${l}`)
      .join('\n');

    const sections: string[] = [
      `/*`,
      ` * Generated by Flow Programmer (Universal AST compiler)`,
      ` * Platform: Arduino Uno`,
      ` * Components:`,
      componentSummary || ` *   (none connected)`,
      ` */`,
    ];

    if (includes.size > 0) {
      sections.push('', Array.from(includes).join('\n'));
    }

    if (defines.length > 0) {
      sections.push('', `// Pin Definitions`, defines.join('\n'));
    }

    if (globals.length > 0) {
      sections.push('', `// Global Instances`, globals.join('\n'));
    }

    if (functionPrototypes.length > 0) {
      sections.push('', `// Function Prototypes`, functionPrototypes.join('\n'));
    }

    sections.push(
      '',
      `void setup() {`,
      setups.join('\n'),
      `}`,
      '',
      `void loop() {`,
      loopCode || '  // Empty loop',
      `}`
    );

    if (functionDefinitions.length > 0) {
      sections.push('', `// Function Definitions`, functionDefinitions.join('\n\n'));
    }

    return {
      main: sections.join('\n'),
      files: functionFiles
    };
  }

  private generateBlock(block: BlockStatementNode, indent: number, declaredVars: Set<string>): string {
    const lines: string[] = [];

    block.body.forEach(stmt => {
      lines.push(this.generateStatement(stmt, indent, declaredVars));
    });

    return lines.filter(l => l !== '').join('\n');
  }

  private generateStatement(stmt: StatementNode, indent: number, declaredVars: Set<string>): string {
    const pad = '  '.repeat(indent);

    switch (stmt.kind) {
      case 'BlockStatement':
        return this.generateBlock(stmt, indent, declaredVars);

      case 'VariableDeclaration': {
        const valCode = this.generateExpression(stmt.value);
        if (declaredVars.has(stmt.name)) {
          return `${pad}${stmt.name} = ${valCode};`;
        } else {
          declaredVars.add(stmt.name);
          return `${pad}${stmt.varType} ${stmt.name} = ${valCode};`;
        }
      }

      case 'Assignment': {
        const valCode = this.generateExpression(stmt.value);
        return `${pad}${stmt.name} = ${valCode};`;
      }

      case 'IfStatement': {
        const condCode = this.generateExpression(stmt.condition);
        const consCode = this.generateBlock(stmt.consequent, indent + 1, new Set(declaredVars));
        const lines = [
          `${pad}if (${condCode}) {`,
          consCode || `${pad}  // no-op`,
          `${pad}}`
        ];
        if (stmt.alternate && stmt.alternate.body.length > 0) {
          const altCode = this.generateBlock(stmt.alternate, indent + 1, new Set(declaredVars));
          lines.splice(lines.length - 1, 1, `${pad}} else {`, altCode || `${pad}  // no-op`, `${pad}}`);
        }
        return lines.join('\n');
      }

      case 'ForLoop': {
        const initScope = new Set(declaredVars);
        const initCode = this.generateStatement(stmt.init, 0, initScope).trim().slice(0, -1);
        const condCode = this.generateExpression(stmt.condition);
        
        const updCode = stmt.update.kind === 'Assignment'
          ? this.generateStatement(stmt.update, 0, initScope).trim().slice(0, -1)
          : this.generateExpression(stmt.update as ExpressionNode);

        const bodyCode = this.generateBlock(stmt.body, indent + 1, initScope);

        return [
          `${pad}for (${initCode}; ${condCode}; ${updCode}) {`,
          bodyCode || `${pad}  // loop body`,
          `${pad}}`
        ].join('\n');
      }

      case 'WhileLoop': {
        const condCode = this.generateExpression(stmt.condition);
        const bodyCode = this.generateBlock(stmt.body, indent + 1, new Set(declaredVars));
        return [
          `${pad}while (${condCode}) {`,
          bodyCode || `${pad}  // loop body`,
          `${pad}}`
        ].join('\n');
      }

      case 'ReturnStatement': {
        if (stmt.value) {
          return `${pad}return ${this.generateExpression(stmt.value)};`;
        }
        return `${pad}return;`;
      }

      case 'ExpressionStatement': {
        if (stmt.expression.kind === 'CallExpression' && stmt.expression.callee.endsWith('.custom')) {
          const pluginType = stmt.expression.callee.split('.')[0];
          const plugin = pluginRegistry.get(pluginType);
          if (plugin && plugin.codegen.customCodegen) {
            const conn = this.connections.find(c => {
              const type = mapLabelToPluginType(c.componentLabel) || c.componentType;
              return type === pluginType;
            });
            const instanceName = conn ? this.safeVarName(conn.componentLabel) : `${pluginType}_sensor`;

            const pinsMap: Record<string, string> = {};
            this.connections.filter(c => c.componentId === conn?.componentId && !this.isPowerPin(c)).forEach(c => {
              pinsMap[c.pin] = this.pinToNumber(c.arduinoPin);
            });

            let params: Record<string, string> = {};
            const paramLit = stmt.expression.arguments[0] as LiteralExpressionNode;
            if (paramLit && paramLit.kind === 'Literal') {
              try {
                params = JSON.parse(String(paramLit.value));
              } catch (e) {}
            }

            return plugin.codegen.customCodegen(instanceName, pinsMap, params, declaredVars, pad);
          }
        }

        const exprCode = this.generateExpression(stmt.expression);
        return `${pad}${exprCode};`;
      }
    }
    return '';
  }

  private generateExpression(expr: ExpressionNode): string {
    switch (expr.kind) {
      case 'Literal':
        if (expr.valueType === 'string') {
          return `"${expr.value}"`;
        }
        return String(expr.value);

      case 'Identifier':
        return expr.name;

      case 'BinaryExpression':
        return `(${this.generateExpression(expr.left)} ${expr.operator} ${this.generateExpression(expr.right)})`;

      case 'UnaryExpression':
        return `(${expr.operator}${this.generateExpression(expr.argument)})`;

      case 'CallExpression': {
        if (expr.callee.startsWith('hardware::')) {
          const operationId = expr.callee.slice(10);
          const arg0 = expr.arguments[0] as LiteralExpressionNode;
          const arg1 = expr.arguments[1] as LiteralExpressionNode;
          
          const targetId = String(arg0.value);
          let opParams: Record<string, string> = {};
          try {
            opParams = JSON.parse(String(arg1.value));
          } catch (e) {}

          const compNode = this.schemaNodes.find(n => n.id === targetId);
          let componentType = '';
          let componentNodeId = '';
          if (compNode) {
            componentType = (compNode.data?.componentType as string) || compNode.type || '';
            componentNodeId = compNode.id;
          } else {
            componentType = 'direct';
          }

          let resolvedOpId = operationId;
          if (componentType === 'dht22' && operationId === 'sensor_read') {
            const rType = opParams.readingType || 'Temperature';
            resolvedOpId = rType === 'Humidity' ? 'read_humidity' : 'read_temperature';
          }

          if (componentType && componentType !== 'direct') {
            const resolved = resolveOperationTemplate(
              resolvedOpId,
              componentType,
              componentNodeId,
              this.schemaEdges,
              opParams
            );
            if (resolved) {
              return resolved.code;
            }
          }

          if (operationId === 'gpio_write') {
            const pinVal = opParams.pin || '13';
            const stateVal = opParams.value || 'HIGH';
            return `digitalWrite(${pinVal}, ${stateVal})`;
          }

          return `/* Failed to resolve hardware operation ${operationId} for ${targetId} */ 0`;
        }

        const argsCode = expr.arguments.map(arg => this.generateExpression(arg)).join(', ');
        return `${expr.callee}(${argsCode})`;
      }
    }
    return '';
  }

  private parseConnections(schemaNodes: Node[], schemaEdges: Edge[]): Connection[] {
    const connections: Connection[] = [];
    schemaEdges.forEach(edge => {
      const sourceNode = schemaNodes.find(n => n.id === edge.source);
      const targetNode = schemaNodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const isSourceUno = sourceNode.id === 'arduino-uno';
      const unoPin = isSourceUno ? edge.sourceHandle : edge.targetHandle;
      const compNode = isSourceUno ? targetNode : sourceNode;
      const compPin = isSourceUno ? edge.targetHandle : edge.sourceHandle;

      if (!unoPin || !compNode || !compPin) return;

      connections.push({
        componentId: compNode.id,
        componentLabel: ((compNode.data as any)?.label as string) || compNode.id,
        componentType: ((compNode.data as any)?.componentType as string) || 'device',
        pin: compPin as string,
        arduinoPin: unoPin as string
      });
    });
    return connections;
  }

  private isPowerPin(conn: Connection): boolean {
    const powerKeys = ['gnd', 'vcc', 'vdd', 'vss', 'vin', '5v', '3.3v', '3v3', 'cathode', 'neg'];
    return (
      powerKeys.includes(conn.pin.toLowerCase()) ||
      powerKeys.includes(conn.arduinoPin.toLowerCase())
    );
  }

  private pinToNumber(pin: string): string {
    if (pin.startsWith('D')) return pin.slice(1);
    return pin;
  }

  private safeVarName(label: string): string {
    return label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }
}
