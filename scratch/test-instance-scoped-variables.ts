import { Node, Edge } from '@xyflow/react';
import { expandComponentGraphs, sanitizeIdentifier } from '../lib/compiler/packages/componentExpander';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';

console.log('=== TEST B3: INSTANCE-SCOPED INTERNAL VARIABLE NAMES ===\n');

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
// T6 — Identifier Sanitization
// ─────────────────────────────────────────────────────────────────
console.log('--- T6: Identifier Sanitization ---');

assert(sanitizeIdentifier('sensor_A') === 'sensor_A', 'Clean ID "sensor_A" remains "sensor_A"');
assert(sanitizeIdentifier('sensor-node-1') === 'sensor_node_1', 'Dashes in "sensor-node-1" sanitized to "sensor_node_1"');
assert(sanitizeIdentifier('sensor.node.1') === 'sensor_node_1', 'Dots in "sensor.node.1" sanitized to "sensor_node_1"');
assert(sanitizeIdentifier('123sensor') === '_123sensor', 'Leading digit in "123sensor" prefixed with underscore');
assert(sanitizeIdentifier('node@spec#1!') === 'node_spec_1_', 'Special chars sanitized to underscores');


// ─────────────────────────────────────────────────────────────────
// T1 & T2 & T3 & T4 — Two HC-SR04 Instances, Internal Vars & Bindings
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T1-T4: Two HC-SR04 Instances (Internal Vars & Bindings) ---');

const schemaNodes: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', data: { label: 'Arduino Uno' }, position: { x: 0, y: 0 } },
  { id: 'sensor_A', type: 'componentNode', data: { label: 'Ultrasonic Front' }, position: { x: 0, y: 0 } },
  { id: 'sensor_B', type: 'componentNode', data: { label: 'Ultrasonic Rear' }, position: { x: 0, y: 0 } }
];

