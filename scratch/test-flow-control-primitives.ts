/**
 * Phase 6A.5 — Explicit Flow Split & Flow Converge Test Suite
 * File: scratch/test-flow-control-primitives.ts
 *
 * Scenarios:
 * T1:  flow_split basic sequential emission
 * T2:  flow_split 3 branches sequential execution
 * T3:  Deterministic branch order (branch_0 -> branch_1 -> branch_2 regardless of edge order / geometry)
 * T4:  flow_converge basic structure
 * T5:  Split -> Converge (Second Golden Case: DW A, DW B -> Converge -> Print once)
 * T6:  Condition -> Converge (Section 14: IF -> TRUE A, FALSE B -> Converge -> C once)
 * T7:  Exact Ultrasonic/LDR case (First Golden Case: Section 12)
 * T8:  Arbitrary fan-out rejection (UNSUPPORTED_IMPLICIT_FLOW_FANOUT)
 * T9:  Malformed split diagnostics (zero branches, branch count mismatch, duplicate branch, dangling)
 * T10: Malformed converge diagnostics (zero inputs, count mismatch, duplicate input, dangling)
 * T11: Nested flow_split
 * T12: Split inside condition branch
 * T13: Cyclic split/converge rejection (CYCLIC_FLOW_CONTROL)
 * T14: Arbitrary fan-in rejection (UNSUPPORTED_IMPLICIT_FLOW_FANIN)
 */

import { Node, Edge } from '@xyflow/react';
import { GraphToASTCompiler, FlowControlError, validateFlowControl } from '../lib/compiler/parser/graphParser';
import { ArduinoCppBackend } from '../lib/compiler/backend/arduinoBackend';
import { StatementNode, IfStatementNode, ExpressionStatementNode, CallExpressionNode } from '../lib/compiler/ast/ast';

console.log('=== TEST PHASE 6A.5: EXPLICIT FLOW SPLIT & FLOW CONVERGE ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────
// T1: flow_split basic sequential emission
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: flow_split Basic Sequential Emission ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    {
      id: 'split',
      type: 'baseNode',
      position: { x: 100, y: 0 },
      data: { nodeType: 'flow_split', params: { branchCount: 2 } },
    },
    {
      id: 'dw1',
      type: 'baseNode',
      position: { x: 200, y: -50 },
      data: { nodeType: 'digital_write', params: { pin: '6', value: 'HIGH' } },
    },
    {
      id: 'dw2',
      type: 'baseNode',
      position: { x: 200, y: 50 },
      data: { nodeType: 'digital_write', params: { pin: '5', value: 'LOW' } },
    },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'dw1', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e3', source: 'split', target: 'dw2', sourceHandle: 'branch_1', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.kind === 'Program', 'T1: AST compiled to Program');
  assert(ast.body.length === 2, 'T1: Body contains exactly 2 statements from sequential branches');
  const s0 = ast.body[0] as ExpressionStatementNode;
  const s1 = ast.body[1] as ExpressionStatementNode;
  assert(
    (s0.expression as CallExpressionNode).callee === 'digitalWrite',
    'T1: First branch statement is digitalWrite'
  );
  assert(s0.nodeId === 'dw1', 'T1: Branch 0 (dw1) emitted first');
  assert(s1.nodeId === 'dw2', 'T1: Branch 1 (dw2) emitted second');
}

// ─────────────────────────────────────────────────────────────────
// T2: flow_split 3 branches sequential execution
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: flow_split 3 Branches ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    {
      id: 'split',
      type: 'baseNode',
      position: { x: 100, y: 0 },
      data: { nodeType: 'flow_split', params: { branchCount: 3 } },
    },
    { id: 'dw1', type: 'baseNode', position: { x: 200, y: -100 }, data: { nodeType: 'digital_write', params: { pin: '1', value: 'HIGH' } } },
    { id: 'dw2', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'digital_write', params: { pin: '2', value: 'HIGH' } } },
    { id: 'dw3', type: 'baseNode', position: { x: 200, y: 100 }, data: { nodeType: 'digital_write', params: { pin: '3', value: 'HIGH' } } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'dw1', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e3', source: 'split', target: 'dw2', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e4', source: 'split', target: 'dw3', sourceHandle: 'branch_2', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.body.length === 3, 'T2: Exactly 3 sequential statements emitted');
  assert(ast.body[0].nodeId === 'dw1', 'T2: Branch 0 emitted first');
  assert(ast.body[1].nodeId === 'dw2', 'T2: Branch 1 emitted second');
  assert(ast.body[2].nodeId === 'dw3', 'T2: Branch 2 emitted third');
}

