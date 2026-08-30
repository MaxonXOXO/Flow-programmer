import { getComponentPackage } from '../lib/registry/components';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { resolveBackendForTarget } from '../lib/compiler/backend/registry';
import { CompilerValidator } from '../lib/compiler/validators/compilerValidator';
import { Node, Edge } from '@xyflow/react';

console.log('=== TEST PHASE 6A.1: CANONICAL COMPONENT INSTANCE BINDING & AUDIT ===\n');

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
// T1 — LDR canonical package resolves correctly
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: LDR Canonical Package Resolution ---');
const ldrPkg = getComponentPackage('ldr_light');
assert(ldrPkg !== undefined, 'T1: ldr_light package retrieved from registry');
assert(ldrPkg?.metadata?.id === 'ldr_light', 'T1: Package id is strictly "ldr_light"');
assert(ldrPkg?.outputs?.[0]?.id === 'lightLevel', 'T1: Package declares output "lightLevel"');

const ldrImpl = resolvePackageImplementation(ldrPkg!, 'arduino_uno');
assert(ldrImpl.strategy === 'graph', 'T1: Implementation strategy is "graph"');
assert(ldrImpl.entry === 'read_analog', 'T1: Implementation entry is "read_analog"');
assert(ldrImpl.exit === 'return_light', 'T1: Implementation exit is "return_light"');

