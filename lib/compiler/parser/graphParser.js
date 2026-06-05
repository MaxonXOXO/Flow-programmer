"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphToASTCompiler = void 0;
const expressionParser_1 = require("./expressionParser");
const plugin_1 = require("../../ir/plugin");
class GraphToASTCompiler {
    constructor(flowNodes, flowEdges, subFlows = {}, functionSignatures = {}) {
        this.visited = new Set();
        this.flowNodes = [];
        this.flowEdges = [];
        this.subFlows = {};
        this.functionSignatures = {};
        this.flowNodes = flowNodes;
        this.flowEdges = flowEdges;
        this.subFlows = subFlows;
        this.functionSignatures = functionSignatures;
    }
    compile() {
        this.visited.clear();
        const body = [];
        // First, scan all subFlows to register their signatures in functionSignatures
        Object.entries(this.subFlows).forEach(([funcNodeId, subFlow]) => {
            let fnNode = this.flowNodes.find(n => n.id === funcNodeId);
            if (!fnNode) {
                for (const sf of Object.values(this.subFlows)) {
                    const found = sf.nodes.find(n => n.id === funcNodeId);
                    if (found) {
                        fnNode = found;
                        break;
                    }
                }
            }
            if (!fnNode)
                return;
            const data = fnNode.data;
            const fnName = data?.params?.name || 'myFn';
            const returnType = data?.params?.returnType || 'void';
            let parametersList = [];
            const paramsVal = data?.params?.parameters;
            if (Array.isArray(paramsVal)) {
                parametersList = paramsVal.map((p) => ({ dataType: p.type || 'int', name: p.name }));
            }
            else if (typeof paramsVal === 'string' && paramsVal.trim() !== '') {
                try {
                    const parsed = JSON.parse(paramsVal);
                    if (Array.isArray(parsed)) {
                        parametersList = parsed.map((p) => ({ dataType: p.type || 'int', name: p.name }));
                    }
                }
                catch (e) {
                    parametersList = this.parseParameterString(data?.params?.arguments || '');
                }
            }
            else {
                parametersList = this.parseParameterString(data?.params?.arguments || '');
            }
            this.functionSignatures[fnName] = { returnType, params: parametersList };
        });
        // Compile Sub-flows (Function Declarations)
        Object.entries(this.subFlows).forEach(([funcNodeId, subFlow]) => {
            let fnNode = this.flowNodes.find(n => n.id === funcNodeId);
            if (!fnNode) {
                for (const sf of Object.values(this.subFlows)) {
                    const found = sf.nodes.find(n => n.id === funcNodeId);
                    if (found) {
                        fnNode = found;
                        break;
                    }
                }
            }
            if (!fnNode)
                return;
            const data = fnNode.data;
            const fnName = data?.params?.name || 'myFn';
            const signature = this.functionSignatures[fnName] || { returnType: 'void', params: [] };
            const subCompiler = new GraphToASTCompiler(subFlow.nodes, subFlow.edges, {}, this.functionSignatures);
            const subStart = subFlow.nodes.find(n => n.data?.nodeType === 'start');
            const blockBody = subCompiler.compileBlock(subStart?.id);
            const funcDecl = {
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
        const mainStart = this.flowNodes.find(n => n.data?.nodeType === 'start');
        if (mainStart) {
            const mainStatements = this.compileBlock(mainStart.id);
            body.push(...mainStatements.body);
        }
        return {
            kind: 'Program',
            body
        };
    }
    parseParameterString(argsStr) {
        if (!argsStr)
            return [];
        return argsStr.split(',').map(part => {
            const trimmed = part.trim();
            const match = trimmed.match(/^(\w+)\s+(\w+)$/);
            if (match) {
                return { dataType: match[1], name: match[2] };
            }
            return { dataType: 'int', name: trimmed };
        }).filter(p => p.name !== '');
    }
    compileBlock(startNodeId) {
        const body = [];
        let currentId = startNodeId;
        while (currentId && !this.visited.has(currentId)) {
            const node = this.flowNodes.find(n => n.id === currentId);
            if (!node)
                break;
            const data = node.data;
            const type = data?.nodeType || 'start';
            if (type === 'end') {
                this.visited.add(currentId);
                const retValue = data?.params?.value;
                body.push({
                    kind: 'ReturnStatement',
                    nodeId: currentId,
                    value: retValue ? (0, expressionParser_1.parseExpressionString)(retValue, currentId) : undefined
                });
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
                    value: (0, expressionParser_1.parseExpressionString)(rawValue, currentId)
                });
            }
            else if (type === 'print') {
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
                            arguments: [(0, expressionParser_1.parseExpressionString)(rawMsg, currentId)]
                        }
                    });
                }
                else {
                    parts.forEach((part, idx) => {
                        const isLast = idx === parts.length - 1;
                        body.push({
                            kind: 'ExpressionStatement',
                            nodeId: currentId,
                            expression: {
                                kind: 'CallExpression',
                                nodeId: currentId,
                                callee: isLast ? 'Serial.println' : 'Serial.print',
                                arguments: [(0, expressionParser_1.parseExpressionString)(part, currentId)]
                            }
                        });
                    });
                }
            }
            else if (type === 'input') {
                const varName = data?.params?.var || 'val';
                body.push({
                    kind: 'ExpressionStatement',
                    nodeId: currentId,
                    expression: {
                        kind: 'CallExpression',
                        nodeId: currentId,
                        callee: 'Serial.print',
                        arguments: [(0, expressionParser_1.parseExpressionString)(data?.params?.prompt || '""', currentId)]
                    }
                });
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
                });
            }
            else if (type === 'delay') {
                body.push({
                    kind: 'ExpressionStatement',
                    nodeId: currentId,
                    expression: {
                        kind: 'CallExpression',
                        nodeId: currentId,
                        callee: 'delay',
                        arguments: [(0, expressionParser_1.parseExpressionString)(data?.params?.ms || '1000', currentId)]
                    }
                });
            }
            else if (type === 'gpio') {
                body.push({
                    kind: 'ExpressionStatement',
                    nodeId: currentId,
                    expression: {
                        kind: 'CallExpression',
                        nodeId: currentId,
                        callee: 'digitalWrite',
                        arguments: [
                            (0, expressionParser_1.parseExpressionString)(data?.params?.pin || '13', currentId),
                            (0, expressionParser_1.parseExpressionString)(data?.params?.value || 'HIGH', currentId)
                        ]
                    }
                });
            }
            else if (type === 'sensor') {
                const varName = data?.params?.var || 'sensorVal';
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
                        arguments: [(0, expressionParser_1.parseExpressionString)(pin, currentId)]
                    }
                });
            }
            else if (plugin_1.pluginRegistry.get(type)) {
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
                });
            }
            else if (type === 'function' || type === 'function_call') {
                const fnName = type === 'function_call' ? (data?.params?.functionName || '') : (data?.params?.name || 'myFn');
                const assignTo = data?.params?.assignTo || '';
                const signature = this.functionSignatures[fnName];
                const returnType = signature ? signature.returnType : (data?.params?.returnType || 'void');
                let argsExprs = [];
                const argsVal = type === 'function_call' ? data?.params?.arguments : data?.params?.argValues;
                if (Array.isArray(argsVal)) {
                    argsExprs = argsVal.map((arg) => {
                        const valStr = typeof arg === 'object' ? (arg.value !== undefined ? arg.value : '') : String(arg);
                        return (0, expressionParser_1.parseExpressionString)(valStr || '0', currentId);
                    });
                }
                else if (typeof argsVal === 'string' && argsVal.trim() !== '') {
                    try {
                        const parsed = JSON.parse(argsVal);
                        if (Array.isArray(parsed)) {
                            argsExprs = parsed.map((arg) => {
                                const valStr = typeof arg === 'object' ? (arg.value !== undefined ? arg.value : '') : String(arg);
                                return (0, expressionParser_1.parseExpressionString)(valStr || '0', currentId);
                            });
                        }
                        else {
                            argsExprs = argsVal.split(',').map((a) => (0, expressionParser_1.parseExpressionString)(a.trim() || '0', currentId));
                        }
                    }
                    catch (e) {
                        argsExprs = argsVal.split(',').map((a) => (0, expressionParser_1.parseExpressionString)(a.trim() || '0', currentId));
                    }
                }
                const callExpr = {
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
                    });
                }
                else {
                    body.push({
                        kind: 'ExpressionStatement',
                        nodeId: currentId,
                        expression: callExpr
                    });
                }
            }
            else if (type === 'api') {
                body.push({
                    kind: 'ExpressionStatement',
                    nodeId: currentId,
                    expression: {
                        kind: 'CallExpression',
                        nodeId: currentId,
                        callee: 'apiMock',
                        arguments: [
                            (0, expressionParser_1.parseExpressionString)(data?.params?.method || 'GET', currentId),
                            (0, expressionParser_1.parseExpressionString)(data?.params?.url || '""', currentId)
                        ]
                    }
                });
            }
            else if (type === 'condition') {
                const condExpr = (0, expressionParser_1.parseExpressionString)(data?.params?.condition || 'true', currentId);
                const trueEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'true');
                const consequentCompiler = new GraphToASTCompiler(this.flowNodes, this.flowEdges, this.subFlows);
                consequentCompiler.visited = new Set(this.visited);
                const consequent = consequentCompiler.compileBlock(trueEdge?.target);
                const falseEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'false');
                let alternate = undefined;
                if (falseEdge) {
                    const alternateCompiler = new GraphToASTCompiler(this.flowNodes, this.flowEdges, this.subFlows);
                    alternateCompiler.visited = new Set(this.visited);
                    alternate = alternateCompiler.compileBlock(falseEdge.target);
                }
                body.push({
                    kind: 'IfStatement',
                    nodeId: currentId,
                    condition: condExpr,
                    consequent,
                    alternate
                });
                const doneEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'flow');
                currentId = doneEdge?.target;
                continue;
            }
            else if (type === 'loop') {
                const loopVar = data?.params?.var || 'i';
                const from = data?.params?.from || '0';
                const to = data?.params?.to || '10';
                const step = data?.params?.step || '1';
                const init = {
                    kind: 'VariableDeclaration',
                    nodeId: currentId,
                    name: loopVar,
                    varType: 'int',
                    value: (0, expressionParser_1.parseExpressionString)(from, currentId)
                };
                const condition = {
                    kind: 'BinaryExpression',
                    nodeId: currentId,
                    operator: '<',
                    left: { kind: 'Identifier', nodeId: currentId, name: loopVar },
                    right: (0, expressionParser_1.parseExpressionString)(to, currentId)
                };
                const update = {
                    kind: 'Assignment',
                    nodeId: currentId,
                    name: loopVar,
                    value: {
                        kind: 'BinaryExpression',
                        nodeId: currentId,
                        operator: '+',
                        left: { kind: 'Identifier', nodeId: currentId, name: loopVar },
                        right: (0, expressionParser_1.parseExpressionString)(step, currentId)
                    }
                };
                const bodyEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'body');
                const bodyCompiler = new GraphToASTCompiler(this.flowNodes, this.flowEdges, this.subFlows);
                bodyCompiler.visited = new Set(this.visited);
                const loopBody = bodyCompiler.compileBlock(bodyEdge?.target);
                body.push({
                    kind: 'ForLoop',
                    nodeId: currentId,
                    init,
                    condition,
                    update,
                    body: loopBody
                });
                const doneEdge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'done');
                currentId = doneEdge?.target;
                continue;
            }
            const edge = this.flowEdges.find(e => e.source === currentId && e.sourceHandle === 'flow');
            currentId = edge?.target;
        }
        return {
            kind: 'BlockStatement',
            body
        };
    }
    parsePrintArguments(str) {
        if (!str)
            return [];
        const parts = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
                if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                }
                else if (char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                }
                current += char;
            }
            else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        if (current.trim()) {
            parts.push(current.trim());
        }
        return parts.filter(p => p !== '');
    }
}
exports.GraphToASTCompiler = GraphToASTCompiler;
