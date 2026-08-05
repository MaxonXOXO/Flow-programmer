import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { SymbolTable } from '../lib/compiler/symbols/symbolTable';
import { SemanticAnalyzer } from '../lib/compiler/semantic/semanticAnalyzer';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { Node, Edge } from '@xyflow/react';

function runTypedFunctionPortTests() {
  console.log('--- STARTING TYPED FUNCTION DEFINITION & PORT TESTS ---');

  // Define Function Definition Node (getDistance) with typed inputs & output return
  const funcNodeId = 'func_getDistance';
  const mainFlowNodes: Node[] = [
    {
      id: 'start_main',
      type: 'baseNode',
      data: { nodeType: 'start', label: 'Start' },
      position: { x: 0, y: 0 }
    },
    {
      id: funcNodeId,
      type: 'baseNode',
      data: {
        nodeType: 'function',
        label: 'getDistance()',
        params: {
          name: 'getDistance',
          returnType: 'int',
          inputs: [
            { name: 'triggerPin', type: 'int' },
            { name: 'echoPin', type: 'int' }
          ],
          outputs: [
            { name: 'return', type: 'int' }
          ]
        }
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'call_getDist',
      type: 'baseNode',
      data: {
        nodeType: 'function_call',
        label: 'Call: getDistance()',
        params: {
          functionName: 'getDistance',
          assignTo: 'distance'
        }
      },
      position: { x: 200, y: 0 }
    },
    {
      id: 'print_res',
      type: 'baseNode',
      data: {
        nodeType: 'print',
        params: { message: 'distance' }
      },
      position: { x: 400, y: 0 }
    }
  ];

  const mainFlowEdges: Edge[] = [
    { id: 'e1', source: 'start_main', target: 'call_getDist', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'call_getDist', target: 'print_res', sourceHandle: 'flow', targetHandle: 'flow' }
  ];

  // Internal graph of getDistance subflow
  const subFlows = {
    [funcNodeId]: {
      nodes: [
        {
          id: `${funcNodeId}-start`,
          type: 'baseNode',
          data: { nodeType: 'start', label: 'getDistance() Start' },
          position: { x: 0, y: 0 }
        },
        {
          id: `${funcNodeId}-ret`,
          type: 'baseNode',
          data: {
            nodeType: 'return',
            params: { value: '42' }
          },
          position: { x: 200, y: 0 }
        }
      ],
      edges: [
        { id: 'se1', source: `${funcNodeId}-start`, target: `${funcNodeId}-ret`, sourceHandle: 'flow', targetHandle: 'flow' }
      ]
    }
  };

  console.log('[Test 1] Compiling Function Definition & Typed Inputs to AST...');
  const compiler = new GraphToASTCompiler(mainFlowNodes, mainFlowEdges, subFlows);
  const ast = compiler.compile();

  console.log('[Test 2] Validating AST Statements...');
  console.log('AST Body Statements Count:', ast.body.length);

  const fnDecl = ast.body.find((stmt: any) => stmt.kind === 'FunctionDeclaration') as any;
  console.log('Function Name:', fnDecl?.name);
  console.log('Return Type:', fnDecl?.returnType);
  console.log('Function Parameters:', fnDecl?.params);

  if (fnDecl?.name !== 'getDistance' || fnDecl?.returnType !== 'int' || fnDecl?.params?.length !== 2) {
    throw new Error('Typed function definition AST mismatch!');
  }

  console.log('[Test 3] Running Symbol Table & Semantic Analysis...');
  const symbolTable = new SymbolTable(null, 'global');
  const analyzer = new SemanticAnalyzer();
  const errors = analyzer.analyze(ast, symbolTable);
  console.log('Semantic Validation Errors Count:', errors.length);

  console.log('[Test 4] Generating C++ Code from Typed Function Definition AST...');
  const generator = new ArduinoUnoGenerator();
  const codeResult = generator.generate(ast, [], []);
  const cppCode = codeResult.main;
  console.log('\nGenerated C++ Code:\n');
  console.log(cppCode);

  if (!cppCode.includes('int getDistance(int triggerPin, int echoPin)')) {
    throw new Error('Generated C++ code missing signature: int getDistance(int triggerPin, int echoPin)');
  }

  console.log('--- ALL TYPED FUNCTION DEFINITION & PORT TESTS PASSED SUCCESSFULLY ---');
}

runTypedFunctionPortTests();
