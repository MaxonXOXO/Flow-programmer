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
  FunctionDeclarationNode,
} from '../ast/ast';
import { pluginRegistry } from '../../ir/plugin';
import { resolvePackageImplementation, dispatchPackageExecution } from '../packages';
import { getComponentPackage } from '../../registry/components';
import { GeneratedCode, BackendContext } from './types';

export interface Connection {
  componentId: string;
  componentLabel: string;
  componentType: string;
  pin: string;
  arduinoPin: string;
}

export abstract class BaseCppGenerator {
  protected connections: Connection[] = [];
  protected declaredVarsGlobal: Set<string> = new Set();

  public abstract generate(program: ProgramNode, context: BackendContext): GeneratedCode;

  protected parseConnections(schemaNodes: Node[] = [], schemaEdges: Edge[] = []): Connection[] {
    const connections: Connection[] = [];
    schemaEdges.forEach((edge) => {
      const sourceNode = schemaNodes.find((n) => n.id === edge.source);
      const targetNode = schemaNodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const isSourceBoard =
        sourceNode.type === 'boardNode' ||
        sourceNode.type === 'unoNode' ||
        sourceNode.id === 'arduino-uno' ||
        sourceNode.id === 'board';

      const boardPin = isSourceBoard ? edge.sourceHandle : edge.targetHandle;
      const compNode = isSourceBoard ? targetNode : sourceNode;
      const compPin = isSourceBoard ? edge.targetHandle : edge.sourceHandle;

      if (!boardPin || !compNode || !compPin) return;

      connections.push({
        componentId: compNode.id,
        componentLabel: ((compNode.data as any)?.label as string) || compNode.id,
        componentType: ((compNode.data as any)?.componentType as string) || 'device',
        pin: compPin as string,
        arduinoPin: boardPin as string,
      });
    });
    return connections;
  }

  protected isPowerPin(conn: Connection): boolean {
    const powerKeys = ['gnd', 'vcc', 'vdd', 'vss', 'vin', '5v', '3.3v', '3v3', 'cathode', 'neg'];
    return (
      powerKeys.includes(conn.pin.toLowerCase()) ||
      powerKeys.includes(conn.arduinoPin.toLowerCase())
    );
  }

  protected pinToNumber(pin: string): string {
    if (pin.startsWith('D') && /^\d+$/.test(pin.slice(1))) {
      return pin.slice(1);
    }
    return pin;
  }

  protected formatPin(pin: string, isEsp32: boolean = false): string {
    if (isEsp32) {
      if (pin.startsWith('D') && /^\d+$/.test(pin.slice(1))) {
        return pin.slice(1);
      }
      return pin;
    }
    return this.pinToNumber(pin);
  }