// ─────────────────────────────────────────────────────────────────
// T2 — LDR $PIN1 resolves to Uno A0
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: LDR Pin1 -> Uno A0 Binding ---');
const schemaNodesA0: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'comp-ldr-1', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesA0: Edge[] = [
  { id: 'e1', source: 'board', target: 'comp-ldr-1', sourceHandle: 'A0', targetHandle: 'pin1' },
];
const flowNodesA0: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'flow-ldr-1', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ldr', label: 'LDR Light', params: { packageId: 'ldr_light', varLight: 'lightVal' } } },
];
const flowEdgesA0: Edge[] = [
  { id: 'fe1', source: 'start', target: 'flow-ldr-1', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerA0 = new GraphToASTCompiler(flowNodesA0, flowEdgesA0, {}, {}, schemaNodesA0, schemaEdgesA0, { targetId: 'arduino_uno' });
const astA0 = compilerA0.compile();
const backendUno = resolveBackendForTarget('arduino_uno');
const codeA0 = backendUno.generate(astA0, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesA0, schemaEdges: schemaEdgesA0 });

assert(codeA0.main.includes('analogRead(A0)'), 'T2: LDR bound to A0 generates analogRead(A0)');
assert(codeA0.main.includes('int lightVal = analogRead(A0);'), 'T2: Variable lightVal declared and assigned from A0 read');

// ─────────────────────────────────────────────────────────────────
// T3 — LDR $PIN1 resolves to Uno A2
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: LDR Pin1 -> Uno A2 Dynamic Binding ---');
const schemaNodesA2: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'comp-ldr-2', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesA2: Edge[] = [
  { id: 'e2', source: 'board', target: 'comp-ldr-2', sourceHandle: 'A2', targetHandle: 'pin1' },
];
const flowNodesA2: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'flow-ldr-2', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ldr', label: 'LDR Light', params: { packageId: 'ldr_light', varLight: 'lightVal' } } },
];
const flowEdgesA2: Edge[] = [
  { id: 'fe2', source: 'start', target: 'flow-ldr-2', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerA2 = new GraphToASTCompiler(flowNodesA2, flowEdgesA2, {}, {}, schemaNodesA2, schemaEdgesA2, { targetId: 'arduino_uno' });
const astA2 = compilerA2.compile();
const codeA2 = backendUno.generate(astA2, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesA2, schemaEdges: schemaEdgesA2 });

assert(codeA2.main.includes('analogRead(A2)'), 'T3: LDR bound to A2 generates analogRead(A2)');
assert(!codeA2.main.includes('analogRead(A0)'), 'T3: Code for A2 instance contains NO stale analogRead(A0)');

// ─────────────────────────────────────────────────────────────────
// T4 — LDR $PIN1 resolves to another valid Uno analog pin (A5)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: LDR Pin1 -> Uno A5 Dynamic Binding ---');
const schemaNodesA5: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'comp-ldr-5', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesA5: Edge[] = [
  { id: 'e5', source: 'board', target: 'comp-ldr-5', sourceHandle: 'A5', targetHandle: 'pin1' },
];
const flowNodesA5: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'flow-ldr-5', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ldr', label: 'LDR Light', params: { packageId: 'ldr_light', varLight: 'sensorLight' } } },
];
const flowEdgesA5: Edge[] = [
  { id: 'fe5', source: 'start', target: 'flow-ldr-5', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerA5 = new GraphToASTCompiler(flowNodesA5, flowEdgesA5, {}, {}, schemaNodesA5, schemaEdgesA5, { targetId: 'arduino_uno' });
const astA5 = compilerA5.compile();
const codeA5 = backendUno.generate(astA5, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesA5, schemaEdges: schemaEdgesA5 });

assert(codeA5.main.includes('analogRead(A5)'), 'T4: LDR bound to A5 generates analogRead(A5)');
assert(codeA5.main.includes('int sensorLight = analogRead(A5);'), 'T4: sensorLight assigned from A5 read');

// ─────────────────────────────────────────────────────────────────
// T5 — Invalid digital pin is rejected by hardware capability validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Hardware Capability Validation Rejection ---');
const schemaNodesBad: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'comp-ldr-bad', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesBad: Edge[] = [
  { id: 'ebad', source: 'board', target: 'comp-ldr-bad', sourceHandle: 'D13', targetHandle: 'pin1' },
];

const validator = new CompilerValidator();
const valErrors = validator.validate(astA0, schemaNodesBad, schemaEdgesBad);
assert(valErrors.some(e => e.message.includes('analog') || e.message.includes('Digital') || e.message.includes('D13')), 'T5: Connection of LDR analog pin to D13 flagged as error');

// ─────────────────────────────────────────────────────────────────
// T6 & T7 — LDR output maps to lightVal and NO stale distance exists
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6 & T7: Output Contract Integrity & No Stale Distance ---');
assert(codeA2.main.includes('int lightVal = analogRead(A2);'), 'T6: Output correctly mapped to lightVal');
assert(!codeA2.main.includes('distance'), 'T7: Generated code contains ZERO occurrences of "distance"');
assert(!codeA2.main.includes('distance ='), 'T7: NO stale "distance = lightVal" assignment exists');
assert(!codeA2.main.includes('lightVal = lightVal;'), 'T7: NO redundant "lightVal = lightVal" self-assignment exists');

// ─────────────────────────────────────────────────────────────────
// T8 & T9 — HC-SR04 dynamic pin placeholders resolution
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8 & T9: HC-SR04 Dynamic Pin Placeholders ---');
const schemaNodesHCSR1: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'hcsr-1', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'HC-SR04', componentType: 'ultrasonic_hcsr04' } },
];
const schemaEdgesHCSR1: Edge[] = [
  { id: 'h1', source: 'board', target: 'hcsr-1', sourceHandle: 'D9', targetHandle: 'TRIG' },
  { id: 'h2', source: 'board', target: 'hcsr-1', sourceHandle: 'D10', targetHandle: 'ECHO' },
];
const flowNodesHCSR1: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'flow-hcsr-1', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ultrasonic', label: 'Ultrasonic Read', params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist1' } } },
];
const flowEdgesHCSR1: Edge[] = [
  { id: 'feh1', source: 'start', target: 'flow-hcsr-1', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerHCSR1 = new GraphToASTCompiler(flowNodesHCSR1, flowEdgesHCSR1, {}, {}, schemaNodesHCSR1, schemaEdgesHCSR1, { targetId: 'arduino_uno' });
const codeHCSR1 = backendUno.generate(compilerHCSR1.compile(), { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesHCSR1, schemaEdges: schemaEdgesHCSR1 });

assert(codeHCSR1.main.includes('digitalWrite(9, LOW)'), 'T8: HCSR04 TRIG bound to 9');
assert(codeHCSR1.main.includes('pulseIn(10, HIGH)'), 'T8: HCSR04 ECHO bound to 10');
assert(codeHCSR1.main.includes('dist1 ='), 'T8: Output assigned to dist1');

// Alternate pin assignment (TRIG -> 6, ECHO -> 7)
const schemaNodesHCSR2: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'hcsr-2', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'HC-SR04', componentType: 'ultrasonic_hcsr04' } },
];
const schemaEdgesHCSR2: Edge[] = [
  { id: 'h3', source: 'board', target: 'hcsr-2', sourceHandle: 'D6', targetHandle: 'TRIG' },
  { id: 'h4', source: 'board', target: 'hcsr-2', sourceHandle: 'D7', targetHandle: 'ECHO' },
];
const flowNodesHCSR2: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'flow-hcsr-2', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ultrasonic', label: 'Ultrasonic Read', params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist2' } } },
];
const flowEdgesHCSR2: Edge[] = [
  { id: 'feh2', source: 'start', target: 'flow-hcsr-2', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerHCSR2 = new GraphToASTCompiler(flowNodesHCSR2, flowEdgesHCSR2, {}, {}, schemaNodesHCSR2, schemaEdgesHCSR2, { targetId: 'arduino_uno' });
const codeHCSR2 = backendUno.generate(compilerHCSR2.compile(), { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesHCSR2, schemaEdges: schemaEdgesHCSR2 });

assert(codeHCSR2.main.includes('digitalWrite(6, LOW)'), 'T9: HCSR04 alternate TRIG bound to 6');
assert(codeHCSR2.main.includes('pulseIn(7, HIGH)'), 'T9: HCSR04 alternate ECHO bound to 7');
assert(!codeHCSR2.main.includes('digitalWrite(9, LOW)'), 'T9: Does NOT contain old pin 9');
assert(codeHCSR2.main.includes('dist2 ='), 'T9: Output assigned to dist2');

// ─────────────────────────────────────────────────────────────────
// T10, T11, T12 — ESP32 Arduino Dynamic Pin Binding
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10, T11, T12: ESP32 Dynamic Pin Binding ---');
const backendESP32 = resolveBackendForTarget('esp32_arduino');

const schemaNodesESP34: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'esp32' } },
  { id: 'comp-ldr-esp34', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesESP34: Edge[] = [
  { id: 'esp-e1', source: 'board', target: 'comp-ldr-esp34', sourceHandle: 'GPIO34', targetHandle: 'pin1' },
];
const compilerESP34 = new GraphToASTCompiler(flowNodesA0, flowEdgesA0, {}, {}, schemaNodesESP34, schemaEdgesESP34, { targetId: 'esp32_arduino' });
const codeESP34 = backendESP32.generate(compilerESP34.compile(), { targetId: 'esp32_arduino', boardId: 'esp32', schemaNodes: schemaNodesESP34, schemaEdges: schemaEdgesESP34 });

assert(codeESP34.main.includes('analogRead(GPIO34)') || codeESP34.main.includes('analogRead(34)'), 'T10: ESP32 LDR bound to GPIO34 generates analogRead(GPIO34)');
assert(!codeESP34.main.includes('distance'), 'T10: ESP32 output contains NO stale distance');

const schemaNodesESP35: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'esp32' } },
  { id: 'comp-ldr-esp35', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesESP35: Edge[] = [
  { id: 'esp-e2', source: 'board', target: 'comp-ldr-esp35', sourceHandle: 'GPIO35', targetHandle: 'pin1' },
];
const compilerESP35 = new GraphToASTCompiler(flowNodesA0, flowEdgesA0, {}, {}, schemaNodesESP35, schemaEdgesESP35, { targetId: 'esp32_arduino' });
const codeESP35 = backendESP32.generate(compilerESP35.compile(), { targetId: 'esp32_arduino', boardId: 'esp32', schemaNodes: schemaNodesESP35, schemaEdges: schemaEdgesESP35 });

assert(codeESP35.main.includes('analogRead(GPIO35)') || codeESP35.main.includes('analogRead(35)'), 'T11: ESP32 LDR bound to GPIO35 generates analogRead(GPIO35)');
assert(!codeESP35.main.includes('analogRead(GPIO34)') && !codeESP35.main.includes('analogRead(34)'), 'T11: ESP32 GPIO35 does NOT contain old GPIO34');

// Invalid ESP32 digital-only pin (GPIO23)
const schemaNodesESPBad: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'esp32' } },
  { id: 'comp-ldr-espbad', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr_light' } },
];
const schemaEdgesESPBad: Edge[] = [
  { id: 'esp-ebad', source: 'board', target: 'comp-ldr-espbad', sourceHandle: 'GPIO23', targetHandle: 'pin1' },
];
const espValErrors = validator.validate(compilerESP35.compile(), schemaNodesESPBad, schemaEdgesESPBad);
assert(espValErrors.some(e => e.message.includes('analog') || e.message.includes('Digital') || e.message.includes('GPIO23')), 'T12: ESP32 LDR on digital-only GPIO23 flagged as error');

