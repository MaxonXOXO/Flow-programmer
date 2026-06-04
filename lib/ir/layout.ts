import { Node, Edge } from '@xyflow/react';
import { Program, Statement, IfStatement, ForLoop, WhileLoop, BlockStatement } from './ast';

export class IRToFlowLayout {
  private nodeIdCounter = 0;
  private nodes: Node[] = [];
  private edges: Edge[] = [];

  private nextNodeId(type: string): string {
    this.nodeIdCounter++;
    return `node_${type}_${this.nodeIdCounter}`;
  }

  public convert(program: Program): { nodes: Node[]; edges: Edge[] } {
    this.nodes = [];
    this.edges = [];
    this.nodeIdCounter = 0;

    // 1. Create start node
    const startId = this.nextNodeId('start');
    this.nodes.push({
      id: startId,
      type: 'baseNode',
      position: { x: 300, y: 50 },
      data: { label: 'Start', nodeType: 'start', icon: '▶', params: {} }
    });

    // 2. Lay out statements recursively
    const lastNodeInfo = this.layoutBlock(program.body, 300, 180, startId, 'flow');

    // 3. Create end node
    const endId = this.nextNodeId('end');
    this.nodes.push({
      id: endId,
      type: 'baseNode',
      position: { x: 300, y: lastNodeInfo.endY + 100 },
      data: { label: 'End', nodeType: 'end', icon: '⬛', params: {} }
    });

    this.edges.push({
      id: `edge_${lastNodeInfo.endNodeId}_to_${endId}`,
      source: lastNodeInfo.endNodeId,
      sourceHandle: 'flow',
      target: endId,
      targetHandle: 'flow'
    });

    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }

  private layoutBlock(
    statements: Statement[],
    startX: number,
    startY: number,
    previousNodeId: string,
    previousSourceHandle: string
  ): { endY: number; endNodeId: string } {
    let currentY = startY;
    let prevId = previousNodeId;
    let prevHandle = previousSourceHandle;

    statements.forEach(stmt => {
      // Skip serialized functions as they are parsed into subFlows separately
      if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'LiteralExpression') {
        const valStr = String(stmt.expression.value);
        if (valStr.startsWith('{"type":"FunctionDeclaration"')) {
          return;
        }
      }

      const nodeId = this.nextNodeId(stmt.type.toLowerCase());
      let nodeData: any = { label: '', nodeType: '', params: {} };

      switch (stmt.type) {
        case 'VariableDeclaration':
          nodeData = {
            label: `Set ${stmt.name}`,
            nodeType: 'variable',
            icon: 'Binary',
            params: { name: stmt.name, value: this.exprToString(stmt.value) }
          };
          break;

        case 'AssignmentStatement':
          nodeData = {
            label: `Assign ${stmt.name}`,
            nodeType: 'variable',
            icon: 'Binary',
            params: { name: stmt.name, value: this.exprToString(stmt.value) }
          };
          break;

        case 'ReturnStatement':
          nodeData = {
            label: 'Return',
            nodeType: 'end',
            icon: '⬛',
            params: { value: stmt.value ? this.exprToString(stmt.value) : '' }
          };
          break;

        case 'ExpressionStatement': {
          const expr = stmt.expression;
          if (expr.type === 'FunctionCallExpression') {
            if (expr.callee === 'Serial.println' || expr.callee === 'Serial.print') {
              nodeData = {
                label: 'Print Message',
                nodeType: 'print',
                icon: 'Printer',
                params: { message: this.exprToString(expr.arguments[0]) }
              };
            } else if (expr.callee === 'delay') {
              nodeData = {
                label: 'Delay Pause',
                nodeType: 'delay',
                icon: 'Timer',
                params: { ms: this.exprToString(expr.arguments[0]) }
              };
            } else if (expr.callee === 'digitalWrite') {
              nodeData = {
                label: 'Write Pin',
                nodeType: 'gpio',
                icon: 'Zap',
                params: {
                  pin: this.exprToString(expr.arguments[0]),
                  value: this.exprToString(expr.arguments[1])
                }
              };
            } else if (expr.callee === 'apiMock') {
              nodeData = {
                label: 'HTTP Call',
                nodeType: 'api',
                icon: 'Link',
                params: {
                  method: this.exprToString(expr.arguments[0]),
                  url: this.exprToString(expr.arguments[1])
                }
              };
            } else if (expr.callee.includes('.custom')) {
              // Custom hardware plugins
              const type = expr.callee.split('.')[0];
              let params = {};
              if (expr.arguments[0]?.type === 'LiteralExpression') {
                try {
                  params = JSON.parse(String(expr.arguments[0].value));
                } catch (e) {}
              }
              nodeData = {
                label: `${type.toUpperCase()} Device`,
                nodeType: type,
                icon: 'Wrench',
                params
              };
            } else {
              // General function call
              nodeData = {
                label: `Call ${expr.callee}`,
                nodeType: 'function',
                icon: 'Braces',
                params: {
                  name: expr.callee,
                  argValues: expr.arguments.map(arg => this.exprToString(arg)).join(', ')
                }
              };
            }
          }
          break;
        }

        case 'IfStatement': {
          nodeData = {
            label: 'Check Condition',
            nodeType: 'condition',
            icon: 'GitFork',
            params: { condition: this.exprToString(stmt.condition) }
          };
          break;
        }

        case 'ForLoop': {
          // Extract limit details
          const from = this.exprToString((stmt.init as any).value || '0');
          const to = this.exprToString(stmt.condition.type === 'BinaryExpression' ? stmt.condition.right : '10');
          const step = this.exprToString((stmt.update as any).type === 'AssignmentStatement' ? ((stmt.update as any).value as any).right : '1');
          nodeData = {
            label: 'For Loop',
            nodeType: 'loop',
            icon: 'RotateCw',
            params: {
              var: (stmt.init as any).name || 'i',
              from,
              to,
              step
            }
          };
          break;
        }

        case 'WhileLoop': {
          nodeData = {
            label: 'While Loop',
            nodeType: 'loop',
            icon: 'RotateCw',
            params: {
              condition: this.exprToString(stmt.condition)
            }
          };
          break;
        }
      }

      this.nodes.push({
        id: nodeId,
        type: 'baseNode',
        position: { x: startX, y: currentY },
        data: nodeData
      });

      this.edges.push({
        id: `edge_${prevId}_to_${nodeId}`,
        source: prevId,
        sourceHandle: prevHandle,
        target: nodeId,
        targetHandle: 'flow'
      });

      // Special branching layouts
      if (stmt.type === 'IfStatement') {
        const condNodeId = nodeId;
        // True branch (left)
        const trueEdge = this.nextNodeId('true_edge');
        const consequentLayout = this.layoutBlock(
          stmt.consequent.body,
          startX - 250,
          currentY + 150,
          condNodeId,
          'true'
        );

        // False branch (right)
        let alternateLayout = { endY: currentY + 150, endNodeId: condNodeId };
        if (stmt.alternate && stmt.alternate.body.length > 0) {
          alternateLayout = this.layoutBlock(
            stmt.alternate.body,
            startX + 250,
            currentY + 150,
            condNodeId,
            'false'
          );
        }

        // Merge Y coordinate
        const maxY = Math.max(consequentLayout.endY, alternateLayout.endY);
        currentY = maxY + 150;
        
        // We will set this IfStatement node as the prevId, but with its "flow" convergent handle!
        prevId = condNodeId;
        prevHandle = 'flow';
        return;
      }

      if (stmt.type === 'ForLoop' || stmt.type === 'WhileLoop') {
        const loopNodeId = nodeId;
        // Body branch (right)
        const bodyLayout = this.layoutBlock(
          stmt.body.body,
          startX + 250,
          currentY + 150,
          loopNodeId,
          'body'
        );

        // Connect last body node back to loop target
        this.edges.push({
          id: `edge_${bodyLayout.endNodeId}_back_to_${loopNodeId}`,
          source: bodyLayout.endNodeId,
          sourceHandle: 'flow',
          target: loopNodeId,
          targetHandle: 'flow'
        });

        // Set previous loop node done handle to resume main line
        currentY = Math.max(bodyLayout.endY, currentY) + 150;
        prevId = loopNodeId;
        prevHandle = 'done';
        return;
      }

      prevId = nodeId;
      prevHandle = 'flow';
      currentY += 120;
    });

    return {
      endY: currentY,
      endNodeId: prevId
    };
  }

  private exprToString(expr: any): string {
    if (!expr) return '';
    if (expr.type === 'LiteralExpression') {
      return String(expr.value);
    }
    if (expr.type === 'IdentifierExpression') {
      return expr.name;
    }
    if (expr.type === 'BinaryExpression') {
      return `${this.exprToString(expr.left)} ${expr.operator} ${this.exprToString(expr.right)}`;
    }
    if (expr.type === 'FunctionCallExpression') {
      return `${expr.callee}(${expr.arguments.map((arg: any) => this.exprToString(arg)).join(', ')})`;
    }
    return '';
  }
}