  /**
   * Resolves the authoritative physical pin binding map for a specific component instance
   * from Schema Canvas connections, normalizing schematic pin names to canonical package
   * and codegen alias keys ($PIN1, signal, trigPin, echoPin, etc.).
   */
  protected resolveInstancePinsMap(
    compId: string,
    schemaNodes: Node[] = [],
    isEsp32: boolean = false
  ): Record<string, string> {
    const compConnections = this.connections.filter((c) => c.componentId === compId && !this.isPowerPin(c));
    const compNode = schemaNodes.find((n) => n.id === compId);
    const nodeData = (compNode?.data || {}) as any;
    const packageId = nodeData.params?.packageId || nodeData.packageId || nodeData.componentType;
    const pkgDef = packageId ? getComponentPackage(packageId) : undefined;

    const pinsMap: Record<string, string> = {};

    // 1. Map explicit physical wire connections
    compConnections.forEach((c) => {
      const pinVal = this.formatPin(c.arduinoPin, isEsp32);
      const rawPin = c.pin;
      pinsMap[rawPin] = pinVal;
      pinsMap[rawPin.toLowerCase()] = pinVal;
      pinsMap[rawPin.toUpperCase()] = pinVal;
    });

    // 2. Map canonical package declared pins and signals
    if (pkgDef?.pins && Array.isArray(pkgDef.pins)) {
      pkgDef.pins.forEach((p: any) => {
        const pId = p.id;
        const bound = pinsMap[pId] || pinsMap[pId.toLowerCase()] || pinsMap[pId.toUpperCase()];
        if (bound) {
          pinsMap[`$${pId.toUpperCase()}`] = bound;
          pinsMap[`$${pId.toLowerCase()}`] = bound;
          pinsMap[`$${pId}`] = bound;

          if (p.signal === 'analog_output' || p.signal === 'analog_input') {
            pinsMap['signal'] = bound;
            pinsMap['pin'] = bound;
            pinsMap['pin1'] = bound;
            pinsMap['PIN1'] = bound;
            pinsMap['ao'] = bound;
            pinsMap['analog'] = bound;
            pinsMap['sensorPin'] = bound;
          } else if (p.signal === 'digital_output' || p.signal === 'digital_input') {
            const lower = pId.toLowerCase();
            if (lower.includes('trig')) {
              pinsMap['trig'] = bound;
              pinsMap['trigPin'] = bound;
              pinsMap['trig_pin'] = bound;
              pinsMap['TRIG'] = bound;
              pinsMap['$trigPin'] = bound;
              pinsMap['$TRIG'] = bound;
            } else if (lower.includes('echo')) {
              pinsMap['echo'] = bound;
              pinsMap['echoPin'] = bound;
              pinsMap['echo_pin'] = bound;
              pinsMap['ECHO'] = bound;
              pinsMap['$echoPin'] = bound;
              pinsMap['$ECHO'] = bound;
            } else {
              if (!pinsMap['signal']) pinsMap['signal'] = bound;
              if (!pinsMap['pin']) pinsMap['pin'] = bound;
            }
          }
        }
      });
    }

    // 3. Universal canonical aliases (for standard schematic pins)
    if (pinsMap['pin1']) {
      const p = pinsMap['pin1'];
      if (!pinsMap['signal']) pinsMap['signal'] = p;
      if (!pinsMap['pin']) pinsMap['pin'] = p;
      if (!pinsMap['PIN1']) pinsMap['PIN1'] = p;
      if (!pinsMap['$PIN1']) pinsMap['$PIN1'] = p;
      if (!pinsMap['ao']) pinsMap['ao'] = p;
      if (!pinsMap['analog']) pinsMap['analog'] = p;
      if (!pinsMap['sensorPin']) pinsMap['sensorPin'] = p;
    }
    if (pinsMap['signal']) {
      const p = pinsMap['signal'];
      if (!pinsMap['pin1']) pinsMap['pin1'] = p;
      if (!pinsMap['pin']) pinsMap['pin'] = p;
      if (!pinsMap['PIN1']) pinsMap['PIN1'] = p;
      if (!pinsMap['$PIN1']) pinsMap['$PIN1'] = p;
    }
    if (pinsMap['ao']) {
      const p = pinsMap['ao'];
      if (!pinsMap['pin1']) pinsMap['pin1'] = p;
      if (!pinsMap['signal']) pinsMap['signal'] = p;
      if (!pinsMap['pin']) pinsMap['pin'] = p;
      if (!pinsMap['PIN1']) pinsMap['PIN1'] = p;
      if (!pinsMap['$PIN1']) pinsMap['$PIN1'] = p;
    }
    if (pinsMap['data']) {
      const p = pinsMap['data'];
      if (!pinsMap['signal']) pinsMap['signal'] = p;
      if (!pinsMap['pin']) pinsMap['pin'] = p;
      if (!pinsMap['pin1']) pinsMap['pin1'] = p;
      if (!pinsMap['PIN1']) pinsMap['PIN1'] = p;
    }
    if (pinsMap['trig']) {
      const p = pinsMap['trig'];
      if (!pinsMap['trigPin']) pinsMap['trigPin'] = p;
      if (!pinsMap['trig_pin']) pinsMap['trig_pin'] = p;
      if (!pinsMap['$trigPin']) pinsMap['$trigPin'] = p;
      if (!pinsMap['$TRIG']) pinsMap['$TRIG'] = p;
      if (!pinsMap['$trig']) pinsMap['$trig'] = p;
    }
    if (pinsMap['echo']) {
      const p = pinsMap['echo'];
      if (!pinsMap['echoPin']) pinsMap['echoPin'] = p;
      if (!pinsMap['echo_pin']) pinsMap['echo_pin'] = p;
      if (!pinsMap['$echoPin']) pinsMap['$echoPin'] = p;
      if (!pinsMap['$ECHO']) pinsMap['$ECHO'] = p;
      if (!pinsMap['$echo']) pinsMap['$echo'] = p;
    }
    if (pinsMap['trigPin'] && !pinsMap['trig']) {
      pinsMap['trig'] = pinsMap['trigPin'];
      pinsMap['$trigPin'] = pinsMap['trigPin'];
    }
    if (pinsMap['echoPin'] && !pinsMap['echo']) {
      pinsMap['echo'] = pinsMap['echoPin'];
      pinsMap['$echoPin'] = pinsMap['echoPin'];
    }

    return pinsMap;
  }

