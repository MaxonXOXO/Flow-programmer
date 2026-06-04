import { Node, Edge } from '@xyflow/react';
import {
  Program,
  FunctionDeclaration,
  Statement,
  BlockStatement,
  VariableDeclaration,
  AssignmentStatement,
  IfStatement,
  ForLoop,
  WhileLoop,
  ReturnStatement,
  ExpressionStatement,
  Expression,
  LiteralExpression,
  IdentifierExpression,
  BinaryExpression,
  FunctionCallExpression,
  Parameter
} from './ast';
import { pluginRegistry, parsePrintArguments } from './plugin';

// Helper to parse strings, numbers, variables, or binary expressions entered by the user
export function parseExpressionString(str: string, nodeId?: string): Expression {
  const trimmed = str.trim();

  // 1. Quoted string literals
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return {
      type: 'LiteralExpression',
      nodeId,
      value: trimmed.slice(1, -1),
      valueType: 'string'
    };
  }

  // 2. Boolean literals
  if (trimmed === 'true' || trimmed === 'false') {
    return {
      type: 'LiteralExpression',
      nodeId,
      value: trimmed === 'true',
      valueType: 'boolean'
    };
  }

  // 3. Numeric literals (floats or integers)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    return {
      type: 'LiteralExpression',
      nodeId,
      value: num,
      valueType: trimmed.includes('.') ? 'float' : 'int'
    };
  }

  // 4. Check for binary operators: ==, !=, >=, <=, >, <, +, -, *, /, &&, ||
  const binaryOps = ['&&', '||', '==', '!=', '>=', '<=', '>', '<', '+', '-', '*', '/'];
  for (const op of binaryOps) {
    const index = trimmed.indexOf(op);
    if (index !== -1 && index > 0 && index < trimmed.length - op.length) {
      const leftPart = trimmed.substring(0, index).trim();
      const rightPart = trimmed.substring(index + op.length).trim();
      // Ensure it's not part of another word
      if (leftPart && rightPart) {
        return {
          type: 'BinaryExpression',
          nodeId,
          operator: op,
          left: parseExpressionString(leftPart, nodeId),
          right: parseExpressionString(rightPart, nodeId)
        };
      }
    }
  }

  // 5. Default fallback to identifier
  return {
    type: 'IdentifierExpression',
    nodeId,
    name: trimmed || '0'
  };
}

// Splits argument strings "int x, float y" into Parameter objects
function parseParameterString(argsStr: string): Parameter[] {
  if (!argsStr) return [];
  return argsStr.split(',').map(part => {
    const trimmed = part.trim();
    // Match "type name" e.g., "int x"
    const match = trimmed.match(/^(\w+)\s+(\w+)$/);
    if (match) {
      return { dataType: match[1], name: match[2] };
    }
    return { dataType: 'int', name: trimmed };
  }).filter(p => p.name !== '');
}

export class GraphToIRCompiler {
  private visited: Set<string> = new Set();
  private flowNodes: Node[] = [];
  private flowEdges: Edge[] = [];
  private subFlows: Record<string, { nodes: Node[]; edges: Edge[] }> = {};

  constructor(
    flowNodes: Node[],
    flowEdges: Edge[],
    subFlows: Record<string, { nodes: Node[]; edges: Edge[] }> = {}
  ) {
    this.flowNodes = flowNodes;
    this.flowEdges = flowEdges;
    this.subFlows = subFlows;
  }

  public compile(): Program {
    this.visited.clear();
    const body: Statement[] = [];

    // Compile Sub-flows (Function Declarations)
    Object.entries(this.subFlows).forEach(([funcNodeId, subFlow]) => {
      // Find the visual function caller node in main canvas or subflows
      let fnNode = this.flowNodes.find(n => n.id === funcNodeId);
      if (!fnNode) {
        for (const sf of Object.values(this.subFlows)) {
          const found = sf.nodes.find(n => n.id === funcNodeId);
          if (found) { fnNode = found; break; }
        }
      }
      if (!fnNode) return;

      const data = fnNode.data as any;
      const fnName = data?.params?.name || 'myFn';
      const returnType = data?.params?.returnType || 'void';
      const argsStr = data?.params?.arguments || '';

      const subCompiler = new GraphToIRCompiler(subFlow.nodes, subFlow.edges, {});
      const blockBody = subCompiler.compileBlock(subFlow.nodes.find(n => n.data?.nodeType === 'start')?.id);

      const funcDecl: FunctionDeclaration = {
        type: 'FunctionDeclaration',
        nodeId: funcNodeId,
        name: fnName,
        returnType,
        params: parseParameterString(argsStr),
        body: blockBody
      };

      // Wrap function decl into ExpressionStatement/special syntax for main program body
      // We will place all function declarations in the global scope
      // and target code generators will pull them out.
      body.push({
        type: 'ExpressionStatement',
        nodeId: funcNodeId,
        expression: {
          type: 'LiteralExpression',
          nodeId: funcNodeId,
          value: JSON.stringify(funcDecl), // Serialized function declaration
          valueType: 'string'
        } as any
      });
    });

    // Compile main flow (e.g. loops/setup nodes)
    const mainStart = this.flowNodes.find(n => n.data?.nodeType === 'start');
    if (mainStart) {
      const mainStatements = this.compileBlock(mainStart.id);
      body.push(...mainStatements.body);
    }

    return {
      type: 'Program',
      body
    };
  }

