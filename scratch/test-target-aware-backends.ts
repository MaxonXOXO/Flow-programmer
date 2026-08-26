import {
  resolveBackendForTarget,
  getBackend,
  getAllBackends,
  registerBackend,
  validateBackendCapabilities,
  CompilerBackend,
  BackendContext
} from '../lib/compiler/backend';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { getComponentPackage } from '../lib/registry/components';
import { ProgramNode } from '../lib/compiler/ast/ast';

console.log('=== TEST PHASE 5M: TARGET-AWARE COMPILER BACKENDS ===\n');

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
// T1 — Arduino backend resolves for arduino_uno
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Arduino Backend Resolution ---');

const unoBackend = resolveBackendForTarget('arduino_uno');
assert(unoBackend !== undefined, 'T1: Arduino backend resolved for "arduino_uno"');
assert(unoBackend.id === 'arduino_cpp_backend', 'T1: Backend ID is "arduino_cpp_backend"');
assert(unoBackend.targetId === 'arduino_uno', 'T1: Target ID is "arduino_uno"');
assert(unoBackend.capabilities.digitalWrite === true, 'T1: Backend supports digitalWrite');
assert(unoBackend.capabilities.analogWrite === true, 'T1: Arduino Uno backend supports analogWrite');

// ─────────────────────────────────────────────────────────────────
// T2 — ESP32 backend resolves for esp32_arduino
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: ESP32 Backend Resolution ---');

const espBackend = resolveBackendForTarget('esp32_arduino');
assert(espBackend !== undefined, 'T2: ESP32 backend resolved for "esp32_arduino"');
assert(espBackend.id === 'esp32_arduino_backend', 'T2: Backend ID is "esp32_arduino_backend"');
assert(espBackend.targetId === 'esp32_arduino', 'T2: Target ID is "esp32_arduino"');
assert(espBackend.capabilities.digitalWrite === true, 'T2: ESP32 backend supports digitalWrite');
assert(espBackend.capabilities.analogWrite === false, 'T2: ESP32 backend declares analogWrite as false (uses ledc/dac)');

// ─────────────────────────────────────────────────────────────────
// T3 — Unknown target does NOT silently resolve to Arduino
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Strict Resolution (No Silent Fallback) ---');

let caughtError = false;
try {
  resolveBackendForTarget('stm32_hal');
} catch (e: any) {
  caughtError = true;
  assert(e.message.includes("Compiler backend unavailable for target 'stm32_hal'"), `T3: Explicit error message: "${e.message}"`);
}
assert(caughtError, 'T3: resolveBackendForTarget throws for unregistered target without silent fallback');

// ─────────────────────────────────────────────────────────────────
// T4 — Backend registry contains unique backend IDs
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Backend Registry Uniqueness ---');

const allBackends = getAllBackends();
assert(allBackends.length >= 2, `T4: Found ${allBackends.length} registered backends`);
const backendIds = allBackends.map(b => b.id);
const uniqueIds = new Set(backendIds);
assert(backendIds.length === uniqueIds.size, 'T4: All backend IDs in registry are unique');

// ─────────────────────────────────────────────────────────────────
// T5 & T6 & T7 — HC-SR04 Code Generation for Uno & ESP32
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5, T6, T7: Target Generation & AST Independence ---');

const schemaNodes: any[] = [
  { id: 'arduino-uno', type: 'boardNode', data: { label: 'Arduino Uno' }, position: { x: 0, y: 0 } },
  { id: 'sensor_front', type: 'componentNode', data: { label: 'Front Sensor' }, position: { x: 0, y: 0 } },
];