// ─────────────────────────────────────────────────────────────────
// T3: Deterministic Branch Order (Geometry & Array Invariance)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Deterministic Branch Order ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 500, y: 500 }, data: { nodeType: 'start' } },
    {
      id: 'split',
      type: 'baseNode',
      position: { x: 400, y: 400 },
      data: { nodeType: 'flow_split', params: { branchCount: 2 } },
    },
    // Placed in inverted positions: branch_0 is to the right of branch_1
    { id: 'b0', type: 'baseNode', position: { x: 999, y: 999 }, data: { nodeType: 'print', params: { message: '"first"' } } },
    { id: 'b1', type: 'baseNode', position: { x: -999, y: -999 }, data: { nodeType: 'print', params: { message: '"second"' } } },
  ];

  // Inverted edge array order: branch_1 is declared before branch_0 in the array
  const edgesReversed: Edge[] = [
    { id: 'e3', source: 'split', target: 'b1', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e1', source: 'start', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'b0', sourceHandle: 'branch_0', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edgesReversed);
  const ast = compiler.compile();

  assert(ast.body[0].nodeId === 'b0', 'T3: branch_0 strictly precedes branch_1 despite inverted array order');
  assert(ast.body[1].nodeId === 'b1', 'T3: branch_1 strictly follows branch_0 despite reversed canvas positions');
}

// ─────────────────────────────────────────────────────────────────
// T4 & T5: Split -> Converge (Second Golden Case)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4 & T5: Split -> Converge (Golden Case 2) ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'split', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    { id: 'dw_a', type: 'baseNode', position: { x: 200, y: -50 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'HIGH' } } },
    { id: 'dw_b', type: 'baseNode', position: { x: 200, y: 50 }, data: { nodeType: 'digital_write', params: { pin: '5', value: 'LOW' } } },
    { id: 'converge', type: 'baseNode', position: { x: 300, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    { id: 'print_c', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'print', params: { message: '"done"' } } },
    { id: 'end', type: 'baseNode', position: { x: 500, y: 0 }, data: { nodeType: 'end' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'dw_a', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e3', source: 'split', target: 'dw_b', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e4', source: 'dw_a', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e5', source: 'dw_b', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_1' },
    { id: 'e6', source: 'converge', target: 'print_c', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e7', source: 'print_c', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.body.length === 3, 'T5: Program body contains exactly 3 sequential statements');
  assert(ast.body[0].nodeId === 'dw_a', 'T5: Statement 1 is DigitalWrite A');
  assert(ast.body[1].nodeId === 'dw_b', 'T5: Statement 2 is DigitalWrite B');
  assert(ast.body[2].nodeId === 'print_c', 'T5: Statement 3 is Print C (executed ONCE after convergence)');

  // Verify backend code generation produces single Print
  const backend = new ArduinoCppBackend();
  const code = backend.generate(ast, { targetId: 'arduino_uno', schemaNodes: [], schemaEdges: [] });
  const printOccurrences = (code.main.match(/Serial\.println\("done"\);/g) || []).length;
  assert(printOccurrences === 1, 'T5: Generated C++ code emits Serial.println("done") exactly once');
}

// ─────────────────────────────────────────────────────────────────
// T6: Condition -> Converge (Section 14 Case)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Condition -> Converge ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'if_node', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'condition', params: { condition: 'x > 5' } } },
    { id: 'node_a', type: 'baseNode', position: { x: 200, y: -50 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'HIGH' } } },
    { id: 'node_b', type: 'baseNode', position: { x: 200, y: 50 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'LOW' } } },
    { id: 'converge', type: 'baseNode', position: { x: 300, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    { id: 'node_c', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'print', params: { message: '"after_condition"' } } },
    { id: 'end', type: 'baseNode', position: { x: 500, y: 0 }, data: { nodeType: 'end' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'if_node', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'if_node', target: 'node_a', sourceHandle: 'true', targetHandle: 'flow' },
    { id: 'e3', source: 'if_node', target: 'node_b', sourceHandle: 'false', targetHandle: 'flow' },
    { id: 'e4', source: 'node_a', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e5', source: 'node_b', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_1' },
    { id: 'e6', source: 'converge', target: 'node_c', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e7', source: 'node_c', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.body.length === 2, 'T6: Outer block contains exactly 2 statements: IfStatement and Node C');
  const ifStmt = ast.body[0] as IfStatementNode;
  assert(ifStmt.kind === 'IfStatement', 'T6: First statement is IfStatement');
  assert(ifStmt.consequent.body.length === 1, 'T6: Consequent contains only Node A');
  assert(ifStmt.consequent.body[0].nodeId === 'node_a', 'T6: Consequent body contains node_a');
  assert(ifStmt.alternate?.body.length === 1, 'T6: Alternate contains only Node B');
  assert(ifStmt.alternate?.body[0].nodeId === 'node_b', 'T6: Alternate body contains node_b');

  const afterStmt = ast.body[1];
  assert(afterStmt.nodeId === 'node_c', 'T6: Continuation Node C emitted in outer block AFTER IfStatement');

  // Verify C is NOT duplicated inside either branch
  const consequentHasC = ifStmt.consequent.body.some(s => s.nodeId === 'node_c');
  const alternateHasC = (ifStmt.alternate?.body || []).some(s => s.nodeId === 'node_c');
  assert(!consequentHasC && !alternateHasC, 'T6: Node C is strictly NOT duplicated inside consequent or alternate');
}

// ─────────────────────────────────────────────────────────────────
// T7: Exact Ultrasonic / LDR Case (First Golden Case: Section 12)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Exact Ultrasonic/LDR Case (Section 12) ---');
{
  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_ldr', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
    { id: 'hw_us', type: 'componentNode', position: { x: 200, y: 0 }, data: { packageId: 'ultrasonic_hcsr04' } },
  ];
  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'hw_ldr', sourceHandle: 'A4', targetHandle: 'pin1' },
    { id: 'se2', source: 'board', target: 'hw_us', sourceHandle: 'D11', targetHandle: 'trig' },
    { id: 'se3', source: 'board', target: 'hw_us', sourceHandle: 'D10', targetHandle: 'echo' },
  ];

  const flowNodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    {
      id: 'node_us',
      type: 'baseNode',
      position: { x: 100, y: 0 },
      data: {
        nodeType: 'component',
        params: { packageId: 'ultrasonic_hcsr04', componentInstanceId: 'hw_us', target: 'distance', trig: '11', echo: '10' },
      },
    },
    {
      id: 'node_ldr',
      type: 'baseNode',
      position: { x: 250, y: 0 },
      data: {
        nodeType: 'component',
        params: { packageId: 'ldr_light', componentInstanceId: 'hw_ldr', target: 'lightVal', pin1: 'A4' },
      },
    },
    {
      id: 'split',
      type: 'baseNode',
      position: { x: 350, y: 0 },
      data: { nodeType: 'flow_split', params: { branchCount: 2 } },
    },
    // Branch 0: If distance > 100
    { id: 'if_dist', type: 'baseNode', position: { x: 450, y: -100 }, data: { nodeType: 'condition', params: { condition: 'distance > 100' } } },
    { id: 'dw6_h', type: 'baseNode', position: { x: 550, y: -150 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'HIGH' } } },
    { id: 'dw6_l', type: 'baseNode', position: { x: 550, y: -50 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'LOW' } } },
    { id: 'p_dist_h', type: 'baseNode', position: { x: 650, y: -150 }, data: { nodeType: 'print', params: { message: '"dist: ", distance' } } },
    { id: 'p_dist_l', type: 'baseNode', position: { x: 650, y: -50 }, data: { nodeType: 'print', params: { message: '"dist: ", distance' } } },
    // Branch 1: If lightVal > 10
    { id: 'if_light', type: 'baseNode', position: { x: 450, y: 100 }, data: { nodeType: 'condition', params: { condition: 'lightVal > 10' } } },
    { id: 'dw5_h', type: 'baseNode', position: { x: 550, y: 50 }, data: { nodeType: 'digital_write', params: { pin: '5', value: 'HIGH' } } },
    { id: 'dw5_l', type: 'baseNode', position: { x: 550, y: 150 }, data: { nodeType: 'digital_write', params: { pin: '5', value: 'LOW' } } },
    { id: 'p_light_h', type: 'baseNode', position: { x: 650, y: 50 }, data: { nodeType: 'print', params: { message: '"light: ", lightVal' } } },
    { id: 'p_light_l', type: 'baseNode', position: { x: 650, y: 150 }, data: { nodeType: 'print', params: { message: '"light: ", lightVal' } } },
    // Converge & End
    { id: 'converge', type: 'baseNode', position: { x: 750, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    { id: 'end', type: 'baseNode', position: { x: 850, y: 0 }, data: { nodeType: 'end' } },
  ];

  const flowEdges: Edge[] = [
    { id: 'e1', source: 'start', target: 'node_us', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'node_us', target: 'node_ldr', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e3', source: 'node_ldr', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
    // Split branches
    { id: 'e4', source: 'split', target: 'if_dist', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e5', source: 'split', target: 'if_light', sourceHandle: 'branch_1', targetHandle: 'flow' },
    // Condition 1 (distance)
    { id: 'e6', source: 'if_dist', target: 'dw6_h', sourceHandle: 'true', targetHandle: 'flow' },
    { id: 'e7', source: 'if_dist', target: 'dw6_l', sourceHandle: 'false', targetHandle: 'flow' },
    { id: 'e8', source: 'dw6_h', target: 'p_dist_h', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e9', source: 'dw6_l', target: 'p_dist_l', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e10', source: 'p_dist_h', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    // Condition 2 (light)
    { id: 'e11', source: 'if_light', target: 'dw5_h', sourceHandle: 'true', targetHandle: 'flow' },
    { id: 'e12', source: 'if_light', target: 'dw5_l', sourceHandle: 'false', targetHandle: 'flow' },
    { id: 'e13', source: 'dw5_h', target: 'p_light_h', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e14', source: 'dw5_l', target: 'p_light_l', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e15', source: 'p_light_h', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_1' },
    // Converge to End
    { id: 'e16', source: 'converge', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'arduino_uno' });
  const ast = compiler.compile();

  // Find all IfStatement nodes in the program
  const ifStatements = ast.body.filter(s => s.kind === 'IfStatement') as IfStatementNode[];
  assert(ifStatements.length === 2, 'T7: Both conditions are compiled into the top-level execution sequence');
  assert(ifStatements[0].nodeId === 'if_dist', 'T7: First condition is distance > 100');
  assert(ifStatements[1].nodeId === 'if_light', 'T7: Second condition is lightVal > 10');

  // Verify the second condition is NOT nested inside the first
  const nestedIfs = ifStatements[0].consequent.body.filter(s => s.kind === 'IfStatement');
  assert(nestedIfs.length === 0, 'T7: Second condition is NOT nested inside first condition');

  // Generate Arduino code and assert both if blocks exist sequentially
  const backend = new ArduinoCppBackend();
  const code = backend.generate(ast, { targetId: 'arduino_uno', schemaNodes, schemaEdges });
  assert(code.main.includes('if ((distance > 100))'), 'T7: Generated code contains if ((distance > 100))');
  assert(code.main.includes('if ((lightVal > 10))'), 'T7: Generated code contains if ((lightVal > 10))');
}

// ─────────────────────────────────────────────────────────────────
// T8: Arbitrary Fan-Out Rejection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Arbitrary Fan-Out Rejection ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'dw', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'digital_write', params: { pin: '13', value: 'HIGH' } } },
    { id: 'p1', type: 'baseNode', position: { x: 200, y: -50 }, data: { nodeType: 'print', params: { message: '"p1"' } } },
    { id: 'p2', type: 'baseNode', position: { x: 200, y: 50 }, data: { nodeType: 'print', params: { message: '"p2"' } } },
  ];

  // Arbitrary fan-out on normal sequential node "dw"
  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'dw', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'dw', target: 'p1', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e3', source: 'dw', target: 'p2', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  let caughtError: FlowControlError | null = null;
  try {
    const compiler = new GraphToASTCompiler(nodes, edges);
    compiler.compile();
  } catch (err: any) {
    if (err instanceof FlowControlError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'T8: Arbitrary fan-out threw FlowControlError');
  assert(caughtError?.code === 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT', 'T8: Error code is UNSUPPORTED_IMPLICIT_FLOW_FANOUT');
  assert(caughtError?.nodeId === 'dw', 'T8: Error nodeId accurately points to offending node "dw"');
}

// ─────────────────────────────────────────────────────────────────
// T9: Malformed Split Diagnostics
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Malformed Split Diagnostics ---');
{
  // Sub-case 1: zero branches
  const nodesZero: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'split', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
  ];
  const diagsZero = validateFlowControl(nodesZero, []);
  assert(diagsZero.some(d => d.code === 'SPLIT_ZERO_BRANCHES'), 'T9: Detected SPLIT_ZERO_BRANCHES');

  // Sub-case 2: branch count mismatch (declared 3, connected 2)
  const nodesMismatch: Node[] = [
    { id: 'split', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 3 } } },
    { id: 'n1', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'print', params: { message: '"1"' } } },
    { id: 'n2', type: 'baseNode', position: { x: 100, y: 50 }, data: { nodeType: 'print', params: { message: '"2"' } } },
  ];
  const edgesMismatch: Edge[] = [
    { id: 'e1', source: 'split', target: 'n1', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'n2', sourceHandle: 'branch_1', targetHandle: 'flow' },
  ];
  const diagsMismatch = validateFlowControl(nodesMismatch, edgesMismatch);
  assert(diagsMismatch.some(d => d.code === 'SPLIT_BRANCH_COUNT_MISMATCH'), 'T9: Detected SPLIT_BRANCH_COUNT_MISMATCH');

  // Sub-case 3: duplicate branch handle
  const nodesDup: Node[] = [
    { id: 'split', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    { id: 'n1', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'print', params: { message: '"1"' } } },
    { id: 'n2', type: 'baseNode', position: { x: 100, y: 50 }, data: { nodeType: 'print', params: { message: '"2"' } } },
  ];
  const edgesDup: Edge[] = [
    { id: 'e1', source: 'split', target: 'n1', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'n2', sourceHandle: 'branch_0', targetHandle: 'flow' },
  ];
  const diagsDup = validateFlowControl(nodesDup, edgesDup);
  assert(diagsDup.some(d => d.code === 'SPLIT_DUPLICATE_BRANCH'), 'T9: Detected SPLIT_DUPLICATE_BRANCH');

  // Sub-case 4: dangling branch target
  const nodesDangling: Node[] = [
    { id: 'split', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 1 } } },
  ];
  const edgesDangling: Edge[] = [
    { id: 'e1', source: 'split', target: 'nonexistent_target', sourceHandle: 'branch_0', targetHandle: 'flow' },
  ];
  const diagsDangling = validateFlowControl(nodesDangling, edgesDangling);
  assert(diagsDangling.some(d => d.code === 'DANGLING_SPLIT_BRANCH'), 'T9: Detected DANGLING_SPLIT_BRANCH');
  // Sub-case 5: missing branchCount parameter
  const nodesMissing: Node[] = [
    { id: 'split', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_split' } },
  ];
  const diagsMissing = validateFlowControl(nodesMissing, []);
  assert(diagsMissing.some(d => d.code === 'SPLIT_MISSING_BRANCH_COUNT'), 'T9: Detected SPLIT_MISSING_BRANCH_COUNT');

  // Sub-case 6: invalid branchCount parameter (e.g. 0 or negative)
  const nodesInvalid: Node[] = [
    { id: 'split', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 0 } } },
  ];
  const diagsInvalid = validateFlowControl(nodesInvalid, []);
  assert(diagsInvalid.some(d => d.code === 'SPLIT_INVALID_BRANCH_COUNT'), 'T9: Detected SPLIT_INVALID_BRANCH_COUNT');
}