  private compileBlock(startNodeId: string | undefined): BlockStatement {
    const body: Statement[] = [];
    let currentId = startNodeId;

    while (currentId && !this.visited.has(currentId)) {
      const node = this.flowNodes.find(n => n.id === currentId);
      if (!node) break;

      const data = node.data as any;
      const type = data?.nodeType || 'start';

      if (type === 'end') {
        this.visited.add(currentId);
        const retValue = data?.params?.value;
        body.push({
          type: 'ReturnStatement',
          nodeId: currentId,
          value: retValue ? parseExpressionString(retValue, currentId) : undefined
        });
        break;
      }

      // Add to visited before following conditional branches to allow path separation
      this.visited.add(currentId);

      if (type === 'variable') {
        const varName = data?.params?.name || 'x';
        const rawValue = data?.params?.value || '0';
        body.push({
          type: 'VariableDeclaration',
          nodeId: currentId,
          name: varName,
          varType: rawValue.includes('.') ? 'float' : 'int',
          value: parseExpressionString(rawValue, currentId)
        });
      } else if (type === 'print') {
        const rawMsg = data?.params?.message || '""';
        const parts = parsePrintArguments(rawMsg);
        if (parts.length <= 1) {
          body.push({
            type: 'ExpressionStatement',
            nodeId: currentId,
            expression: {
              type: 'FunctionCallExpression',
              nodeId: currentId,
              callee: 'Serial.println',
              arguments: [parseExpressionString(rawMsg, currentId)]
            }
          });
        } else {
          parts.forEach((part, idx) => {
            const isLast = idx === parts.length - 1;
            body.push({
              type: 'ExpressionStatement',
              nodeId: currentId,
              expression: {
                type: 'FunctionCallExpression',
                nodeId: currentId,
                callee: isLast ? 'Serial.println' : 'Serial.print',
                arguments: [parseExpressionString(part, currentId)]
              }
            });
          });
        }
      } else if (type === 'input') {
        const varName = data?.params?.var || 'val';
        // Add prompt print
        body.push({
          type: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: 'Serial.print',
            arguments: [parseExpressionString(data?.params?.prompt || '""', currentId)]
          }
        });
        // Read input
        body.push({
          type: 'AssignmentStatement',
          nodeId: currentId,
          name: varName,
          value: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: 'Serial.parseInt',
            arguments: []
          }
        });
      } else if (type === 'delay') {
        body.push({
          type: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: 'delay',
            arguments: [parseExpressionString(data?.params?.ms || '1000', currentId)]
          }
        });
      } else if (type === 'gpio') {
        body.push({
          type: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: 'digitalWrite',
            arguments: [
              parseExpressionString(data?.params?.pin || '13', currentId),
              parseExpressionString(data?.params?.value || 'HIGH', currentId)
            ]
          }
        });
      } else if (type === 'sensor') {
        const varName = data?.params?.var || 'sensorVal';
        const pin = data?.params?.pin || 'A0';
        body.push({
          type: 'VariableDeclaration',
          nodeId: currentId,
          name: varName,
          varType: 'int',
          value: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: 'analogRead',
            arguments: [parseExpressionString(pin, currentId)]
          }
        });
      } else if (pluginRegistry.get(type)) {
        // Hardware plugin node!
        const plugin = pluginRegistry.get(type)!;
        const name = type + '_sensor'; // default fallback var name
        // We will build a MemberExpression or standard function call to map it
        // and represent it in the AST as a special custom expression
        body.push({
          type: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: `${type}.custom`, // Callee name tags the plugin type
            arguments: [
              // Pack params as literal stringified JSON
              {
                type: 'LiteralExpression',
                nodeId: currentId,
                value: JSON.stringify(data?.params || {}),
                valueType: 'string'
              }
            ]
          }
        });
      } else if (type === 'function') {
        // Function call node
        const fnName = data?.params?.name || 'myFn';
        const argValues = data?.params?.argValues || '';
        const assignTo = data?.params?.assignTo || '';
        const returnType = data?.params?.returnType || 'void';

        const argsExprs = argValues.split(',').map((arg: string) => parseExpressionString(arg.trim(), currentId)).filter(Boolean);

        const callExpr: FunctionCallExpression = {
          type: 'FunctionCallExpression',
          nodeId: currentId,
          callee: fnName,
          arguments: argsExprs
        };

        if (returnType !== 'void' && assignTo) {
          body.push({
            type: 'AssignmentStatement',
            nodeId: currentId,
            name: assignTo,
            value: callExpr
          });
        } else {
          body.push({
            type: 'ExpressionStatement',
            nodeId: currentId,
            expression: callExpr
          });
        }
      } else if (type === 'api') {
        body.push({
          type: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            type: 'FunctionCallExpression',
            nodeId: currentId,
            callee: 'apiMock',
            arguments: [
              parseExpressionString(data?.params?.method || 'GET', currentId),
              parseExpressionString(data?.params?.url || '""', currentId)
            ]
          }
        });
      } else if (type === 'condition') {
        // Compile branches
        const condExpr = parseExpressionString(data?.params?.condition || 'true', currentId);
        
        // Follow true handle
        const trueEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'true');
        const consequentCompiler = new GraphToIRCompiler(this.flowNodes, this.flowEdges, this.subFlows);
        consequentCompiler.visited = new Set(this.visited);
        const consequent = consequentCompiler.compileBlock(trueEdge?.target);

        // Follow false handle
        const falseEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'false');
        let alternate: BlockStatement | undefined = undefined;
        if (falseEdge) {
          const alternateCompiler = new GraphToIRCompiler(this.flowNodes, this.flowEdges, this.subFlows);
          alternateCompiler.visited = new Set(this.visited);
          alternate = alternateCompiler.compileBlock(falseEdge.target);
        }

        body.push({
          type: 'IfStatement',
          nodeId: currentId,
          condition: condExpr,
          consequent,
          alternate
        });

        // Convergent execution edge
        const doneEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'flow');
        currentId = doneEdge?.target;
        continue;
      } else if (type === 'loop') {
        const loopVar = data?.params?.var || 'i';
        const from = data?.params?.from || '0';
        const to = data?.params?.to || '10';
        const step = data?.params?.step || '1';

        // Translate to a standard ForLoop in the AST
        const init: VariableDeclaration = {
          type: 'VariableDeclaration',
          nodeId: currentId,
          name: loopVar,
          varType: 'int',
          value: parseExpressionString(from, currentId)
        };

        const condition: BinaryExpression = {
          type: 'BinaryExpression',
          nodeId: currentId,
          operator: '<',
          left: { type: 'IdentifierExpression', nodeId: currentId, name: loopVar },
          right: parseExpressionString(to, currentId)
        };

        const update: AssignmentStatement = {
          type: 'AssignmentStatement',
          nodeId: currentId,
          name: loopVar,
          value: {
            type: 'BinaryExpression',
            nodeId: currentId,
            operator: '+',
            left: { type: 'IdentifierExpression', nodeId: currentId, name: loopVar },
            right: parseExpressionString(step, currentId)
          }
        };

        // Body path execution
        const bodyEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'body');
        const bodyCompiler = new GraphToIRCompiler(this.flowNodes, this.flowEdges, this.subFlows);
        bodyCompiler.visited = new Set(this.visited);
        const loopBody = bodyCompiler.compileBlock(bodyEdge?.target);

        body.push({
          type: 'ForLoop',
          nodeId: currentId,
          init,
          condition,
          update,
          body: loopBody
        });

        // Exit/Done execution path
        const doneEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'done');
        currentId = doneEdge?.target;
        continue;
      }

      // Default follow standard 'flow' edge
      const edge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'flow');
      currentId = edge?.target;
    }

    return {
      type: 'BlockStatement',
      body
    };
  }
}
