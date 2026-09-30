import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { resolveBackendForTarget } from '../lib/compiler/backend/registry';
import { Node, Edge } from '@xyflow/react';

console.log('=== AUDITING USER FLOW ===\n');

// Build the flow and schema from the user screenshots
const schemaNodes: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'comp_ldr', type: 'componentNode', position: { x: -200, y: 200 }, data: { label: 'LDR Light Sensor', componentType: 'ldr_light', packageId: 'ldr_light' } },
  { id: 'comp_ultrasonic', type: 'componentNode', position: { x: 300, y: -200 }, data: { label: 'Ultrasonic HC-SR04', componentType: 'ultrasonic_hcsr04', packageId: 'ultrasonic_hcsr04' } },
  { id: 'led_1', type: 'componentNode', position: { x: 300, y: 100 }, data: { label: 'LED 1', componentType: 'led', packageId: 'led' } },
  { id: 'led_2', type: 'componentNode', position: { x: 300, y: 250 }, data: { label: 'LED 2', componentType: 'led', packageId: 'led' } },
];

const schemaEdges: Edge[] = [
  // LDR connected to A4 and GND
  { id: 'se1', source: 'arduino-uno', target: 'comp_ldr', sourceHandle: 'A4', targetHandle: 'pin1' },
  { id: 'se2', source: 'arduino-uno', target: 'comp_ldr', sourceHandle: 'GND', targetHandle: 'pin2' },

  // Ultrasonic connected to D11 (trig) and D10 (echo)
  { id: 'se3', source: 'arduino-uno', target: 'comp_ultrasonic', sourceHandle: 'D11', targetHandle: 'trig' },
  { id: 'se4', source: 'arduino-uno', target: 'comp_ultrasonic', sourceHandle: 'D10', targetHandle: 'echo' },

  // LEDs connected to D6 and D5
  { id: 'se5', source: 'arduino-uno', target: 'led_1', sourceHandle: 'D6', targetHandle: 'anode' },
  { id: 'se6', source: 'arduino-uno', target: 'led_2', sourceHandle: 'D5', targetHandle: 'anode' },
];

// Main flow from Image 2
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
  {
    id: 'if_distance',
    type: 'baseNode',
    position: { x: 400, y: -100 },
    data: {
      nodeType: 'condition',
      label: 'If Condition',
      params: { condition: 'distance > 100' }
    }
  },
  {
    id: 'dw_6_high',
    type: 'baseNode',
    position: { x: 550, y: -150 },
    data: { nodeType: 'digital_write', label: 'Digital Write', params: { pin: '6', value: 'HIGH' } }
  },
  {
    id: 'dw_6_low',
    type: 'baseNode',
    position: { x: 550, y: -50 },
    data: { nodeType: 'digital_write', label: 'Digital Write', params: { pin: '6', value: 'LOW' } }
  },
  {
    id: 'print_distance',
    type: 'baseNode',
    position: { x: 700, y: -100 },
    data: { nodeType: 'print', label: 'Print', params: { message: '"distance : ", distance' } }
  },
  {
    id: 'if_light',
    type: 'baseNode',
    position: { x: 400, y: 100 },
    data: {
      nodeType: 'condition',
      label: 'If Condition',
      params: { condition: 'lightVal > 10' }
    }
  },
  {
    id: 'dw_5_high',
    type: 'baseNode',
    position: { x: 550, y: 50 },
    data: { nodeType: 'digital_write', label: 'Digital Write', params: { pin: '5', value: 'HIGH' } }
  },
  {
    id: 'dw_5_low',
    type: 'baseNode',
    position: { x: 550, y: 150 },
    data: { nodeType: 'digital_write', label: 'Digital Write', params: { pin: '5', value: 'LOW' } }
  },
  {
    id: 'print_light',
    type: 'baseNode',
    position: { x: 700, y: 100 },
    data: { nodeType: 'print', label: 'Print', params: { message: '"Light : ", lightVal' } }
  },
  { id: 'end', type: 'baseNode', position: { x: 850, y: 0 }, data: { nodeType: 'end', label: 'End' } }
];

const flowEdges: Edge[] = [
  { id: 'e1', source: 'start', target: 'node_ultrasonic', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e2', source: 'node_ultrasonic', target: 'node_ldr', sourceHandle: 'flow', targetHandle: 'flow' },

  // TWO outgoing edges from node_ldr!
  { id: 'e3_dist', source: 'node_ldr', target: 'if_distance', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e3_light', source: 'node_ldr', target: 'if_light', sourceHandle: 'flow', targetHandle: 'flow' },

  // If distance branch
  { id: 'e_dist_true', source: 'if_distance', target: 'dw_6_high', sourceHandle: 'true', targetHandle: 'flow' },
  { id: 'e_dist_false', source: 'if_distance', target: 'dw_6_low', sourceHandle: 'false', targetHandle: 'flow' },
  { id: 'e_dw6_h_print', source: 'dw_6_high', target: 'print_distance', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e_dw6_l_print', source: 'dw_6_low', target: 'print_distance', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e_pdist_end', source: 'print_distance', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },

  // If light branch
  { id: 'e_light_true', source: 'if_light', target: 'dw_5_high', sourceHandle: 'true', targetHandle: 'flow' },
  { id: 'e_light_false', source: 'if_light', target: 'dw_5_low', sourceHandle: 'false', targetHandle: 'flow' },
  { id: 'e_dw5_h_print', source: 'dw_5_high', target: 'print_light', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e_dw5_l_print', source: 'dw_5_low', target: 'print_light', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e_plight_end', source: 'print_light', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
];

console.log('--- Step 1: Testing expandComponentGraphs ---');
try {
  const expanded = expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);
  console.log('✅ expandComponentGraphs SUCCEEDED!');
  console.log(`Expanded node count: ${expanded.nodes.length}`);
  console.log(`Expanded nodes:`, expanded.nodes.map(n => `${n.id} (${(n.data as any)?.nodeType})`));
  console.log(`Expanded edges:`, expanded.edges.map(e => `${e.source} -> ${e.target}`));
} catch (err: any) {
  console.error('❌ expandComponentGraphs FAILED:', err);
}

console.log('\n--- Step 2: Testing GraphToASTCompiler ---');
try {
  const compiler = new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'arduino_uno' });
  const ast = compiler.compile();
  console.log('✅ GraphToASTCompiler SUCCEEDED!');
  console.log('AST body statement kinds:', ast.body.map(s => s.kind));

  const backend = resolveBackendForTarget('arduino_uno');
  const code = backend.generate(ast, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes, schemaEdges });
  console.log('✅ Generated Arduino Code:');
  console.log('--- main ---');
  console.log(code.main);
} catch (err: any) {
  console.error('❌ GraphToASTCompiler FAILED:', err);
}
