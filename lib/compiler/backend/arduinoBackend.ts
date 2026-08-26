import { Node, Edge } from '@xyflow/react';
import {
  ProgramNode,
  StatementNode,
  BlockStatementNode,
  FunctionDeclarationNode,
} from '../ast/ast';
import { pluginRegistry, mapLabelToPluginType } from '../../ir/plugin';
import { resolvePackageImplementation, dispatchPackageExecution } from '../packages';
import { BaseCppGenerator } from './baseCppGenerator';
import {
  CompilerBackend,
  BackendCapabilities,
  BackendContext,
  BackendDiagnostic,
  GeneratedCode,
} from './types';

export class ArduinoCppBackend extends BaseCppGenerator implements CompilerBackend {
  public readonly id: string;
  public readonly name: string;
  public readonly targetId: string;
  public readonly capabilities: BackendCapabilities = {
    digitalRead: true,
    digitalWrite: true,
    analogRead: true,
    analogWrite: true,
    pwm: true,
    tone: true,
    pulseIn: true,
    delay: true,
    delayMicroseconds: true,
    uart: true,
    i2c: true,
    spi: true,
  };

  constructor(targetId: string = 'arduino_uno', name: string = 'Arduino C++ Backend', id: string = 'arduino_cpp_backend') {
    super();
    this.targetId = targetId;
    this.name = name;
    this.id = id;
  }

  public validate(program: ProgramNode, context: BackendContext): BackendDiagnostic[] {
    const diagnostics: BackendDiagnostic[] = [];
    // Can validate capability constraints against program AST
    return diagnostics;
  }

  public generate(program: ProgramNode, context: BackendContext): GeneratedCode {
    const schemaNodes = context.schemaNodes || [];
    const schemaEdges = context.schemaEdges || [];

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

    this.connections.forEach((conn) => {
      if (this.isPowerPin(conn)) return;

      const pluginType = mapLabelToPluginType(conn.componentLabel) || conn.componentType;

      // Consult Package Execution Resolver and Dispatcher for implementation strategy
      const resolvedImpl = resolvePackageImplementation(conn.componentId || pluginType, context.targetId as any);
      dispatchPackageExecution(resolvedImpl.packageId || pluginType, {
        instanceName: this.safeVarName(conn.componentLabel),
      });

      const plugin = pluginRegistry.get(pluginType);
      if (!plugin) return;

      const instanceName = this.safeVarName(conn.componentLabel);

      // Add includes
      plugin.codegen.includes.forEach((inc) => includes.add(inc));

      if (seenComponents.has(conn.componentId)) return;
      seenComponents.add(conn.componentId);

      const compConnections = this.connections.filter((c) => c.componentId === conn.componentId && !this.isPowerPin(c));
      const pinsMap: Record<string, string> = {};
      compConnections.forEach((c) => {
        pinsMap[c.pin] = this.pinToNumber(c.arduinoPin);
      });

      const compNode = schemaNodes.find((n) => n.id === conn.componentId);
      const params = (compNode?.data?.params as Record<string, string>) || {};

      // Defines
      if (plugin.codegen.defines) {
        defines.push(...plugin.codegen.defines(instanceName, pinsMap));
      } else {
        compConnections.forEach((c) => {
          const defineName = `${conn.componentLabel.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${c.pin.toUpperCase()}`;
          defines.push(`#define ${defineName} ${this.pinToNumber(c.arduinoPin)}`);
        });
      }

      // Globals
      if (plugin.codegen.globals) {
        globals.push(...plugin.codegen.globals(instanceName, pinsMap, params));
      }

      // Setup
      if (plugin.codegen.setup) {
        setups.push(...plugin.codegen.setup(instanceName, pinsMap, params).map((line) => `  ${line}`));
      }
    });

    // 2. Separate global function declarations and main program statements
    const mainBody: StatementNode[] = [];

    program.body.forEach((stmt) => {
      if (stmt.kind === 'FunctionDeclaration') {
        const funcDecl = stmt as FunctionDeclarationNode;

        // Add Prototype
        const paramsStr = funcDecl.params.map((p) => `${p.dataType} ${p.name}`).join(', ');
        functionPrototypes.push(`${funcDecl.returnType} ${funcDecl.name}(${paramsStr});`);

        // Compile Function definition body
        const bodyCode = this.generateBlock(funcDecl.body, 1, new Set(funcDecl.params.map((p) => p.name)));
        const funcCode = [
          `${funcDecl.returnType} ${funcDecl.name}(${paramsStr}) {`,
          bodyCode,
          `}`,
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
      body: mainBody,
    };
    const loopCode = this.generateBlock(mainBlock, 1, new Set());

    // 4. Construct final file
    const componentSummary = [...new Set(this.connections.map((c) => c.componentLabel))]
      .map((l) => ` *   - ${l}`)
      .join('\n');

    const platformLabel = this.targetId === 'arduino_mega' ? 'Arduino Mega 2560' : 'Arduino Uno';

    const sections: string[] = [
      `/*`,
      ` * Generated by Flow Programmer (Universal AST compiler)`,
      ` * Platform: ${platformLabel}`,
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
      files: functionFiles,
    };
  }
}
