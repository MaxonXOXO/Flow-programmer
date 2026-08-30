import { Node, Edge } from '@xyflow/react';
import {
  ProgramNode,
  StatementNode,
  BlockStatementNode,
  ExpressionNode,
  FunctionDeclarationNode,
  VariableDeclarationNode,
  AssignmentNode,
  IfStatementNode,
  ForLoopNode,
  ReturnStatementNode,
  ExpressionStatementNode,
  Parameter,
  ProgramStatementNode,
  BinaryExpressionNode
} from '../ast/ast';
import { parseExpressionString } from './expressionParser';
import { pluginRegistry } from '../../ir/plugin';
import { expandComponentGraphs, cloneNode, cloneEdge, ComponentCompilationContext } from '../packages/componentExpander';

export class GraphToASTCompiler {
  private visited: Set<string> = new Set();
  private flowNodes: readonly Node[] = [];
  private flowEdges: readonly Edge[] = [];
  private subFlows: Record<string, { nodes: Node[]; edges: Edge[] }> = {};
  private functionSignatures: Record<string, { returnType: string; params: Parameter[] }> = {};
  private schemaNodes: readonly Node[] = [];
  private schemaEdges: readonly Edge[] = [];
  private compilationContext?: ComponentCompilationContext;

  constructor(
    flowNodes: Node[],
    flowEdges: Edge[],
    subFlows: Record<string, { nodes: Node[]; edges: Edge[] }> = {},
    functionSignatures: Record<string, { returnType: string; params: Parameter[] }> = {},
    schemaNodes: Node[] = [],
    schemaEdges: Edge[] = [],
    context?: ComponentCompilationContext
  ) {
    this.flowNodes = flowNodes;
    this.flowEdges = flowEdges;
    this.subFlows = subFlows;
    this.functionSignatures = functionSignatures;
    this.schemaNodes = schemaNodes;
    this.schemaEdges = schemaEdges;
    this.compilationContext = context;
  }

  public compile(): ProgramNode {
    // 0. Clone input nodes & edges to ensure compilation operates on working data without mutating input state
    const inputNodes = this.flowNodes.map(cloneNode);
    const inputEdges = this.flowEdges.map(cloneEdge);

    // Expand component nodes passing schema graph and compilation context
    const expanded = expandComponentGraphs(
      inputNodes,
      inputEdges,
      [...this.schemaNodes],
      [...this.schemaEdges],
      this.compilationContext
    );

    const workingNodes = expanded.nodes;
    const workingEdges = expanded.edges;

    this.visited.clear();
    const body: ProgramStatementNode[] = [];

    // First, scan all subFlows to register their signatures in functionSignatures
    Object.entries(this.subFlows).forEach(([funcNodeId, subFlow]) => {
      let fnNode = workingNodes.find(n => n.id === funcNodeId);
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
      
      let parametersList: Parameter[] = [];
      const inputsVal = data?.params?.inputs || data?.params?.parameters;
      if (Array.isArray(inputsVal)) {
        parametersList = inputsVal.map((p: any) => ({ dataType: p.type || 'int', name: p.name }));
      } else if (typeof inputsVal === 'string' && inputsVal.trim() !== '') {
        try {
          const parsed = JSON.parse(inputsVal);
          if (Array.isArray(parsed)) {
            parametersList = parsed.map((p: any) => ({ dataType: p.type || 'int', name: p.name }));
          }
        } catch (e) {
          parametersList = this.parseParameterString(data?.params?.arguments || '');
        }
      } else {
        parametersList = this.parseParameterString(data?.params?.arguments || '');
      }

      this.functionSignatures[fnName] = { returnType, params: parametersList };
    });

    // Compile Sub-flows (Function Declarations)
    Object.entries(this.subFlows).forEach(([funcNodeId, subFlow]) => {
      let fnNode = workingNodes.find(n => n.id === funcNodeId);
      if (!fnNode) {
        for (const sf of Object.values(this.subFlows)) {
          const found = sf.nodes.find(n => n.id === funcNodeId);
          if (found) { fnNode = found; break; }
        }
      }
      if (!fnNode) return;

      const data = fnNode.data as any;
      const fnName = data?.params?.name || 'myFn';
      const signature = this.functionSignatures[fnName] || { returnType: 'void', params: [] };

      const subCompiler = new GraphToASTCompiler(
        subFlow.nodes,
        subFlow.edges,
        {},
        this.functionSignatures,
        [...this.schemaNodes],
        [...this.schemaEdges]
      );
      const subStart = subFlow.nodes.find(n => n.data?.nodeType === 'start');
      const blockBody = subCompiler.compileBlock(subStart?.id, subFlow.nodes, subFlow.edges);

      const funcDecl: FunctionDeclarationNode = {
        kind: 'FunctionDeclaration',
        nodeId: funcNodeId,
        name: fnName,
        returnType: signature.returnType,
        params: signature.params,
        body: blockBody
      };

      body.push(funcDecl);
    });

    // Compile main flow
    const mainStart = workingNodes.find(n => n.data?.nodeType === 'start');
    if (mainStart) {
      const mainStatements = this.compileBlock(mainStart.id, workingNodes, workingEdges);
      body.push(...mainStatements.body);
    }

    return {
      kind: 'Program',
      body
    };
  }

