"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const expressionParser_1 = require("../lib/compiler/parser/expressionParser");
const symbolTable_1 = require("../lib/compiler/symbols/symbolTable");
const semanticAnalyzer_1 = require("../lib/compiler/semantic/semanticAnalyzer");
const arduinoGenerator_1 = require("../lib/compiler/generator/arduinoGenerator");
function runTests() {
    console.log('--- STARTING COMPILER TESTS ---');
    // Test 1: Expression Parser
    console.log('\n[Test 1] Expression Parser...');
    const expr1 = (0, expressionParser_1.parseExpressionString)('distance > 100');
    console.log('Parsed "distance > 100":', JSON.stringify(expr1));
    if (expr1.kind !== 'BinaryExpression' || expr1.operator !== '>') {
        throw new Error('Test 1 failed: Incorrect binary operator parsed');
    }
    const expr2 = (0, expressionParser_1.parseExpressionString)('Ultraread()');
    console.log('Parsed "Ultraread()":', JSON.stringify(expr2));
    if (expr2.kind !== 'CallExpression' || expr2.callee !== 'Ultraread') {
        throw new Error('Test 1 failed: Incorrect function call parsed');
    }
    // Test 2: Symbol Table Scoping
    console.log('\n[Test 2] Symbol Table Scoping...');
    const globalScope = new symbolTable_1.SymbolTable(null, 'global');
    globalScope.define({ kind: 'variable', name: 'g_var', type: 'int', scope: 'global' });
    const funcScope = new symbolTable_1.SymbolTable(globalScope, 'function');
    funcScope.define({ kind: 'variable', name: 'l_var', type: 'float', scope: 'function' });
    if (!funcScope.lookup('g_var'))
        throw new Error('Failed to lookup global variable in nested scope');
    if (!funcScope.lookup('l_var'))
        throw new Error('Failed to lookup local variable in nested scope');
    if (globalScope.lookup('l_var'))
        throw new Error('Lookup leaked local scope variable into global scope');
    // Test 3: Semantic Analyzer Validation Passes
    console.log('\n[Test 3] Semantic Analyzer...');
    const analyzer = new semanticAnalyzer_1.SemanticAnalyzer();
    const semScope = new symbolTable_1.SymbolTable(null, 'global');
    semScope.define({
        kind: 'function',
        name: 'myVoidFn',
        returnType: 'void',
        parameters: []
    });
    const testProgram = {
        kind: 'Program',
        body: [
            {
                kind: 'VariableDeclaration',
                name: 'distance',
                varType: 'int',
                value: (0, expressionParser_1.parseExpressionString)('100')
            },
            {
                kind: 'ExpressionStatement',
                expression: (0, expressionParser_1.parseExpressionString)('undefined_var > 50')
            },
            {
                kind: 'VariableDeclaration',
                name: 'badAssign',
                varType: 'int',
                value: (0, expressionParser_1.parseExpressionString)('myVoidFn()')
            }
        ]
    };
    const errors = analyzer.analyze(testProgram, semScope);
    console.log('Validation Errors:', errors);
    const hasUndefinedErr = errors.some(e => e.message.includes('Undefined variable: undefined_var'));
    const hasVoidAssignErr = errors.some(e => e.message.includes('Cannot assign void function result'));
    if (!hasUndefinedErr || !hasVoidAssignErr) {
        throw new Error('Test 3 failed: Expected validation errors (undefined var or void function assignment) were not detected');
    }
    // Test 4: Generator Output verification
    console.log('\n[Test 4] Code Generator...');
    const genProgram = {
        kind: 'Program',
        body: [
            {
                kind: 'VariableDeclaration',
                name: 'dist',
                varType: 'int',
                value: (0, expressionParser_1.parseExpressionString)('50')
            },
            {
                kind: 'IfStatement',
                condition: (0, expressionParser_1.parseExpressionString)('dist > 30'),
                consequent: {
                    kind: 'BlockStatement',
                    body: [
                        {
                            kind: 'ExpressionStatement',
                            expression: {
                                kind: 'CallExpression',
                                callee: 'Serial.println',
                                arguments: [(0, expressionParser_1.parseExpressionString)('"Alert!"')]
                            }
                        }
                    ]
                }
            }
        ]
    };
    const generator = new arduinoGenerator_1.ArduinoUnoGenerator();
    const result = generator.generate(genProgram, [], []);
    console.log('Generated Arduino Code:\n', result.main);
    if (!result.main.includes('if ((dist > 30))') || !result.main.includes('Serial.println("Alert!")')) {
        throw new Error('Test 4 failed: Generated code is missing loop structure or statements');
    }
    console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');
}
runTests();