const schemaEdges: Edge[] = [
  { id: 'se1', source: 'sensor_A', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd9' },
  { id: 'se2', source: 'sensor_A', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd10' },
  { id: 'se3', source: 'sensor_B', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd7' },
  { id: 'se4', source: 'sensor_B', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd8' }
];

const flowNodes: Node[] = [
  {
    id: 'start_node',
    type: 'baseNode',
    data: { nodeType: 'start', label: 'Start' },
    position: { x: 0, y: 0 }
  },
  {
    id: 'sensor_A',
    type: 'componentNode',
    data: {
      label: 'Ultrasonic Front',
      nodeType: 'ultrasonic',
      params: {
        packageId: 'ultrasonic_hcsr04',
        varDist: 'front_distance',
        trigPin: '9',
        echoPin: '10'
      }
    },
    position: { x: 200, y: 0 }
  },
  {
    id: 'sensor_B',
    type: 'componentNode',
    data: {
      label: 'Ultrasonic Rear',
      nodeType: 'ultrasonic',
      params: {
        packageId: 'ultrasonic_hcsr04',
        varDist: 'rear_distance',
        trigPin: '7',
        echoPin: '8'
      }
    },
    position: { x: 400, y: 0 }
  },
  {
    id: 'print_node',
    type: 'baseNode',
    data: {
      nodeType: 'print',
      params: { message: 'front_distance' }
    },
    position: { x: 600, y: 0 }
  }
];

const flowEdges: Edge[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_A', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe2', source: 'sensor_A', target: 'sensor_B', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe3', source: 'sensor_B', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

// Step A: Expand Component Graphs
const expanded = expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);

// T1 check: verify internal vars are unique (sensor_A_duration and sensor_B_duration)
const durationVars = expanded.nodes
  .map((n: Node) => (n.data as any)?.params?.var)
  .filter((v: any) => typeof v === 'string' && v.includes('duration'));

assert(
  durationVars.includes('sensor_A_duration') && durationVars.includes('sensor_B_duration'),
  'Expanded nodes contain distinct internal variables: "sensor_A_duration" and "sensor_B_duration"'
);

assert(
  !durationVars.includes('duration'),
  'Unscoped variable "duration" is NOT present in expanded graph'
);

// T2 check: verify calc_distance expression references namespaced variable
const calcExpA = expanded.nodes.find((n: Node) => n.id === 'sensor_A_calc_distance');
const calcExpB = expanded.nodes.find((n: Node) => n.id === 'sensor_B_calc_distance');

assert(
  (calcExpA?.data as any)?.params?.expression?.includes('sensor_A_duration'),
  'sensor_A calculation node expression correctly references "sensor_A_duration"'
);

assert(
  (calcExpB?.data as any)?.params?.expression?.includes('sensor_B_duration'),
  'sensor_B calculation node expression correctly references "sensor_B_duration"'
);

// Step B: Compile to AST and Generate C++
const compiler = new GraphToASTCompiler(expanded.nodes, expanded.edges, {}, {}, schemaNodes, schemaEdges);
const ast = compiler.compile();

const generator = new ArduinoUnoGenerator();
const arduinoResult = generator.generate(ast, schemaNodes, schemaEdges);
const cppCode = arduinoResult.main;

console.log('\n--- Generated C++ Code for Two HC-SR04 Instances ---');
console.log(cppCode);
console.log('-----------------------------------------------------\n');

// T3 & T4 check: output bindings preserved as front_distance and rear_distance
assert(
  cppCode.includes('front_distance =') && cppCode.includes('rear_distance ='),
  'T3/T4: Output variables "front_distance" and "rear_distance" preserved without namespacing'
);

assert(
  !cppCode.includes('sensor_A_front_distance') && !cppCode.includes('sensor_B_rear_distance'),
  'T3/T4: External outputs were NOT prefixed with instance names'
);

assert(
  cppCode.includes('sensor_A_duration') && cppCode.includes('sensor_B_duration'),
  'T1/T2: Generated C++ contains distinct internal variables "sensor_A_duration" and "sensor_B_duration"'
);

const durationDeclMatches = (cppCode.match(/sensor_[AB]_duration/g) || []);
assert(
  durationDeclMatches.length >= 4,
  'T1: Distinct references to sensor_A_duration and sensor_B_duration in generated C++'
);


// ─────────────────────────────────────────────────────────────────
// T5 — Existing Single HC-SR04 Regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Single HC-SR04 Instance Regression ---');

const singleNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start', label: 'Start' }, position: { x: 0, y: 0 } },
  {
    id: 'hcsr04_single',
    type: 'componentNode',
    data: {
      label: 'Ultrasonic Read',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'measured_distance', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  }
];

const singleEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'hcsr04_single', sourceHandle: 'flow', targetHandle: 'flow' }
];

const singleExpanded = expandComponentGraphs(singleNodes, singleEdges);
const singleCompiler = new GraphToASTCompiler(singleExpanded.nodes, singleExpanded.edges);
const singleAst = singleCompiler.compile();
const singleResult = generator.generate(singleAst, [], []);

assert(
  singleResult.main.includes('hcsr04_single_duration') && singleResult.main.includes('measured_distance ='),
  'T5: Single HC-SR04 instance compiles successfully with namespaced internal var'
);


// ─────────────────────────────────────────────────────────────────
// T7 — Compilation Determinism
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Compilation Determinism ---');

const compilePass1 = generator.generate(new GraphToASTCompiler(expanded.nodes, expanded.edges, {}, {}, schemaNodes, schemaEdges).compile(), schemaNodes, schemaEdges).main;
const compilePass2 = generator.generate(new GraphToASTCompiler(expanded.nodes, expanded.edges, {}, {}, schemaNodes, schemaEdges).compile(), schemaNodes, schemaEdges).main;

assert(
  compilePass1 === compilePass2,
  'T7: Repeated compilation produces 100% identical C++ code'
);

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}