// ─────────────────────────────────────────────────────────────────
// T10: Malformed Converge Diagnostics
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Malformed Converge Diagnostics ---');
{
  // Sub-case 1: zero inputs
  const nodesZero: Node[] = [
    { id: 'converge', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
  ];
  const diagsZero = validateFlowControl(nodesZero, []);
  assert(diagsZero.some(d => d.code === 'CONVERGE_ZERO_INPUTS'), 'T10: Detected CONVERGE_ZERO_INPUTS');

  // Sub-case 2: count mismatch (declared 3, received 2)
  const nodesMismatch: Node[] = [
    { id: 'n1', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'print', params: { message: '"1"' } } },
    { id: 'n2', type: 'baseNode', position: { x: 0, y: 50 }, data: { nodeType: 'print', params: { message: '"2"' } } },
    { id: 'converge', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 3 } } },
  ];
  const edgesMismatch: Edge[] = [
    { id: 'e1', source: 'n1', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e2', source: 'n2', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_1' },
  ];
  const diagsMismatch = validateFlowControl(nodesMismatch, edgesMismatch);
  assert(diagsMismatch.some(d => d.code === 'CONVERGE_BRANCH_COUNT_MISMATCH'), 'T10: Detected CONVERGE_BRANCH_COUNT_MISMATCH');

  // Sub-case 3: duplicate input handle
  const edgesDup: Edge[] = [
    { id: 'e1', source: 'n1', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e2', source: 'n2', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
  ];
  const diagsDup = validateFlowControl(nodesMismatch, edgesDup);
  assert(diagsDup.some(d => d.code === 'CONVERGE_DUPLICATE_INPUT'), 'T10: Detected CONVERGE_DUPLICATE_INPUT');

  // Sub-case 4: dangling converge source
  const nodesDangling: Node[] = [
    { id: 'converge', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 1 } } },
  ];
  const edgesDangling: Edge[] = [
    { id: 'e1', source: 'nonexistent_source', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
  ];
  const diagsDangling = validateFlowControl(nodesDangling, edgesDangling);
  assert(diagsDangling.some(d => d.code === 'DANGLING_CONVERGE_BRANCH'), 'T10: Detected DANGLING_CONVERGE_BRANCH');

  // Sub-case 5: missing branchCount parameter
  const nodesMissing: Node[] = [
    { id: 'converge', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_converge' } },
  ];
  const diagsMissing = validateFlowControl(nodesMissing, []);
  assert(diagsMissing.some(d => d.code === 'CONVERGE_MISSING_BRANCH_COUNT'), 'T10: Detected CONVERGE_MISSING_BRANCH_COUNT');

  // Sub-case 6: invalid branchCount parameter
  const nodesInvalid: Node[] = [
    { id: 'converge', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: -1 } } },
  ];
  const diagsInvalid = validateFlowControl(nodesInvalid, []);
  assert(diagsInvalid.some(d => d.code === 'CONVERGE_INVALID_BRANCH_COUNT'), 'T10: Detected CONVERGE_INVALID_BRANCH_COUNT');
}

