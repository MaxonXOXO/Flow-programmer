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
import { pluginRegistry, mapLabelToPluginType } from '../../ir/plugin';
import { resolvePackageImplementation, dispatchPackageExecution } from '../packages';
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
