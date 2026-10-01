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
import { normalizeFlowGraph, normalizeFlowGraphNode } from './nodeNormalizer';
import { expandComponentGraphs, cloneNode, cloneEdge, ComponentCompilationContext } from '../packages/componentExpander';
import {
  validateFlowControl,
  FlowControlError,
  findCommonConvergeNode,
  findCommonConvergeNodeForTargets,
  FlowControlDiagnostic,
} from '../flow/flowControl';

export { FlowControlError, validateFlowControl };
export type { FlowControlDiagnostic };

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
    // 0. Boundary normalization: map legacy node aliases (gpio, sensor, delay ms, var<Sensor>) to canonical primitives/components
    const normalized = normalizeFlowGraph(this.flowNodes as Node[], this.flowEdges as Edge[]);
    const inputNodes = normalized.nodes.map(cloneNode);
    const inputEdges = normalized.edges.map(cloneEdge);

    const normalizedSubFlows: Record<string, { nodes: Node[]; edges: Edge[] }> = {};
    Object.entries(this.subFlows).forEach(([sfId, sf]) => {
      normalizedSubFlows[sfId] = normalizeFlowGraph(sf.nodes, sf.edges);
    });

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

    // Validate control-flow primitives: enforce explicit flow_split / flow_converge and reject implicit fan-out/fan-in
    const flowDiagnostics = validateFlowControl(workingNodes, workingEdges);
    const flowErrors = flowDiagnostics.filter(d => d.severity === 'error');
    if (flowErrors.length > 0) {
      const firstErr = flowErrors[0];
      throw new FlowControlError(firstErr.code, firstErr.message, {
        nodeId: firstErr.nodeId,
        diagnostics: flowDiagnostics,
      });
    }

    Object.entries(normalizedSubFlows).forEach(([, sf]) => {
      const sfDiagnostics = validateFlowControl(sf.nodes, sf.edges);
      const sfErrors = sfDiagnostics.filter(d => d.severity === 'error');
      if (sfErrors.length > 0) {
        const firstErr = sfErrors[0];
        throw new FlowControlError(firstErr.code, firstErr.message, {
          nodeId: firstErr.nodeId,
          diagnostics: sfDiagnostics,
        });
      }
    });

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
    edges: Edge[] = [...this.flowEdges],
    options?: { stopAtNodeId?: string }
  ): BlockStatementNode {
    const body: StatementNode[] = [];
    let currentId = startNodeId;

    while (currentId && !this.visited.has(currentId)) {
      if (options?.stopAtNodeId && currentId === options.stopAtNodeId) {
        break;
      }

      const rawNode = nodes.find(n => n.id === currentId);
      if (!rawNode) break;

      const node = normalizeFlowGraphNode(rawNode);
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
        const duration = data?.params?.duration || '1000';
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
      } else if (type === 'digital_write') {
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
      } else if (type === 'digital_read') {
        const targetVar = data?.params?.target || 'digitalVal';
        const pin = data?.params?.pin || '2';
        body.push({
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: targetVar,
          varType: 'int',
          value: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'digitalRead',
            arguments: [parseExpressionString(pin, currentId)]
          }
        } as VariableDeclarationNode);
      } else if (type === 'pwm_write') {
        body.push({
          kind: 'ExpressionStatement',
          nodeId: currentId,
          expression: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'analogWrite',
            arguments: [
              parseExpressionString(data?.params?.pin || '9', currentId),
              parseExpressionString(data?.params?.value || '255', currentId)
            ]
          }
        } as ExpressionStatementNode);
      } else if (type === 'pulse_in') {
        const targetVar = data?.params?.target || 'duration';
        const pin = data?.params?.pin || '10';
        const pulseVal = data?.params?.value || 'HIGH';
        body.push({
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: targetVar,
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
      } else if (type === 'analog_read') {
        const targetVar = data?.params?.target || 'sensorVal';
        const pin = data?.params?.pin || 'A0';
        body.push({
          kind: 'VariableDeclaration',
          nodeId: currentId,
          name: targetVar,
          varType: 'int',
          value: {
            kind: 'CallExpression',
            nodeId: currentId,
            callee: 'analogRead',
            arguments: [parseExpressionString(pin, currentId)]
          }
        } as VariableDeclarationNode);
      } else if (type === 'component') {
        throw new Error(
          `Unexpanded component node encountered during AST compilation: "${currentId}" (${data?.label || 'Component'}, package: "${data?.params?.packageId || data?.packageId || 'unknown'}"). Components must be expanded into canonical primitives before code generation.`
        );
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
        const falseEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'false');

        // Check if both branches converge at a downstream flow_converge node
        const branchTargets = [trueEdge?.target, falseEdge?.target].filter(Boolean) as string[];
        const convergeNodeId =
          branchTargets.length > 0 ? findCommonConvergeNodeForTargets(branchTargets, nodes, edges) : undefined;

        const consequentCompiler = new GraphToASTCompiler(
          nodes, 
          edges, 
          this.subFlows, 
          this.functionSignatures, 
          [...this.schemaNodes], 
          [...this.schemaEdges],
          this.compilationContext
        );
        consequentCompiler.visited = new Set(this.visited);
        const consequent = consequentCompiler.compileBlock(trueEdge?.target, nodes, edges, {
          stopAtNodeId: convergeNodeId,
        });

        let alternate: BlockStatementNode | undefined = undefined;
        if (falseEdge) {
          const alternateCompiler = new GraphToASTCompiler(
            nodes, 
            edges, 
            this.subFlows, 
            this.functionSignatures, 
            [...this.schemaNodes], 
            [...this.schemaEdges],
            this.compilationContext
          );
          alternateCompiler.visited = new Set(this.visited);
          alternate = alternateCompiler.compileBlock(falseEdge.target, nodes, edges, {
            stopAtNodeId: convergeNodeId,
          });
        }

        body.push({
          kind: 'IfStatement',
          nodeId: currentId,
          condition: condExpr,
          consequent,
          alternate
        } as IfStatementNode);

        consequentCompiler.visited.forEach(v => {
          if (v !== convergeNodeId) this.visited.add(v);
        });

        if (convergeNodeId) {
          currentId = convergeNodeId;
        } else {
          const doneEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'flow');
          currentId = doneEdge?.target;
        }
        continue;
      } else if (type === 'flow_split') {
        const rawCount = data?.params?.branchCount;
        const parsed = Number(rawCount);
        const branchCount = Number.isInteger(parsed) && parsed >= 1 ? parsed : 0;
        const convergeNodeId = findCommonConvergeNode(currentId, nodes, edges);

        for (let i = 0; i < branchCount; i++) {
          const branchEdge = edges.find(
            e =>
              e.source === currentId &&
              (e.sourceHandle === `branch_${i}` ||
                e.sourceHandle === `branch${i}` ||
                (i === 0 && (e.sourceHandle === 'flow' || !e.sourceHandle)))
          );

          if (branchEdge?.target) {
            const branchCompiler = new GraphToASTCompiler(
              nodes,
              edges,
              this.subFlows,
              this.functionSignatures,
              [...this.schemaNodes],
              [...this.schemaEdges],
              this.compilationContext
            );
            branchCompiler.visited = new Set(this.visited);
            const branchBlock = branchCompiler.compileBlock(branchEdge.target, nodes, edges, {
              stopAtNodeId: convergeNodeId,
            });
            body.push(...branchBlock.body);

            branchCompiler.visited.forEach(v => {
              if (v !== convergeNodeId) {
                this.visited.add(v);
              }
            });
          }
        }

        if (convergeNodeId) {
          currentId = convergeNodeId;
        } else {
          currentId = undefined;
        }
        continue;
      } else if (type === 'flow_converge') {
        const outEdge = edges.find(e => e.source === currentId && (e.sourceHandle === 'flow' || !e.sourceHandle));
        currentId = outEdge?.target;
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
          [...this.schemaEdges],
          this.compilationContext
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
      } else if (type !== 'start') {
        throw new Error(
          `Unsupported or unexpanded node type encountered during AST compilation: "${type}" (nodeId: "${currentId}", label: "${data?.label || type}"). All components must expand to canonical primitives.`
        );
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
