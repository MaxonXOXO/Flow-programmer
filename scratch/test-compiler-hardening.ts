import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { getComponentPackage } from '../lib/registry/components';
import { Node, Edge } from '@xyflow/react';

function runHardeningTests() {
  console.log('--- STARTING COMPILER HARDENING TESTS (TASK 1 & TASK 2) ---');

  // Setup standard test flow graph with HC-SR04 component
  const flowNodes: Node[] = [
    {
      id: 'start_node',
      type: 'baseNode',
      data: { nodeType: 'start', label: 'Start' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'hcsr04_inst1',
      type: 'componentNode',
      data: {
        label: 'Ultrasonic HC-SR04',
        nodeType: 'ultrasonic',
        params: {
          packageId: 'ultrasonic_hcsr04',
          varDist: 'measured_distance'
        }
      },
      position: { x: 200, y: 0 }
    },
    {
      id: 'print_node',
      type: 'baseNode',
      data: {
        nodeType: 'print',
        params: { message: 'measured_distance' }
      },
      position: { x: 400, y: 0 }
    }
  ];

  const flowEdges: Edge[] = [
    {
      id: 'e1',
      source: 'start_node',
      target: 'hcsr04_inst1',
      sourceHandle: 'flow',
      targetHandle: 'flow'
    },
    {
      id: 'e2',
      source: 'hcsr04_inst1',
      target: 'print_node',
      sourceHandle: 'flow',
      targetHandle: 'flow'
    }
  ];

  const schemaNodes: Node[] = [
    {
      id: 'arduino-uno',
      type: 'boardNode',
      data: { label: 'Arduino Uno' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'hcsr04_inst1',
      type: 'componentNode',
      data: { label: 'Ultrasonic HC-SR04' },
      position: { x: 100, y: 0 }
    }
  ];

  const schemaEdges: Edge[] = [
    {
      id: 'se1',
      source: 'hcsr04_inst1',
      target: 'arduino-uno',
      sourceHandle: 'trig',
      targetHandle: 'd7'
    },
    {
      id: 'se2',
      source: 'hcsr04_inst1',
      target: 'arduino-uno',
      sourceHandle: 'echo',
      targetHandle: 'd8'
    }
  ];

  // ==================================================
  // TEST A — schema pin binding through GraphToASTCompiler
  // ==================================================
  console.log('\n[TEST A] Schema pin binding through GraphToASTCompiler...');
  const compilerA = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges);
  const astA = compilerA.compile();
  const generatorA = new ArduinoUnoGenerator();
  const codeA = generatorA.generate(astA, schemaNodes, schemaEdges);

  console.log('Generated Code Snippet:');
  console.log(codeA.main);

  const hasTrig7 = codeA.main.includes('digitalWrite(7, LOW)') && codeA.main.includes('digitalWrite(7, HIGH)');
  const hasEcho8 = codeA.main.includes('pulseIn(8, HIGH)');
  const hasFallback9 = codeA.main.includes('digitalWrite(9, LOW)');
  const hasFallback10 = codeA.main.includes('pulseIn(10, HIGH)');

  if (!hasTrig7 || !hasEcho8) {
    throw new Error(`TEST A FAILED: Schema pins 7 (trig) and 8 (echo) were not bound correctly.\nCode:\n${codeA.main}`);
  }
  if (hasFallback9 || hasFallback10) {
    throw new Error(`TEST A FAILED: Compiler incorrectly fell back to default pins 9/10 instead of schema pins 7/8.\nCode:\n${codeA.main}`);
  }
  console.log('PASSED: Schema pins 7 & 8 reached compiler and generated correct C++ code!');

  // ==================================================
  // TEST B — compile idempotency & input immutability
  // ==================================================
  console.log('\n[TEST B] Compile idempotency & input immutability...');
  const originalNodesSnapshot = JSON.stringify(flowNodes);
  const originalEdgesSnapshot = JSON.stringify(flowEdges);

  const compilerB = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges);
  const pass1AST = compilerB.compile();
  const pass1Code = generatorA.generate(pass1AST, schemaNodes, schemaEdges);

  const pass2AST = compilerB.compile();
  const pass2Code = generatorA.generate(pass2AST, schemaNodes, schemaEdges);

  if (JSON.stringify(pass1AST) !== JSON.stringify(pass2AST)) {
    throw new Error('TEST B FAILED: Repeated compilation produced different ASTs on second call!');
  }
  if (pass1Code.main !== pass2Code.main) {
    throw new Error('TEST B FAILED: Repeated compilation produced different C++ output on second call!');
  }

  const postNodesSnapshot = JSON.stringify(flowNodes);
  const postEdgesSnapshot = JSON.stringify(flowEdges);

  if (originalNodesSnapshot !== postNodesSnapshot) {
    throw new Error('TEST B FAILED: Compiler mutated caller-owned flowNodes during compilation!');
  }
  if (originalEdgesSnapshot !== postEdgesSnapshot) {
    throw new Error('TEST B FAILED: Compiler mutated caller-owned flowEdges during compilation!');
  }
  console.log('PASSED: Compiler is idempotent and leaves caller input graph untouched!');

  // ==================================================
  // TEST C — package graph immutability
  // ==================================================
  console.log('\n[TEST C] Package graph immutability...');
  const pkg = getComponentPackage('ultrasonic_hcsr04');
  const pkgGraphBefore = JSON.stringify(pkg?.implementation?.graph);

  const compilerC = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges);
  compilerC.compile();

  const pkgGraphAfter = JSON.stringify(pkg?.implementation?.graph);

  if (pkgGraphBefore !== pkgGraphAfter) {
    throw new Error('TEST C FAILED: Package definition graph was mutated during compilation!');
  }
  console.log('PASSED: Package graph definition remains 100% immutable!');

  // ==================================================
  // TEST D — fresh compiler equivalence
  // ==================================================
  console.log('\n[TEST D] Fresh compiler equivalence...');
  const freshComp1 = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges);
  const freshComp2 = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges);

  const ast1 = freshComp1.compile();
  const ast2 = freshComp2.compile();

  const code1 = generatorA.generate(ast1, schemaNodes, schemaEdges);
  const code2 = generatorA.generate(ast2, schemaNodes, schemaEdges);

  if (JSON.stringify(ast1) !== JSON.stringify(ast2)) {
    throw new Error('TEST D FAILED: Two fresh compiler instances produced different ASTs!');
  }
  if (code1.main !== code2.main) {
    throw new Error('TEST D FAILED: Two fresh compiler instances produced different C++ output!');
  }
  console.log('PASSED: Fresh compiler instances produce identical output!');

  console.log('\n--- ALL COMPILER HARDENING TESTS PASSED SUCCESSFULLY ---');
}

runHardeningTests();
