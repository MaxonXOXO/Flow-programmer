import { parseExpressionString } from '../lib/compiler/parser/expressionParser';
import { SymbolTable } from '../lib/compiler/symbols/symbolTable';
import { SemanticAnalyzer } from '../lib/compiler/semantic/semanticAnalyzer';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { SimulationEngine } from '../lib/compiler/runtime/simulationEngine';
import { ProgramNode } from '../lib/compiler/ast/ast';

function runTests() {
  console.log('--- STARTING COMPILER TESTS ---');

  // Test 1: Expression Parser
  console.log('\n[Test 1] Expression Parser...');
  const expr1 = parseExpressionString('distance > 100');
  console.log('Parsed "distance > 100":', JSON.stringify(expr1));
  if (expr1.kind !== 'BinaryExpression' || expr1.operator !== '>') {
    throw new Error('Test 1 failed: Incorrect binary operator parsed');
  }

  const expr2 = parseExpressionString('Ultraread()');
  console.log('Parsed "Ultraread()":', JSON.stringify(expr2));
  if (expr2.kind !== 'CallExpression' || expr2.callee !== 'Ultraread') {
    throw new Error('Test 1 failed: Incorrect function call parsed');
  }

  // Test 2: Symbol Table Scoping
  console.log('\n[Test 2] Symbol Table Scoping...');
  const globalScope = new SymbolTable(null, 'global');
  globalScope.define({ kind: 'variable', name: 'g_var', type: 'int', scope: 'global' });

  const funcScope = new SymbolTable(globalScope, 'function');
  funcScope.define({ kind: 'variable', name: 'l_var', type: 'float', scope: 'function' });

  if (!funcScope.lookup('g_var')) throw new Error('Failed to lookup global variable in nested scope');
  if (!funcScope.lookup('l_var')) throw new Error('Failed to lookup local variable in nested scope');
  if (globalScope.lookup('l_var')) throw new Error('Lookup leaked local scope variable into global scope');

  // Test 3: Semantic Analyzer Validation Passes
  console.log('\n[Test 3] Semantic Analyzer...');
  const analyzer = new SemanticAnalyzer();
  
  const semScope = new SymbolTable(null, 'global');
  semScope.define({
    kind: 'function',
    name: 'myVoidFn',
    returnType: 'void',
    parameters: []
  });

  const testProgram: ProgramNode = {
    kind: 'Program',
    body: [
      {
        kind: 'VariableDeclaration',
        name: 'distance',
        varType: 'int',
        value: parseExpressionString('100')
      },
      {
        kind: 'ExpressionStatement',
        expression: parseExpressionString('undefined_var > 50')
      },
      {
        kind: 'VariableDeclaration',
        name: 'badAssign',
        varType: 'int',
        value: parseExpressionString('myVoidFn()')
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
  const genProgram: ProgramNode = {
    kind: 'Program',
    body: [
      {
        kind: 'VariableDeclaration',
        name: 'dist',
        varType: 'int',
        value: parseExpressionString('50')
      },
      {
        kind: 'IfStatement',
        condition: parseExpressionString('dist > 30'),
        consequent: {
          kind: 'BlockStatement',
          body: [
            {
              kind: 'ExpressionStatement',
              expression: {
                kind: 'CallExpression',
                callee: 'Serial.println',
                arguments: [parseExpressionString('"Alert!"')]
              }
            }
          ]
        }
      }
    ]
  };

  const generator = new ArduinoUnoGenerator();
  const result = generator.generate(genProgram, [], []);
  console.log('Generated Arduino Code:\n', result.main);
  if (!result.main.includes('if ((dist > 30))') || !result.main.includes('Serial.println("Alert!")')) {
    throw new Error('Test 4 failed: Generated code is missing loop structure or statements');
  }

  console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');
}

runTests();
