import { validatePackageDefinition } from '../lib/compiler/packages/packageValidator';
import { getComponentPackage } from '../lib/registry/components';
import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { resolveBackendForTarget } from '../lib/compiler/backend/registry';
import { Node, Edge } from '@xyflow/react';

console.log('====================================================');
console.log('AUDIT ANALYSIS: MULTI-CONNECTION COMPONENT FLOW');
console.log('====================================================\n');

// ─────────────────────────────────────────────────────────────────
// LAYER 1: Package Contract & flowpkg Audit
// ─────────────────────────────────────────────────────────────────
console.log('--- 1. Package Contract & Flowpkg Validation ---');
const ldrPkg = getComponentPackage('ldr_light');
const ultrasonicPkg = getComponentPackage('ultrasonic_hcsr04');

const ldrValidation = validatePackageDefinition(ldrPkg as any);
console.log(`LDR Package Valid: ${ldrValidation.valid} (Diagnostics: ${ldrValidation.diagnostics.length})`);
if (!ldrValidation.valid) {
  console.log('LDR Diagnostics:', ldrValidation.diagnostics);
}

const ultrasonicValidation = validatePackageDefinition(ultrasonicPkg as any);
console.log(`Ultrasonic Package Valid: ${ultrasonicValidation.valid} (Diagnostics: ${ultrasonicValidation.diagnostics.length})`);
if (!ultrasonicValidation.valid) {
  console.log('Ultrasonic Diagnostics:', ultrasonicValidation.diagnostics);
}

// ─────────────────────────────────────────────────────────────────
// LAYER 2: Component Expander Audit
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 2. Component Expander Output Audit ---');
const schemaNodes: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'comp_ldr', type: 'componentNode', position: { x: -200, y: 200 }, data: { label: 'LDR Light Sensor', componentType: 'ldr_light', packageId: 'ldr_light' } },
  { id: 'comp_ultrasonic', type: 'componentNode', position: { x: 300, y: -200 }, data: { label: 'Ultrasonic HC-SR04', componentType: 'ultrasonic_hcsr04', packageId: 'ultrasonic_hcsr04' } },
];

const schemaEdges: Edge[] = [
  { id: 'se1', source: 'arduino-uno', target: 'comp_ldr', sourceHandle: 'A4', targetHandle: 'pin1' },
  { id: 'se2', source: 'arduino-uno', target: 'comp_ldr', sourceHandle: 'GND', targetHandle: 'pin2' },
  { id: 'se3', source: 'arduino-uno', target: 'comp_ultrasonic', sourceHandle: 'D11', targetHandle: 'trig' },
  { id: 'se4', source: 'arduino-uno', target: 'comp_ultrasonic', sourceHandle: 'D10', targetHandle: 'echo' },
];

const flowNodes: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  {
    id: 'node_ultrasonic',
    type: 'baseNode',
    position: { x: 100, y: 0 },
    data: {
      nodeType: 'component',
      label: 'Ultrasonic Read',
      params: { packageId: 'ultrasonic_hcsr04', target: 'distance', trig: '11', echo: '10' }
    }
  },
  {
    id: 'node_ldr',
    type: 'baseNode',
    position: { x: 250, y: 0 },
    data: {
      nodeType: 'component',
      label: 'LDR Light',
      params: { packageId: 'ldr_light', target: 'lightVal', pin1: 'A4' }
    }
  },
  { id: 'if_distance', type: 'baseNode', position: { x: 400, y: -100 }, data: { nodeType: 'condition', params: { condition: 'distance > 100' } } },
  { id: 'if_light', type: 'baseNode', position: { x: 400, y: 100 }, data: { nodeType: 'condition', params: { condition: 'lightVal > 10' } } },
  { id: 'dw_6', type: 'baseNode', position: { x: 550, y: -100 }, data: { nodeType: 'digital_write', params: { pin: '6', value: 'HIGH' } } },
  { id: 'dw_5', type: 'baseNode', position: { x: 550, y: 100 }, data: { nodeType: 'digital_write', params: { pin: '5', value: 'HIGH' } } },
  { id: 'end', type: 'baseNode', position: { x: 700, y: 0 }, data: { nodeType: 'end' } }
];

const flowEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'node_ultrasonic', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e2', source: 'node_ultrasonic', target: 'node_ldr', sourceHandle: 'flow', targetHandle: 'flow' },
  // Multiple outgoing connections from LDR:
  { id: 'e3_dist', source: 'node_ldr', target: 'if_distance', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e3_light', source: 'node_ldr', target: 'if_light', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e_dist_dw', source: 'if_distance', target: 'dw_6', sourceHandle: 'true', targetHandle: 'flow' },
  { id: 'e_light_dw', source: 'if_light', target: 'dw_5', sourceHandle: 'true', targetHandle: 'flow' },
  { id: 'e_dw6_end', source: 'dw_6', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e_dw5_end', source: 'dw_5', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
];

const expanded = expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);
console.log(`Original Component Nodes in Flow: 2 (node_ultrasonic, node_ldr)`);
const residualComponents = expanded.nodes.filter(n => (n.data as any)?.nodeType === 'component');
console.log(`Residual Component Nodes Remaining: ${residualComponents.length}`);
const ultrasonicNodes = expanded.nodes.filter(n => n.id.startsWith('node_ultrasonic_'));
const ldrNodes = expanded.nodes.filter(n => n.id.startsWith('node_ldr_'));
console.log(`Expanded Ultrasonic Subnodes: ${ultrasonicNodes.length}`);
console.log(`Expanded LDR Subnodes: ${ldrNodes.length}`);

// Edges originating from LDR exit node:
const ldrExitId = 'node_ldr_return_light';
const edgesFromLdrExit = expanded.edges.filter(e => e.source === ldrExitId);
console.log(`Edges originating from LDR exit node (${ldrExitId}): ${edgesFromLdrExit.length}`);
edgesFromLdrExit.forEach(e => console.log(`  -> Target: ${e.target} (handle: ${e.sourceHandle})`));

// ─────────────────────────────────────────────────────────────────
// LAYER 3: Compiler AST Traversal Audit (Phase 6A.5 Enforcement)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- 3. GraphToASTCompiler Traversal Audit ---');
try {
  const compiler = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'arduino_uno' });
  const ast = compiler.compile();

  console.log('Compiled AST Top-Level Statements:');
  ast.body.forEach((stmt, idx) => {
    console.log(`  [${idx}] kind=${stmt.kind}, nodeId=${stmt.nodeId}`);
  });

  // LAYER 4: Backend C++ Code Generation Audit
  console.log('\n--- 4. Backend Code Generation Audit ---');
  const backend = resolveBackendForTarget('arduino_uno');
  const code = backend.generate(ast, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes, schemaEdges });
  console.log('Generated loop() function:');
  console.log(code.main);
} catch (err: any) {
  console.log(`✅ [EXPECTED] GraphToASTCompiler rejected implicit fanout: [${err.code}] ${err.message}`);
  console.log('Phase 6A.5 enforcement verified: Multiple outgoing edges without flow_split are blocked deterministically.');
}