// ─────────────────────────────────────────────────────────────────
// T11: Nested Flow Split
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Nested Flow Split ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'split1', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    // Outer Branch 0 contains inner split
    { id: 'split2', type: 'baseNode', position: { x: 200, y: -50 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    { id: 'n_a', type: 'baseNode', position: { x: 300, y: -80 }, data: { nodeType: 'digital_write', params: { pin: '1', value: 'HIGH' } } },
    { id: 'n_b', type: 'baseNode', position: { x: 300, y: -20 }, data: { nodeType: 'digital_write', params: { pin: '2', value: 'HIGH' } } },
    // Outer Branch 1
    { id: 'n_c', type: 'baseNode', position: { x: 200, y: 50 }, data: { nodeType: 'digital_write', params: { pin: '3', value: 'HIGH' } } },
    { id: 'end', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'end' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'split1', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'split1', target: 'split2', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e3', source: 'split1', target: 'n_c', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e4', source: 'split2', target: 'n_a', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e5', source: 'split2', target: 'n_b', sourceHandle: 'branch_1', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.body.length === 3, 'T11: Nested split produces 3 total sequential statements');
  assert(ast.body[0].nodeId === 'n_a', 'T11: First statement is n_a');
  assert(ast.body[1].nodeId === 'n_b', 'T11: Second statement is n_b');
  assert(ast.body[2].nodeId === 'n_c', 'T11: Third statement is n_c');
}

// ─────────────────────────────────────────────────────────────────
// T12: Split Inside Condition Branch
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Split Inside Condition Branch ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'if_node', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'condition', params: { condition: 'x > 0' } } },
    // True branch enters split
    { id: 'split', type: 'baseNode', position: { x: 200, y: -50 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    { id: 'n_true1', type: 'baseNode', position: { x: 300, y: -80 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'HIGH' } } },
    { id: 'n_true2', type: 'baseNode', position: { x: 300, y: -20 }, data: { nodeType: 'digital_write', params: { pin: '5', value: 'HIGH' } } },
    { id: 'inner_converge', type: 'baseNode', position: { x: 350, y: -50 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    // False branch
    { id: 'n_false', type: 'baseNode', position: { x: 200, y: 50 }, data: { nodeType: 'digital_write', params: { pin: '4', value: 'LOW' } } },
    // Converge & Continuation
    { id: 'converge', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    { id: 'after', type: 'baseNode', position: { x: 500, y: 0 }, data: { nodeType: 'print', params: { message: '"after"' } } },
    { id: 'end', type: 'baseNode', position: { x: 600, y: 0 }, data: { nodeType: 'end' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'if_node', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'if_node', target: 'split', sourceHandle: 'true', targetHandle: 'flow' },
    { id: 'e3', source: 'if_node', target: 'n_false', sourceHandle: 'false', targetHandle: 'flow' },
    { id: 'e4', source: 'split', target: 'n_true1', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e5', source: 'split', target: 'n_true2', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e6', source: 'n_true1', target: 'inner_converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e7', source: 'n_true2', target: 'inner_converge', sourceHandle: 'flow', targetHandle: 'branch_1' },
    { id: 'e8', source: 'inner_converge', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e9', source: 'n_false', target: 'converge', sourceHandle: 'flow', targetHandle: 'branch_1' },
    { id: 'e10', source: 'converge', target: 'after', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e11', source: 'after', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.body.length === 2, 'T12: Top level has 2 statements: IfStatement and after node');
  const ifStmt = ast.body[0] as IfStatementNode;
  assert(ifStmt.consequent.body.length === 2, 'T12: True branch executed split: contains 2 sequential statements');
  assert(ifStmt.consequent.body[0].nodeId === 'n_true1', 'T12: True branch statement 1 is n_true1');
  assert(ifStmt.consequent.body[1].nodeId === 'n_true2', 'T12: True branch statement 2 is n_true2');
  assert(ifStmt.alternate?.body.length === 1, 'T12: False branch contains 1 statement');
  assert(ast.body[1].nodeId === 'after', 'T12: Continuation node "after" emitted once in parent block');
}

// ─────────────────────────────────────────────────────────────────
// T13: Cyclic Split/Converge Rejection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T13: Cyclic Split/Converge Rejection ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'split', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 1 } } },
    { id: 'converge', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 1 } } },
  ];

  // Cycle: split -> converge -> split
  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'split', target: 'converge', sourceHandle: 'branch_0', targetHandle: 'branch_0' },
    { id: 'e3', source: 'converge', target: 'split', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const diags = validateFlowControl(nodes, edges);
  assert(diags.some(d => d.code === 'CYCLIC_FLOW_CONTROL'), 'T13: Detected CYCLIC_FLOW_CONTROL on unstructured loop');
}

// ─────────────────────────────────────────────────────────────────
// T14: Arbitrary Fan-In Rejection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14: Arbitrary Fan-In Rejection ---');
{
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'n1', type: 'baseNode', position: { x: 100, y: -50 }, data: { nodeType: 'print', params: { message: '"1"' } } },
    { id: 'n2', type: 'baseNode', position: { x: 100, y: 50 }, data: { nodeType: 'print', params: { message: '"2"' } } },
    { id: 'target_node', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'digital_write', params: { pin: '13', value: 'HIGH' } } },
  ];

  // Ambiguous fan-in to normal node "target_node" from two separate sources without flow_converge
  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'n1', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'n1', target: 'target_node', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e3', source: 'n2', target: 'target_node', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  let caughtError: FlowControlError | null = null;
  try {
    const compiler = new GraphToASTCompiler(nodes, edges);
    compiler.compile();
  } catch (err: any) {
    if (err instanceof FlowControlError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'T14: Arbitrary fan-in threw FlowControlError');
  assert(caughtError?.code === 'UNSUPPORTED_IMPLICIT_FLOW_FANIN', 'T14: Error code is UNSUPPORTED_IMPLICIT_FLOW_FANIN');
  assert(caughtError?.nodeId === 'target_node', 'T14: Error references target node');
}