  protected safeVarName(label: string): string {
    return label.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  protected generateBlock(block: BlockStatementNode, indent: number, declaredVars: Set<string>): string {
    const lines: string[] = [];
    block.body.forEach((stmt) => {
      lines.push(this.generateStatement(stmt, indent, declaredVars));
    });
    return lines.filter((l) => l !== '').join('\n');
  }

  protected generateStatement(stmt: StatementNode, indent: number, declaredVars: Set<string>): string {
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
          `${pad}}`,
        ];
        if (stmt.alternate && stmt.alternate.body.length > 0) {
          const altCode = this.generateBlock(stmt.alternate, indent + 1, new Set(declaredVars));
          lines.splice(lines.length - 1, 1, `${pad}} else {`, altCode || `${pad}  // no-op`, `${pad}}`);
        }
        return lines.join('\n');
      }

      case 'ForLoop': {
        let initCode = '';
        if (stmt.init.kind === 'VariableDeclaration') {
          initCode = `${stmt.init.varType} ${stmt.init.name} = ${this.generateExpression(stmt.init.value)}`;
        } else {
          initCode = `${stmt.init.name} = ${this.generateExpression(stmt.init.value)}`;
        }
        const condCode = this.generateExpression(stmt.condition);
        let updateCode = '';
        if ('kind' in stmt.update && stmt.update.kind === 'Assignment') {
          updateCode = `${stmt.update.name} = ${this.generateExpression(stmt.update.value)}`;
        } else {
          updateCode = this.generateExpression(stmt.update as ExpressionNode);
        }
        const bodyCode = this.generateBlock(stmt.body, indent + 1, new Set(declaredVars));
        return [
          `${pad}for (${initCode}; ${condCode}; ${updateCode}) {`,
          bodyCode || `${pad}  // no-op`,
          `${pad}}`,
        ].join('\n');
      }

      case 'ReturnStatement': {
        if (stmt.value) {
          return `${pad}return ${this.generateExpression(stmt.value)};`;
        }
        return `${pad}return;`;
      }

      case 'ExpressionStatement':
        return `${pad}${this.generateExpression(stmt.expression)};`;

      default:
        return '';
    }
  }

  protected generateExpression(expr: ExpressionNode): string {
    switch (expr.kind) {
      case 'Literal':
        if (typeof expr.value === 'string') {
          return `"${expr.value}"`;
        }
        return String(expr.value);

      case 'Identifier':
        return expr.name;

      case 'BinaryExpression': {
        const left = this.generateExpression(expr.left);
        const right = this.generateExpression(expr.right);
        return `(${left} ${expr.operator} ${right})`;
      }

      case 'UnaryExpression': {
        const arg = this.generateExpression(expr.argument);
        return `${expr.operator}(${arg})`;
      }

      case 'CallExpression': {
        const argsCode = expr.arguments.map((arg) => this.generateExpression(arg)).join(', ');
        return `${expr.callee}(${argsCode})`;
      }

      default:
        return '';
    }
  }
}