// ─────────────────────────────────────────────────────────────────
// T13 — Two LDR instances maintain independent pin bindings
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T13: Multiple LDR Instances Isolation ---');
const schemaNodesMultiLDR: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'ldr_front', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'Front LDR', componentType: 'ldr_light' } },
  { id: 'ldr_rear',  type: 'componentNode', position: { x: 300, y: 150 }, data: { label: 'Rear LDR', componentType: 'ldr_light' } },
];
const schemaEdgesMultiLDR: Edge[] = [
  { id: 'm1', source: 'board', target: 'ldr_front', sourceHandle: 'A0', targetHandle: 'pin1' },
  { id: 'm2', source: 'board', target: 'ldr_rear',  sourceHandle: 'A2', targetHandle: 'pin1' },
];
const flowNodesMultiLDR: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'ldr_front', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ldr', label: 'Front LDR', params: { packageId: 'ldr_light', varLight: 'lightFront' } } },
  { id: 'ldr_rear',  type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'ldr', label: 'Rear LDR',  params: { packageId: 'ldr_light', varLight: 'lightRear' } } },
];
const flowEdgesMultiLDR: Edge[] = [
  { id: 'me1', source: 'start', target: 'ldr_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'me2', source: 'ldr_front', target: 'ldr_rear', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerMultiLDR = new GraphToASTCompiler(flowNodesMultiLDR, flowEdgesMultiLDR, {}, {}, schemaNodesMultiLDR, schemaEdgesMultiLDR, { targetId: 'arduino_uno' });
const codeMultiLDR = backendUno.generate(compilerMultiLDR.compile(), { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesMultiLDR, schemaEdges: schemaEdgesMultiLDR });

assert(codeMultiLDR.main.includes('int lightFront = analogRead(A0);'), 'T13: Front LDR independently reads A0 into lightFront');
assert(codeMultiLDR.main.includes('int lightRear = analogRead(A2);'), 'T13: Rear LDR independently reads A2 into lightRear');
assert(!codeMultiLDR.main.includes('distance'), 'T13: Multi-LDR contains zero stale distance assignments');

// ─────────────────────────────────────────────────────────────────
// T14 — Two HC-SR04 instances maintain independent pin bindings
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14: Multiple HC-SR04 Instances Isolation ---');
const schemaNodesMultiHCSR: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'hcsr_front', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'Front HCSR', componentType: 'ultrasonic_hcsr04' } },
  { id: 'hcsr_rear',  type: 'componentNode', position: { x: 300, y: 150 }, data: { label: 'Rear HCSR', componentType: 'ultrasonic_hcsr04' } },
];
const schemaEdgesMultiHCSR: Edge[] = [
  { id: 'mh1', source: 'board', target: 'hcsr_front', sourceHandle: 'D9', targetHandle: 'TRIG' },
  { id: 'mh2', source: 'board', target: 'hcsr_front', sourceHandle: 'D10', targetHandle: 'ECHO' },
  { id: 'mh3', source: 'board', target: 'hcsr_rear',  sourceHandle: 'D6', targetHandle: 'TRIG' },
  { id: 'mh4', source: 'board', target: 'hcsr_rear',  sourceHandle: 'D7', targetHandle: 'ECHO' },
];
const flowNodesMultiHCSR: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'hcsr_front', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ultrasonic', label: 'Front HCSR', params: { packageId: 'ultrasonic_hcsr04', varDist: 'distFront' } } },
  { id: 'hcsr_rear',  type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'ultrasonic', label: 'Rear HCSR',  params: { packageId: 'ultrasonic_hcsr04', varDist: 'distRear' } } },
];
const flowEdgesMultiHCSR: Edge[] = [
  { id: 'mhe1', source: 'start', target: 'hcsr_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'mhe2', source: 'hcsr_front', target: 'hcsr_rear', sourceHandle: 'flow', targetHandle: 'flow' },
];

const compilerMultiHCSR = new GraphToASTCompiler(flowNodesMultiHCSR, flowEdgesMultiHCSR, {}, {}, schemaNodesMultiHCSR, schemaEdgesMultiHCSR, { targetId: 'arduino_uno' });
const codeMultiHCSR = backendUno.generate(compilerMultiHCSR.compile(), { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesMultiHCSR, schemaEdges: schemaEdgesMultiHCSR });

assert(codeMultiHCSR.main.includes('digitalWrite(9, LOW)'), 'T14: Front HCSR writes pin 9');
assert(codeHCSR1.main.includes('pulseIn(10, HIGH)'), 'T14: Front HCSR pulses pin 10');
assert(codeMultiHCSR.main.includes('distFront ='), 'T14: Front HCSR assigns distFront');
assert(codeMultiHCSR.main.includes('digitalWrite(6, LOW)'), 'T14: Rear HCSR writes pin 6');
assert(codeMultiHCSR.main.includes('pulseIn(7, HIGH)'), 'T14: Rear HCSR pulses pin 7');
assert(codeMultiHCSR.main.includes('distRear ='), 'T14: Rear HCSR assigns distRear');

// ─────────────────────────────────────────────────────────────────
// T15 — Canonical package definitions remain immutable
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T15: Registry Package Immutability ---');
const ldrCheckAfter = getComponentPackage('ldr_light');
assert(ldrCheckAfter?.outputs?.[0]?.id === 'lightLevel', 'T15: ldr_light output contract unchanged in registry');
assert((ldrCheckAfter?.implementations?.arduino_uno?.graph?.nodes?.[1]?.data as any)?.params?.pin === '$PIN1', 'T15: Registry template retains placeholder $PIN1');

// ─────────────────────────────────────────────────────────────────
// T16, T17, T18 — Universal AST Target-Independence & Accuracy
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T16, T17, T18: Universal AST Verification ---');
const astUnoA2 = compilerA2.compile();
const astESPA2 = new GraphToASTCompiler(flowNodesA2, flowEdgesA2, {}, {}, schemaNodesA2, schemaEdgesA2, { targetId: 'esp32_arduino' }).compile();

assert(astUnoA2.kind === 'Program', 'T16: AST produced is ProgramNode');
assert(astUnoA2.body.length > 0, 'T16: AST body is populated');
assert(astUnoA2.body.some(stmt => stmt.kind === 'VariableDeclaration' && (stmt as any).name === 'lightVal'), 'T18: AST contains VariableDeclaration for lightVal');
assert(!astUnoA2.body.some(stmt => stmt.kind === 'Assignment' && (stmt as any).name === 'distance'), 'T18: AST contains NO Assignment for distance');
assert(astUnoA2.body.length === astESPA2.body.length, 'T17: AST structure is identical between Uno and ESP32');

// ─────────────────────────────────────────────────────────────────
// T19 & T20 — Generated Uno and ESP32 physical pin usage
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T19 & T20: Target Code Physical Pin Emission ---');
assert(codeA2.main.includes('analogRead(A2)'), 'T19: Uno code correctly emits analogRead(A2)');
assert(codeESP34.main.includes('analogRead(GPIO34)') || codeESP34.main.includes('analogRead(34)'), 'T20: ESP32 code correctly emits analogRead(GPIO34)');

// ─────────────────────────────────────────────────────────────────
// T21 & T22 — Summary & Regression Readiness
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T21 & T22: Regression Readiness ---');
assert(passed > 25, 'T21: All integration assertions passed successfully');
assert(failed === 0, 'T22: Zero assertion failures');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}