// ─────────────────────────────────────────────────────────────────
// T15: Nested Control Flow with Multiple flow_converge Nodes
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T15: Nested Control Flow with Multiple flow_converge Nodes ---');
{
  // Graph structure:
  // start -> split_outer
  //   branch_0 -> dw_outer_1 -> split_inner
  //                 branch_0 -> dw_inner_a ──┐
  //                 branch_1 -> dw_inner_b ──┼──> converge_inner
  //                                                    ↓
  //                                                 dw_post_inner ──┐
  //   branch_1 -> dw_outer_2 ───────────────────────────────────────┼──> converge_outer
  //                                                                            ↓
  //                                                                         print_final
  //                                                                            ↓
  //                                                                           end
  const nodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    { id: 'split_outer', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    { id: 'dw_outer_1', type: 'baseNode', position: { x: 200, y: -100 }, data: { nodeType: 'digital_write', params: { pin: '1', value: 'HIGH' } } },
    { id: 'split_inner', type: 'baseNode', position: { x: 300, y: -100 }, data: { nodeType: 'flow_split', params: { branchCount: 2 } } },
    { id: 'dw_inner_a', type: 'baseNode', position: { x: 400, y: -150 }, data: { nodeType: 'digital_write', params: { pin: '2', value: 'HIGH' } } },
    { id: 'dw_inner_b', type: 'baseNode', position: { x: 400, y: -50 }, data: { nodeType: 'digital_write', params: { pin: '3', value: 'HIGH' } } },
    { id: 'converge_inner', type: 'baseNode', position: { x: 500, y: -100 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    { id: 'dw_post_inner', type: 'baseNode', position: { x: 600, y: -100 }, data: { nodeType: 'digital_write', params: { pin: '4', value: 'HIGH' } } },
    { id: 'dw_outer_2', type: 'baseNode', position: { x: 200, y: 100 }, data: { nodeType: 'digital_write', params: { pin: '5', value: 'HIGH' } } },
    { id: 'converge_outer', type: 'baseNode', position: { x: 700, y: 0 }, data: { nodeType: 'flow_converge', params: { branchCount: 2 } } },
    { id: 'print_final', type: 'baseNode', position: { x: 800, y: 0 }, data: { nodeType: 'print', params: { message: '"final"' } } },
    { id: 'end', type: 'baseNode', position: { x: 900, y: 0 }, data: { nodeType: 'end' } },
  ];

  const edges: Edge[] = [
    { id: 'e_start', source: 'start', target: 'split_outer', sourceHandle: 'flow', targetHandle: 'flow' },
    // Outer branch 0
    { id: 'e_so_b0', source: 'split_outer', target: 'dw_outer_1', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e_dw1_si', source: 'dw_outer_1', target: 'split_inner', sourceHandle: 'flow', targetHandle: 'flow' },
    // Inner split
    { id: 'e_si_b0', source: 'split_inner', target: 'dw_inner_a', sourceHandle: 'branch_0', targetHandle: 'flow' },
    { id: 'e_si_b1', source: 'split_inner', target: 'dw_inner_b', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e_ina_ci', source: 'dw_inner_a', target: 'converge_inner', sourceHandle: 'flow', targetHandle: 'branch_0' },
    { id: 'e_inb_ci', source: 'dw_inner_b', target: 'converge_inner', sourceHandle: 'flow', targetHandle: 'branch_1' },
    // Post-inner continuation in outer branch 0
    { id: 'e_ci_post', source: 'converge_inner', target: 'dw_post_inner', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e_post_co', source: 'dw_post_inner', target: 'converge_outer', sourceHandle: 'flow', targetHandle: 'branch_0' },
    // Outer branch 1
    { id: 'e_so_b1', source: 'split_outer', target: 'dw_outer_2', sourceHandle: 'branch_1', targetHandle: 'flow' },
    { id: 'e_dw2_co', source: 'dw_outer_2', target: 'converge_outer', sourceHandle: 'flow', targetHandle: 'branch_1' },
    // Outer continuation
    { id: 'e_co_pf', source: 'converge_outer', target: 'print_final', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e_pf_end', source: 'print_final', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const compiler = new GraphToASTCompiler(nodes, edges);
  const ast = compiler.compile();

  assert(ast.body.length === 6, `T15: AST body contains exactly 6 statements (got ${ast.body.length})`);
  assert(ast.body[0].nodeId === 'dw_outer_1', 'T15: Stmt 0 is dw_outer_1');
  assert(ast.body[1].nodeId === 'dw_inner_a', 'T15: Stmt 1 is dw_inner_a (inner split branch 0)');
  assert(ast.body[2].nodeId === 'dw_inner_b', 'T15: Stmt 2 is dw_inner_b (inner split branch 1)');
  assert(ast.body[3].nodeId === 'dw_post_inner', 'T15: Stmt 3 is dw_post_inner (continued after inner converge)');
  assert(ast.body[4].nodeId === 'dw_outer_2', 'T15: Stmt 4 is dw_outer_2 (outer split branch 1)');
  assert(ast.body[5].nodeId === 'print_final', 'T15: Stmt 5 is print_final (executed ONCE after outer converge)');

  // Verify backend code generation produces single print_final
  const backend = new ArduinoCppBackend();
  const code = backend.generate(ast, { targetId: 'arduino_uno', schemaNodes: [], schemaEdges: [] });
  const printMatches = (code.main.match(/Serial\.println\("final"\);/g) || []).length;
  assert(printMatches === 1, 'T15: Generated C++ code emits Serial.println("final") exactly once');
}

// ─────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────
console.log(`\n==================================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
}
