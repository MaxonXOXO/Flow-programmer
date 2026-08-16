import { Node, Edge } from '@xyflow/react';
import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { UltrasonicHCSR04Package } from '../lib/registry/components/sensors/ultrasonic_hcsr04';

console.log('=== TEST B4: EXPLICIT COMPONENT SUBFLOW ENTRY/EXIT DECLARATIONS ===\n');

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

function assertThrows(fn: () => void, expectedText: string, msg: string) {
  try {
    fn();
    console.error(`❌ [FAIL] ${msg} (Did not throw)`);
    failed++;
  } catch (err: any) {
    if (err?.message?.includes(expectedText)) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg} (Threw wrong message: "${err?.message}")`);
      failed++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// T1 — Explicit HC-SR04 Entry and Exit Declarations
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Explicit HC-SR04 Entry and Exit Declarations ---');

const hcsr04Graph = (UltrasonicHCSR04Package.implementation.graph || UltrasonicHCSR04Package.implementation.subflow) as any;

assert(
  hcsr04Graph?.entry === 'trig_low_1',
  'HC-SR04 graph explicitly declares entry = "trig_low_1"'
);

assert(
  hcsr04Graph?.exit === 'return_distance',
  'HC-SR04 graph explicitly declares exit = "return_distance"'
);


// ─────────────────────────────────────────────────────────────────
// T2 & T3 — Entry Splice and Exit Splice Verification
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2 & T3: Entry and Exit Splice Verification ---');

const flowNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start', label: 'Start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_inst1',
    type: 'componentNode',
    data: {
      label: 'Ultrasonic Distance',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'measured_cm', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  },
  { id: 'print_node', type: 'baseNode', data: { nodeType: 'print', params: { message: 'measured_cm' } }, position: { x: 400, y: 0 } }
];

const flowEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'sensor_inst1', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e2', source: 'sensor_inst1', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const expanded = expandComponentGraphs(flowNodes, flowEdges);

// T2 check: incoming edge from start_node targets sensor_inst1_trig_low_1
const incomingEdge = expanded.edges.find((e: Edge) => e.source === 'start_node');
assert(
  incomingEdge?.target === 'sensor_inst1_trig_low_1',
  'T2: Incoming flow edge redirected cleanly to expanded entry node "sensor_inst1_trig_low_1"'
);

// T3 check: outgoing edge to print_node originates from sensor_inst1_return_distance
const outgoingEdge = expanded.edges.find((e: Edge) => e.target === 'print_node');
assert(
  outgoingEdge?.source === 'sensor_inst1_return_distance',
  'T3: Outgoing flow edge redirected cleanly from expanded exit node "sensor_inst1_return_distance"'
);

// Verify component node itself was replaced by expanded subflow
const originalNodeExists = expanded.nodes.some((n: Node) => n.id === 'sensor_inst1');
assert(!originalNodeExists, 'Original unexpanded component node "sensor_inst1" was removed after expansion');


// ─────────────────────────────────────────────────────────────────
// T4 — Node Ordering Independence
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Node Ordering Independence ---');

// Create a copy of HC-SR04 graph nodes with reversed array order
const originalNodes: Node[] = hcsr04Graph.nodes;
const reversedNodes: Node[] = [...originalNodes].reverse();

const customPackageDef = {
  ...UltrasonicHCSR04Package,
  metadata: { ...UltrasonicHCSR04Package.metadata, id: 'custom_reordered_hcsr04' },
  implementation: {
    strategy: 'builtin' as const,
    graph: {
      entry: 'trig_low_1',
      exit: 'return_distance',
      nodes: reversedNodes,
      edges: hcsr04Graph.edges
    }
  }
};

// Test expansion with reversed array order
const reorderedFlowNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start', label: 'Start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_reordered',
    type: 'componentNode',
    data: {
      label: 'Reordered Sensor',
      nodeType: 'componentNode',
      definition: customPackageDef,
      params: { varDist: 'dist_cm', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  },
  { id: 'print_node', type: 'baseNode', data: { nodeType: 'print', params: { message: 'dist_cm' } }, position: { x: 400, y: 0 } }
];

const reorderedFlowEdges: Edge[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_reordered', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe2', source: 'sensor_reordered', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const reorderedExpanded = expandComponentGraphs(reorderedFlowNodes, reorderedFlowEdges);

const reorderedIncoming = reorderedExpanded.edges.find((e: Edge) => e.source === 'start_node');
const reorderedOutgoing = reorderedExpanded.edges.find((e: Edge) => e.target === 'print_node');

assert(
  reorderedIncoming?.target === 'sensor_reordered_trig_low_1',
  'T4: Reordered array: Incoming edge still targets "sensor_reordered_trig_low_1"'
);

assert(
  reorderedOutgoing?.source === 'sensor_reordered_return_distance',
  'T4: Reordered array: Outgoing edge still originates from "sensor_reordered_return_distance"'
);


// ─────────────────────────────────────────────────────────────────
// T5 — Missing Entry Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Missing Entry Validation ---');

const missingEntryPackage = {
  metadata: { id: 'missing_entry_pkg', category: 'sensor' as const },
  implementation: {
    graph: {
      exit: 'return_node',
      nodes: [{ id: 'work_node', type: 'baseNode', data: { nodeType: 'delay' } }],
      edges: []
    }
  }
};

const missingEntryNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'bad_inst', type: 'componentNode', data: { nodeType: 'missing_entry_pkg', definition: missingEntryPackage }, position: { x: 100, y: 0 } }
];
const missingEntryEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'bad_inst', sourceHandle: 'flow', targetHandle: 'flow' }
];

assertThrows(
  () => expandComponentGraphs(missingEntryNodes, missingEntryEdges),
  "does not declare an explicit 'entry' node ID",
  'T5: Package graph missing entry ID throws clear error'
);


// ─────────────────────────────────────────────────────────────────
// T6 — Missing Exit Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Missing Exit Validation ---');

const missingExitPackage = {
  metadata: { id: 'missing_exit_pkg', category: 'sensor' as const },
  implementation: {
    graph: {
      entry: 'trig_node',
      nodes: [{ id: 'trig_node', type: 'baseNode', data: { nodeType: 'gpio' } }],
      edges: []
    }
  }
};

const missingExitNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'bad_inst', type: 'componentNode', data: { nodeType: 'missing_exit_pkg', definition: missingExitPackage }, position: { x: 100, y: 0 } }
];
const missingExitEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'bad_inst', sourceHandle: 'flow', targetHandle: 'flow' }
];

assertThrows(
  () => expandComponentGraphs(missingExitNodes, missingExitEdges),
  "does not declare an explicit 'exit' node ID",
  'T6: Package graph missing exit ID throws clear error'
);


// ─────────────────────────────────────────────────────────────────
// T7 — Invalid Entry Node ID Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Invalid Entry Node ID Validation ---');

const invalidEntryPackage = {
  metadata: { id: 'invalid_entry_pkg', category: 'sensor' as const },
  implementation: {
    graph: {
      entry: 'nonexistent_entry_id',
      exit: 'valid_exit_id',
      nodes: [{ id: 'valid_exit_id', type: 'baseNode', data: { nodeType: 'delay' } }],
      edges: []
    }
  }
};

const invalidEntryNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'bad_inst', type: 'componentNode', data: { nodeType: 'invalid_entry_pkg', definition: invalidEntryPackage }, position: { x: 100, y: 0 } }
];
const invalidEntryEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'bad_inst', sourceHandle: 'flow', targetHandle: 'flow' }
];

assertThrows(
  () => expandComponentGraphs(invalidEntryNodes, invalidEntryEdges),
  'declares entry node ID "nonexistent_entry_id", which does not exist',
  'T7: Package graph with nonexistent entry ID throws clear error'
);


// ─────────────────────────────────────────────────────────────────
// T8 — Invalid Exit Node ID Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Invalid Exit Node ID Validation ---');

const invalidExitPackage = {
  metadata: { id: 'invalid_exit_pkg', category: 'sensor' as const },
  implementation: {
    graph: {
      entry: 'valid_entry_id',
      exit: 'nonexistent_exit_id',
      nodes: [{ id: 'valid_entry_id', type: 'baseNode', data: { nodeType: 'delay' } }],
      edges: []
    }
  }
};

const invalidExitNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'bad_inst', type: 'componentNode', data: { nodeType: 'invalid_exit_pkg', definition: invalidExitPackage }, position: { x: 100, y: 0 } }
];
const invalidExitEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'bad_inst', sourceHandle: 'flow', targetHandle: 'flow' }
];

assertThrows(
  () => expandComponentGraphs(invalidExitNodes, invalidExitEdges),
  'declares exit node ID "nonexistent_exit_id", which does not exist',
  'T8: Package graph with nonexistent exit ID throws clear error'
);


// ─────────────────────────────────────────────────────────────────
// Single-Node Subflow Component (entry === exit)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Bonus: Single-Node Component Subflow (entry === exit) ---');

const singleNodePackage = {
  metadata: { id: 'single_node_pkg', category: 'actuator' as const },
  implementation: {
    graph: {
      entry: 'sole_step',
      exit: 'sole_step',
      nodes: [{ id: 'sole_step', type: 'baseNode', data: { nodeType: 'delay', params: { ms: '500' } } }],
      edges: []
    }
  }
};

const singleNodeFlow: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'single_inst', type: 'componentNode', data: { nodeType: 'single_node_pkg', definition: singleNodePackage }, position: { x: 100, y: 0 } },
  { id: 'end_node', type: 'baseNode', data: { nodeType: 'end' }, position: { x: 200, y: 0 } }
];
const singleNodeEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'single_inst', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e2', source: 'single_inst', target: 'end_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const singleNodeExpanded = expandComponentGraphs(singleNodeFlow, singleNodeEdges);

const singleIn = singleNodeExpanded.edges.find((e: Edge) => e.source === 'start_node');
const singleOut = singleNodeExpanded.edges.find((e: Edge) => e.target === 'end_node');

assert(
  singleIn?.target === 'single_inst_sole_step',
  'Single-node subflow: incoming edge correctly targets "single_inst_sole_step"'
);

assert(
  singleOut?.source === 'single_inst_sole_step',
  'Single-node subflow: outgoing edge correctly originates from "single_inst_sole_step"'
);


// ─────────────────────────────────────────────────────────────────
// T9 — Existing HC-SR04 Full C++ Compilation Regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Existing HC-SR04 C++ Compilation Regression ---');

const compiler = new GraphToASTCompiler(expanded.nodes, expanded.edges);
const ast = compiler.compile();
const generator = new ArduinoUnoGenerator();
const code = generator.generate(ast, [], []);

assert(
  code.main.includes('pulseIn(10, HIGH)') && code.main.includes('measured_cm ='),
  'T9: HC-SR04 expanded graph compiles into valid Arduino sketch code'
);

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}