  private parseParameterString(argsStr: string): Parameter[] {
    if (!argsStr) return [];
    return argsStr.split(',').map(part => {
      const trimmed = part.trim();
      const match = trimmed.match(/^(\w+)\s+(\w+)$/);
      if (match) {
        return { dataType: match[1], name: match[2] };
      }
      return { dataType: 'int', name: trimmed };
    }).filter(p => p.name !== '');
  }

  public compileBlock(
    startNodeId: string | undefined,
    nodes: Node[] = [...this.flowNodes],
    edges: Edge[] = [...this.flowEdges]
  ): BlockStatementNode {
    const body: StatementNode[] = [];
    let currentId = startNodeId;

    while (currentId && !this.visited.has(currentId)) {
      const node = nodes.find(n => n.id === currentId);
      if (!node) break;

      const data = node.data as any;
      const type = data?.nodeType || 'start';

      if (type === 'end') {
        this.visited.add(currentId);
        break;
      }

      if (type === 'return') {
        this.visited.add(currentId);
        const retValue = data?.params?.value;
        body.push({
          kind: 'ReturnStatement',
          nodeId: currentId,
          value: retValue ? parseExpressionString(retValue, currentId) : undefined
        } as ReturnStatementNode);
        break;
      }

      this.visited.add(currentId);

      if (type === 'variable') {
        const varName = data?.params?.name || 'x';
        const rawValue = data?.params?.value || '0';
        body.push({
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: varName,
          varType: rawValue.includes('.') ? 'float' : 'int',
          value: parseExpressionString(rawValue, currentId)
        } as VariableDeclarationNode);
      } else if (type === 'assignment') {
        const target = data?.params?.target || 'x';
        const expression = data?.params?.expression || '0';
        body.push({
          kind: 'Assignment',
          nodeId: currentId,
          name: target,
          value: parseExpressionString(expression, currentId)
        } as AssignmentNode);
      } else if (type === 'print') {
        const rawMsg = data?.params?.message || '""';
        const parts = this.parsePrintArguments(rawMsg);
        if (parts.length <= 1) {
          body.push({
            kind: 'ExpressionStatement',
            nodeId: currentId,
            expression: {
              kind: 'CallExpression',
              nodeId: currentId,
              callee: 'Serial.println',
              arguments: [parseExpressionString(rawMsg, currentId)]
            }
          } as ExpressionStatementNode);
        } else {
          parts.forEach((part, idx) => {
            const isLast = idx === parts.length - 1;
            body.push({
              kind: 'ExpressionStatement',
              nodeId: currentId,
              expression: {
                kind: 'CallExpression',
                nodeId: currentId,
                callee: isLast ? 'Serial.println' : 'Serial.print',
                arguments: [parseExpressionString(part, currentId)]
              }
            } as ExpressionStatementNode);
          });
        }
      } else if (type === 'input') {
        const varName = data?.params?.var || 'val';
        body.push({
          kind: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'Serial.print',
            arguments: [parseExpressionString(data?.params?.prompt || '""', currentId)]
          }
        } as ExpressionStatementNode);
        body.push({
          kind: 'Assignment',
          nodeId: currentId,
          name: varName,
          value: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'Serial.parseInt',
            arguments: []
          }
        } as AssignmentNode);
      } else if (type === 'delay') {
        const duration = data?.params?.duration || data?.params?.ms || '1000';
        const unit = data?.params?.unit || 'ms';
        const callee = unit === 'us' ? 'delayMicroseconds' : 'delay';
        body.push({
          kind: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: callee,
            arguments: [parseExpressionString(duration, currentId)]
          }
        } as ExpressionStatementNode);
      } else if (type === 'gpio') {
        body.push({
          kind: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'digitalWrite',
            arguments: [
              parseExpressionString(data?.params?.pin || '13', currentId),
              parseExpressionString(data?.params?.value || 'HIGH', currentId)
            ]
          }
        } as ExpressionStatementNode);
      } else if (type === 'pulse_in') {
        const varName = data?.params?.var || 'duration';
        const pin = data?.params?.pin || '10';
        const pulseVal = data?.params?.value || 'HIGH';
        body.push({
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: varName,
          varType: 'unsigned long',
          value: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'pulseIn',
            arguments: [
              parseExpressionString(pin, currentId),
              parseExpressionString(pulseVal, currentId)
            ]
          }
        } as VariableDeclarationNode);
      } else if (type === 'sensor' || type === 'analog_read' || type === 'analogRead') {
        const varName = data?.params?.target || data?.params?.var || 'sensorVal';
        const pin = data?.params?.pin || 'A0';
        body.push({
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: varName,
          varType: 'int',
          value: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'analogRead',
            arguments: [parseExpressionString(pin, currentId)]
          }
        } as VariableDeclarationNode);
      } else if (pluginRegistry.get(type)) {
        body.push({
          kind: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: `${type}.custom`,
            arguments: [
              {
                kind: 'Literal',
                nodeId: currentId,
                value: JSON.stringify(data?.params || {}),
                valueType: 'string'
              }
            ]
          }
        } as ExpressionStatementNode);
      } else if (type === 'function' || type === 'function_call') {
        const fnName = type === 'function_call' ? (data?.params?.functionName || '') : (data?.params?.name || 'myFn');
        const assignTo = data?.params?.assignTo || '';
        
        const signature = this.functionSignatures[fnName];
        const returnType = signature ? signature.returnType : (data?.params?.returnType || 'void');

        let argsExprs: ExpressionNode[] = [];

        // Inspect signature parameters and connected input handle edges
        const fnParams = signature?.params || [];
        if (fnParams.length > 0) {
          argsExprs = fnParams.map((p, idx) => {
            // Check if there is an edge connecting to input_${p.name} or input_${idx}
            const edge = edges.find(e => 
              e.target === currentId && 
              (e.targetHandle === `input_${p.name}` || e.targetHandle === `input_${idx}`)
            );
            if (edge) {
              const srcNode = nodes.find(n => n.id === edge.source);
              if (srcNode) {
                const srcData = srcNode.data as any;
                const srcVar = srcData?.params?.var || srcData?.params?.assignTo || srcData?.label || 'val';
                return parseExpressionString(srcVar, currentId);
              }
            }

            // Fallback to explicit argument values or defaults
            const argsVal = type === 'function_call' ? data?.params?.arguments : data?.params?.argValues;
            if (Array.isArray(argsVal) && argsVal[idx] !== undefined) {
              const valStr = typeof argsVal[idx] === 'object' ? (argsVal[idx].value !== undefined ? argsVal[idx].value : '') : String(argsVal[idx]);
              return parseExpressionString(valStr || '0', currentId);
            }
            return parseExpressionString('0', currentId);
          });
        } else {
          const argsVal = type === 'function_call' ? data?.params?.arguments : data?.params?.argValues;
          if (Array.isArray(argsVal)) {
            argsExprs = argsVal.map((arg: any) => {
              const valStr = typeof arg === 'object' ? (arg.value !== undefined ? arg.value : '') : String(arg);
              return parseExpressionString(valStr || '0', currentId);
            });
          }
        }

        const callExpr: ExpressionNode = {
          kind: 'CallExpression',
          nodeId: currentId,
          callee: fnName,
          arguments: argsExprs
        };

        if (returnType !== 'void' && assignTo) {
          body.push({
            kind: 'Assignment',
            nodeId: currentId,
            name: assignTo,
            value: callExpr
          } as AssignmentNode);
        } else {
          body.push({
            kind: 'ExpressionStatement',
            nodeId: currentId,
            expression: callExpr
          } as ExpressionStatementNode);
        }
      } else if (type === 'api') {
        body.push({
          kind: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'apiMock',
            arguments: [
              parseExpressionString(data?.params?.method || 'GET', currentId),
              parseExpressionString(data?.params?.url || '""', currentId)
            ]
          }
        } as ExpressionStatementNode);
      } else if (type === 'condition') {
        const condExpr = parseExpressionString(data?.params?.condition || 'true', currentId);
        
        const trueEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'true');
        const consequentCompiler = new GraphToASTCompiler(
          nodes, 
          edges, 
          this.subFlows, 
          this.functionSignatures, 
          [...this.schemaNodes], 
          [...this.schemaEdges]
        );
        consequentCompiler.visited = new Set(this.visited);
        const consequent = consequentCompiler.compileBlock(trueEdge?.target, nodes, edges);

        const falseEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'false');
        let alternate: BlockStatementNode | undefined = undefined;
        if (falseEdge) {
          const alternateCompiler = new GraphToASTCompiler(
            nodes, 
            edges, 
            this.subFlows, 
            this.functionSignatures, 
            [...this.schemaNodes], 
            [...this.schemaEdges]
          );
          alternateCompiler.visited = new Set(this.visited);
          alternate = alternateCompiler.compileBlock(falseEdge.target, nodes, edges);
        }

        body.push({
          kind: 'IfStatement',
          nodeId: currentId,
          condition: condExpr,
          consequent,
          alternate
        } as IfStatementNode);

        const doneEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'flow');
        currentId = doneEdge?.target;
        continue;
      } else if (type === 'loop') {
        const loopVar = data?.params?.var || 'i';
        const from = data?.params?.from || '0';
        const to = data?.params?.to || '10';
        const step = data?.params?.step || '1';

        const init: VariableDeclarationNode = {
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: loopVar,
          varType: 'int',
          value: parseExpressionString(from, currentId)
        };

        const condition: BinaryExpressionNode = {
          kind: 'BinaryExpression',
          nodeId: currentId,
          operator: '<',
          left: { kind: 'Identifier', nodeId: currentId, name: loopVar },
          right: parseExpressionString(to, currentId)
        };

        const update: AssignmentNode = {
          kind: 'Assignment',
          nodeId: currentId,
          name: loopVar,
          value: {
            kind: 'BinaryExpression',
            nodeId: currentId,
            operator: '+',
            left: { kind: 'Identifier', nodeId: currentId, name: loopVar },
            right: parseExpressionString(step, currentId)
          }
        };

        const bodyEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'body');
        const bodyCompiler = new GraphToASTCompiler(
          nodes, 
          edges, 
          this.subFlows, 
          this.functionSignatures, 
          [...this.schemaNodes], 
          [...this.schemaEdges]
        );
        bodyCompiler.visited = new Set(this.visited);
        const loopBody = bodyCompiler.compileBlock(bodyEdge?.target, nodes, edges);

        body.push({
          kind: 'ForLoop',
          nodeId: currentId,
          init,
          condition,
          update,
          body: loopBody
        } as ForLoopNode);

        const doneEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'done');
        currentId = doneEdge?.target;
        continue;
      }

      const edge = edges.find(e => e.source === currentId && e.sourceHandle === 'flow');
      currentId = edge?.target;
    }

    return {
      kind: 'BlockStatement',
      body
    };
  }

  private parsePrintArguments(str: string): string[] {
    if (!str) return [];
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if ((char === '"' || char === "'") && (i === 0 || str[i-1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        current += char;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    return parts.filter(p => p !== '');
  }
}