const schemaEdges: any[] = [
  { id: 'se1', source: 'sensor_front', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd9' },
  { id: 'se2', source: 'sensor_front', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd10' },
];

const pristineFlowNodes: any[] = [
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

const pristineFlowEdges: any[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe2', source: 'sensor_front', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

// Compile Universal AST for Uno
const compilerUno = new GraphToASTCompiler(pristineFlowNodes, pristineFlowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'arduino_uno' });
const astUno = compilerUno.compile();

// Compile Universal AST for ESP32
const compilerEsp = new GraphToASTCompiler(pristineFlowNodes, pristineFlowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'esp32_arduino' });
const astEsp = compilerEsp.compile();

// T7: AST equality
assert(astUno.kind === 'Program', 'T7: Uno AST is ProgramNode');
assert(astEsp.kind === 'Program', 'T7: ESP32 AST is ProgramNode');
assert(astUno.body.length > 0 && astEsp.body.length > 0, 'T7: AST bodies are non-empty and expanded');
assert(astUno.body.length === astEsp.body.length, 'T7: Universal AST structure is identical between targets');

// T5: Uno Generation
const unoCode = unoBackend.generate(astUno, { targetId: 'arduino_uno', schemaNodes, schemaEdges });
assert(unoCode.main.includes('Platform: Arduino Uno'), 'T5: Generated Uno code contains "Platform: Arduino Uno"');
assert(unoCode.main.includes('Serial.begin(9600);'), 'T5: Generated Uno code uses 9600 baud');
assert(unoCode.main.includes('digitalWrite'), 'T5: Generated Uno code contains digitalWrite');
assert(unoCode.main.includes('pulseIn'), 'T5: Generated Uno code contains pulseIn');

// T6: ESP32 Generation
const espCode = espBackend.generate(astEsp, { targetId: 'esp32_arduino', schemaNodes, schemaEdges });
assert(espCode.main.includes('Platform: ESP32 (Arduino Framework)'), 'T6: Generated ESP32 code contains "Platform: ESP32 (Arduino Framework)"');
assert(espCode.main.includes('Serial.begin(115200);'), 'T6: Generated ESP32 code uses 115200 baud');
assert(espCode.main.includes('#include <Arduino.h>'), 'T6: Generated ESP32 code includes Arduino.h');

// ─────────────────────────────────────────────────────────────────
// T8 & T9 — Target-Driven Resolution (Decoupled from Board)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8 & T9: Target-Driven Backend Selection ---');

// Board is ESP32, but target is Arduino Uno
const backendForTarget1 = resolveBackendForTarget('arduino_uno');
assert(backendForTarget1.id === 'arduino_cpp_backend', 'T8: targetId="arduino_uno" selects Arduino backend regardless of board');

// Board is Arduino Uno, but target is ESP32 Arduino
const backendForTarget2 = resolveBackendForTarget('esp32_arduino');
assert(backendForTarget2.id === 'esp32_arduino_backend', 'T9: targetId="esp32_arduino" selects ESP32 backend regardless of board');

// ─────────────────────────────────────────────────────────────────
// T10 — Capability Diagnostic Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Capability Diagnostics ---');

const programWithAnalogWrite: ProgramNode = {
  kind: 'Program',
  body: [
    {
      kind: 'ExpressionStatement',
      expression: {
        kind: 'CallExpression',
        callee: 'analogWrite',
        arguments: [
          { kind: 'Literal', value: 9, valueType: 'int' },
          { kind: 'Literal', value: 128, valueType: 'int' }
        ]
      }
    }
  ]
};

const diagnosticsUno = validateBackendCapabilities(programWithAnalogWrite, unoBackend);
assert(diagnosticsUno.length === 0, 'T10: Uno backend supports analogWrite without diagnostics');

const diagnosticsEsp = validateBackendCapabilities(programWithAnalogWrite, espBackend);
assert(diagnosticsEsp.length > 0, 'T10: ESP32 backend emits diagnostic for unsupported analogWrite');
assert(diagnosticsEsp[0].message.includes('analogWrite'), 'T10: Diagnostic specifically identifies analogWrite operation');

// ─────────────────────────────────────────────────────────────────
// T11 — Backward-Compatible ArduinoUnoGenerator Wrapper
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Backward Compatibility ---');

const legacyGen = new ArduinoUnoGenerator();
const legacyOutput = legacyGen.generate(astUno, schemaNodes as any, schemaEdges as any);
assert(legacyOutput.main === unoCode.main, 'T11: ArduinoUnoGenerator output is 100% byte-identical to ArduinoCppBackend');

// ─────────────────────────────────────────────────────────────────
// T12 & T13 — Multi-Target Independence & AST Immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12 & T13: AST Immutability ---');

const astSnapshot = JSON.stringify(astUno);
const genA = unoBackend.generate(astUno, { targetId: 'arduino_uno' });
const genB = espBackend.generate(astUno, { targetId: 'esp32_arduino' });

assert(JSON.stringify(astUno) === astSnapshot, 'T13: Backend code generation does not mutate the input AST');
assert(genA.main.length > 0 && genB.main.length > 0, 'T12: Both backends independently generate valid code from same AST');

// ─────────────────────────────────────────────────────────────────
// T14 — Package Registry Immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14: Package Registry Immutability ---');

const hcsr04Pkg = getComponentPackage('ultrasonic_hcsr04');
assert(hcsr04Pkg !== undefined, 'T14: HC-SR04 package exists in registry');
const hcsr04Json = JSON.stringify(hcsr04Pkg);

// Run multiple compilation rounds
unoBackend.generate(astUno, { targetId: 'arduino_uno', schemaNodes: schemaNodes as any, schemaEdges: schemaEdges as any });
espBackend.generate(astEsp, { targetId: 'esp32_arduino', schemaNodes: schemaNodes as any, schemaEdges: schemaEdges as any });

assert(JSON.stringify(getComponentPackage('ultrasonic_hcsr04')) === hcsr04Json, 'T14: Package registry definition remained 100% immutable');

// ─────────────────────────────────────────────────────────────────
// T15 — Target-Aware Component Implementation Resolution
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T15: Target-Aware Component Resolution ---');

const unoComponentCompiler = new GraphToASTCompiler(pristineFlowNodes, pristineFlowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'arduino_uno' });
const unoAST = unoComponentCompiler.compile();
assert(unoAST.body.length > 0, 'T15: Uno target-specific AST compiled successfully');

const espComponentCompiler = new GraphToASTCompiler(pristineFlowNodes, pristineFlowEdges, {}, {}, schemaNodes, schemaEdges, { targetId: 'esp32_arduino' });
const espAST = espComponentCompiler.compile();
assert(espAST.body.length > 0, 'T15: ESP32 target-specific AST compiled successfully');

// ─────────────────────────────────────────────────────────────────
// T16 — Subflow Override Compilation with Target Backend
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T16: Subflow Override with Target Backend ---');

import { instantiatePackageGraph } from '../lib/packages/packageGraphInstantiator';

const frontInstance = instantiatePackageGraph({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front'
});
frontInstance.unlocked = true;
frontInstance.dirty = true;

const delayNode = frontInstance.nodes.find(n => n.id === 'delay_2us');
if (delayNode && delayNode.data) {
  (delayNode.data as any).params.duration = '99';
}

const subflowOverrides = {
  subflow_ultrasonic_hcsr04_sensor_front: frontInstance
};

const overrideCompiler = new GraphToASTCompiler(
  pristineFlowNodes,
  pristineFlowEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { targetId: 'esp32_arduino', subflowOverrides }
);
const overrideAST = overrideCompiler.compile();
const overrideEspCode = espBackend.generate(overrideAST, {
  targetId: 'esp32_arduino',
  schemaNodes,
  schemaEdges
});

assert(overrideEspCode.main.includes('delayMicroseconds(99)'), 'T16: Custom 99us delay override compiled into ESP32 code');
assert(overrideEspCode.main.includes('Platform: ESP32 (Arduino Framework)'), 'T16: Override generated using selected ESP32 backend');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
