import { Node, Edge } from '@xyflow/react';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { getComponentPackage } from '../lib/registry/components';
import { instantiatePackageGraph } from '../lib/packages/packageGraphInstantiator';
import { PackageGraphInstance } from '../lib/registry/components/types';

console.log('=== TEST PHASE 5E: SUBFLOW INSTANCE OVERRIDE COMPILATION ===\n');

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

const generator = new ArduinoUnoGenerator();

// ─────────────────────────────────────────────────────────────────
// T1 — Pristine Package Compilation
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Pristine Package Compilation ---');

const schemaNodes: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', data: { label: 'Arduino Uno' }, position: { x: 0, y: 0 } },
  { id: 'sensor_front', type: 'componentNode', data: { label: 'Front Sensor' }, position: { x: 0, y: 0 } },
  { id: 'sensor_rear', type: 'componentNode', data: { label: 'Rear Sensor' }, position: { x: 0, y: 0 } },
];

const schemaEdges: Edge[] = [
  { id: 'se1', source: 'sensor_front', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd9' },
  { id: 'se2', source: 'sensor_front', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd10' },
  { id: 'se3', source: 'sensor_rear', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd7' },
  { id: 'se4', source: 'sensor_rear', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd8' },
];

const pristineFlowNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start', label: 'Start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_front',
    type: 'componentNode',
    data: {
      label: 'Front Sensor',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_front', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  },
  { id: 'print_node', type: 'baseNode', data: { nodeType: 'print', params: { message: 'dist_front' } }, position: { x: 400, y: 0 } }
];

const pristineFlowEdges: Edge[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe2', source: 'sensor_front', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const pristineCompiler = new GraphToASTCompiler(pristineFlowNodes, pristineFlowEdges, {}, {}, schemaNodes, schemaEdges);
const pristineAst = pristineCompiler.compile();
const pristineCode = generator.generate(pristineAst, schemaNodes, schemaEdges).main;

assert(pristineCode.includes('delayMicroseconds(2)'), 'T1: Pristine HC-SR04 contains standard delayMicroseconds(2)');
assert(pristineCode.includes('delayMicroseconds(10)'), 'T1: Pristine HC-SR04 contains standard delayMicroseconds(10)');
assert(pristineCode.includes('dist_front ='), 'T1: Pristine HC-SR04 assigns to dist_front');

// ─────────────────────────────────────────────────────────────────
// T2 — Modified Instance Compilation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Modified Instance Compilation ---');

// Instantiate a subflow instance for sensor_front and modify delay from 2us to 5us
const frontInstance: PackageGraphInstance = instantiatePackageGraph({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front'
});
frontInstance.unlocked = true;
frontInstance.dirty = true;

// Modify delay_2us duration to 5us
const delayNode = frontInstance.nodes.find(n => n.id === 'delay_2us');
if (delayNode && delayNode.data) {
  (delayNode.data as any).params.duration = '5';
}

const overrides: Record<string, PackageGraphInstance> = {
  subflow_ultrasonic_hcsr04_sensor_front: frontInstance
};

const modifiedCompiler = new GraphToASTCompiler(
  pristineFlowNodes,
  pristineFlowEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { subflowOverrides: overrides }
);
const modifiedAst = modifiedCompiler.compile();
const modifiedCode = generator.generate(modifiedAst, schemaNodes, schemaEdges).main;

assert(modifiedCode.includes('delayMicroseconds(5)'), 'T2: Generated C++ contains modified delayMicroseconds(5) for sensor_front');
assert(!modifiedCode.includes('delayMicroseconds(2)'), 'T2: Generated C++ does NOT contain original delayMicroseconds(2) for sensor_front');

// ─────────────────────────────────────────────────────────────────
// T3 — Package Immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Package Immutability ---');

const pkgTemplate = getComponentPackage('ultrasonic_hcsr04');
const templateGraph = (pkgTemplate?.implementation?.graph || pkgTemplate?.implementation?.subflow) as any;
const templateDelayNode = templateGraph?.nodes?.find((n: any) => n.id === 'delay_2us');

assert(
  templateDelayNode?.data?.params?.duration === '2',
  'T3: Original COMPONENT_REGISTRY package template delay remains "2" (100% immutable)'
);

// ─────────────────────────────────────────────────────────────────
// T4 — Instance Isolation (Front Modified, Rear Pristine)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Multi-Instance Isolation ---');

const multiFlowNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start', label: 'Start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_front',
    type: 'componentNode',
    data: {
      label: 'Front Sensor (Modified)',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_front', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  },
  {
    id: 'sensor_rear',
    type: 'componentNode',
    data: {
      label: 'Rear Sensor (Pristine)',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_rear', trigPin: '7', echoPin: '8' }
    },
    position: { x: 400, y: 0 }
  },
  { id: 'print_node', type: 'baseNode', data: { nodeType: 'print', params: { message: 'dist_rear' } }, position: { x: 600, y: 0 } }
];

const multiFlowEdges: Edge[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe2', source: 'sensor_front', target: 'sensor_rear', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe3', source: 'sensor_rear', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const multiCompiler = new GraphToASTCompiler(
  multiFlowNodes,
  multiFlowEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { subflowOverrides: overrides }
);
const multiAst = multiCompiler.compile();
const multiCode = generator.generate(multiAst, schemaNodes, schemaEdges).main;

assert(multiCode.includes('delayMicroseconds(5)'), 'T4: Front sensor executes modified 5us delay');
assert(multiCode.includes('delayMicroseconds(2)'), 'T4: Rear sensor executes pristine 2us delay');
assert(multiCode.includes('dist_front ='), 'T4: Front distance assigned');
assert(multiCode.includes('dist_rear ='), 'T4: Rear distance assigned');

// ─────────────────────────────────────────────────────────────────
// T5 — Canonical Package Identity (Label Independence)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Canonical Package Identity ---');

const customLabelNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_front',
    type: 'componentNode',
    data: {
      label: 'Random Arbitrary Sensor Label 123',
      nodeType: 'componentNode',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_front', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  }
];
const customLabelEdges: Edge[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_front', sourceHandle: 'flow', targetHandle: 'flow' }
];

const customLabelCompiler = new GraphToASTCompiler(
  customLabelNodes,
  customLabelEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { subflowOverrides: overrides }
);
const customLabelCode = generator.generate(customLabelCompiler.compile(), schemaNodes, schemaEdges).main;

assert(
  customLabelCode.includes('delayMicroseconds(5)'),
  'T5: Override resolved correctly regardless of arbitrary display label'
);

// ─────────────────────────────────────────────────────────────────
// T6 — Entry/Exit Preservation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Entry/Exit Preservation ---');

assert(frontInstance.entry === 'trig_low_1', 'T6: Instance entry is "trig_low_1"');
assert(frontInstance.exit === 'return_distance', 'T6: Instance exit is "return_distance"');

// ─────────────────────────────────────────────────────────────────
// T7 — Internal Variable Isolation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Internal Variable Isolation ---');

assert(multiCode.includes('sensor_front_duration'), 'T7: Namespaced variable sensor_front_duration present');
assert(multiCode.includes('sensor_rear_duration'), 'T7: Namespaced variable sensor_rear_duration present');
assert(!multiCode.includes('unsigned long duration;'), 'T7: Unscoped duration variable is not present');

// ─────────────────────────────────────────────────────────────────
// T8 — Pin Binding
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Pin Binding ---');

assert(multiCode.includes('digitalWrite(9, LOW)'), 'T8: Front sensor correctly bound to Pin 9 (TRIG)');
assert(multiCode.includes('pulseIn(10, HIGH)'), 'T8: Front sensor correctly bound to Pin 10 (ECHO)');
assert(multiCode.includes('digitalWrite(7, LOW)'), 'T8: Rear sensor correctly bound to Pin 7 (TRIG)');
assert(multiCode.includes('pulseIn(8, HIGH)'), 'T8: Rear sensor correctly bound to Pin 8 (ECHO)');

// ─────────────────────────────────────────────────────────────────
// T9 — Deterministic Compilation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Deterministic Compilation ---');

const pass1 = generator.generate(
  new GraphToASTCompiler(multiFlowNodes, multiFlowEdges, {}, {}, schemaNodes, schemaEdges, { subflowOverrides: overrides }).compile(),
  schemaNodes,
  schemaEdges
).main;

const pass2 = generator.generate(
  new GraphToASTCompiler(multiFlowNodes, multiFlowEdges, {}, {}, schemaNodes, schemaEdges, { subflowOverrides: overrides }).compile(),
  schemaNodes,
  schemaEdges
).main;

assert(pass1 === pass2, 'T9: Repeated compilation produces 100% byte-for-byte identical output');

// ─────────────────────────────────────────────────────────────────
// T10 — No Override Fallback
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: No Override Fallback ---');

const emptyOverridesCompiler = new GraphToASTCompiler(
  pristineFlowNodes,
  pristineFlowEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { subflowOverrides: {} }
);
const emptyOverridesCode = generator.generate(emptyOverridesCompiler.compile(), schemaNodes, schemaEdges).main;

assert(emptyOverridesCode.includes('delayMicroseconds(2)'), 'T10: Component without override falls back to package template');

// ─────────────────────────────────────────────────────────────────
// T11 — Builtin Package Non-Regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Builtin Package Non-Regression ---');

const builtinNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_analog',
    type: 'baseNode',
    data: {
      nodeType: 'sensor',
      params: { var: 'temperature', pin: 'A0' }
    },
    position: { x: 200, y: 0 }
  }
];
const builtinEdges: Edge[] = [
  { id: 'be1', source: 'start_node', target: 'sensor_analog', sourceHandle: 'flow', targetHandle: 'flow' }
];

const builtinCompiler = new GraphToASTCompiler(builtinNodes, builtinEdges, {}, {}, [], [], { subflowOverrides: overrides });
const builtinAst = builtinCompiler.compile();

assert(builtinAst.kind === 'Program', 'T11: Builtin package compiles to Program AST');
assert(builtinAst.body.length > 0, 'T11: Builtin package AST has body statements');

// ─────────────────────────────────────────────────────────────────
// T12 — Multiple Component Types
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Multiple Component Types Scoping ---');

const mixedNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_front',
    type: 'componentNode',
    data: { nodeType: 'ultrasonic', params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_front', trigPin: '9', echoPin: '10' } },
    position: { x: 200, y: 0 }
  },
  {
    id: 'sensor_analog',
    type: 'baseNode',
    data: { nodeType: 'sensor', params: { var: 'temperature', pin: 'A0' } },
    position: { x: 400, y: 0 }
  }
];
const mixedEdges: Edge[] = [
  { id: 'm1', source: 'start_node', target: 'sensor_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'm2', source: 'sensor_front', target: 'sensor_analog', sourceHandle: 'flow', targetHandle: 'flow' }
];

const mixedCompiler = new GraphToASTCompiler(mixedNodes, mixedEdges, {}, {}, schemaNodes, schemaEdges, { subflowOverrides: overrides });
const mixedCode = generator.generate(mixedCompiler.compile(), schemaNodes, schemaEdges).main;

assert(mixedCode.includes('delayMicroseconds(5)'), 'T12: Ultrasonic sensor used its modified override');
assert(mixedCode.includes('analogRead(A0)'), 'T12: Analog sensor compiled normally alongside modified subflow');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
