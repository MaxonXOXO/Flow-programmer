import { createNewProject, exportProjectFromState, importProject, serializeProject } from '../lib/project/projectManager';
import { validateProjectHardware, getDefaultTargetForBoard } from '../lib/project/hardwareValidator';
import { validateProjectSchema, CURRENT_PROJECT_VERSION } from '../lib/project/projectSchema';
import { useFlowStore } from '../store/userFlowStore';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { getComponentPackage } from '../lib/registry/components';
import { getBoard, getTarget } from '../lib/registry/boards';

console.log('=== TEST PHASE 5L-A: PROJECT HARDWARE CONTRACT ===\n');

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
// T1 — New Project Hardware Contract
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: New Project Hardware Creation ---');

const unoProj = createNewProject('My Uno Project', 'arduino_uno');
assert(unoProj.version === CURRENT_PROJECT_VERSION, `T1: Project version is ${CURRENT_PROJECT_VERSION}`);
assert(unoProj.hardware.boardId === 'arduino_uno', 'T1: hardware.boardId is "arduino_uno"');
assert(unoProj.hardware.targetId === 'arduino_uno', 'T1: hardware.targetId is "arduino_uno"');

const espProj = createNewProject('My ESP32 Project', 'esp32_devkit_c', 'esp32_arduino');
assert(espProj.hardware.boardId === 'esp32_devkit_c', 'T1: ESP32 project boardId is "esp32_devkit_c"');
assert(espProj.hardware.targetId === 'esp32_arduino', 'T1: ESP32 project targetId is "esp32_arduino"');

// ─────────────────────────────────────────────────────────────────
// T2 — Hardware & MCU Compatibility Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Hardware & MCU Compatibility Validation ---');

// Compatible: Uno Board (atmega328p) + Uno Target (atmega328p)
const validUnoHw = validateProjectHardware({ boardId: 'arduino_uno', targetId: 'arduino_uno' });
assert(validUnoHw.valid === true, 'T2: Uno Board + Uno Target is valid');
assert(validUnoHw.board?.id === 'arduino_uno', 'T2: Resolved Uno board');
assert(validUnoHw.target?.id === 'arduino_uno', 'T2: Resolved Uno target');

// Compatible: ESP32 Board (esp32_wroom_32) + ESP32 Arduino Target (esp32_wroom_32)
const validEspHw = validateProjectHardware({ boardId: 'esp32', targetId: 'esp32_arduino' });
assert(validEspHw.valid === true, 'T2: ESP32 Board + ESP32 Target is valid');

// Incompatible: ESP32 Board (Xtensa) + Arduino Uno Target (AVR)
const invalidMcuHw = validateProjectHardware({ boardId: 'esp32', targetId: 'arduino_uno' });
assert(invalidMcuHw.valid === false, 'T2: ESP32 Board + Uno Target is INCOMPATIBLE');
assert(invalidMcuHw.errors.some(e => e.includes('Hardware Incompatibility')), 'T2: Diagnostic reports architecture incompatibility error');

// Universal: STM32 Board + Generic Target
const validGenericHw = validateProjectHardware({ boardId: 'stm32_bluepill', targetId: 'generic' });
assert(validGenericHw.valid === true, 'T2: STM32 Board + Generic Target is valid (universal)');

// ─────────────────────────────────────────────────────────────────
// T3 — Default Target Resolution for Boards
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Default Target Resolution for Boards ---');

assert(getDefaultTargetForBoard('arduino_uno') === 'arduino_uno', 'T3: Uno default target is "arduino_uno"');
assert(getDefaultTargetForBoard('arduino_mega_2560') === 'arduino_mega', 'T3: Mega default target is "arduino_mega"');
assert(getDefaultTargetForBoard('esp32') === 'esp32_arduino', 'T3: ESP32 default target is "esp32_arduino"');
assert(getDefaultTargetForBoard('nodemcu_v2') === 'esp8266_arduino', 'T3: NodeMCU default target is "esp8266_arduino"');
assert(getDefaultTargetForBoard('stm32_bluepill') === 'stm32_arduino', 'T3: BluePill default target is "stm32_arduino"');
assert(getDefaultTargetForBoard('raspberry_pi_pico') === 'pico_sdk', 'T3: Pico default target is "pico_sdk"');

// ─────────────────────────────────────────────────────────────────
// T4 — Project Export & Serialization
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Project Export & Serialization ---');

const exported = exportProjectFromState({
  project: {
    name: 'Smart Irrigation',
    platform: 'esp32',
    hardware: { boardId: 'esp32', targetId: 'esp32_arduino' },
    createdAt: Date.now(),
  },
  schemaNodes: [],
  schemaEdges: [],
});

assert(exported.version === CURRENT_PROJECT_VERSION, 'T4: Exported project version is 2');
assert(exported.hardware !== undefined, 'T4: Exported project contains "hardware" object');
assert(exported.hardware.boardId === 'esp32', 'T4: Exported hardware.boardId is "esp32"');
assert(exported.hardware.targetId === 'esp32_arduino', 'T4: Exported hardware.targetId is "esp32_arduino"');

const jsonString = serializeProject(exported);
assert(jsonString.includes('"hardware": {'), 'T4: JSON string contains "hardware" block');
assert(jsonString.includes('"targetId": "esp32_arduino"'), 'T4: JSON string contains targetId');

// ─────────────────────────────────────────────────────────────────
// T5 — Project Import & Deserialization
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Project Import & Deserialization ---');

const importResult = importProject(jsonString);
assert(importResult.success === true, 'T5: JSON import succeeded');
assert(importResult.project?.hardware.boardId === 'esp32', 'T5: Imported hardware.boardId is "esp32"');
assert(importResult.project?.hardware.targetId === 'esp32_arduino', 'T5: Imported hardware.targetId is "esp32_arduino"');

// ─────────────────────────────────────────────────────────────────
// T6 — Transparent Legacy Project (v1) Upgrade
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Legacy Project Format (v1) Upgrade ---');

const legacyV1Project = {
  format: 'flow',
  version: 1,
  metadata: {
    name: 'Legacy Project',
    created: '2026-08-01T00:00:00.000Z',
    modified: '2026-08-01T00:00:00.000Z',
  },
  board: {
    id: 'esp32',
    name: 'ESP32 DevKitC',
  },
  schema: { nodes: [], edges: [] },
  flow: { nodes: [], edges: [] },
  functions: { subFlows: {} },
  settings: {},
};

const upgradeResult = importProject(JSON.stringify(legacyV1Project));
assert(upgradeResult.success === true, 'T6: Legacy v1 project imported successfully');
assert(upgradeResult.legacyUpgraded === true, 'T6: Marked as legacyUpgraded = true');
assert(upgradeResult.project?.version === CURRENT_PROJECT_VERSION, 'T6: Upgraded version is 2');
assert(upgradeResult.project?.hardware.boardId === 'esp32', 'T6: Upgraded project has boardId="esp32"');
assert(upgradeResult.project?.hardware.targetId === 'esp32_arduino', 'T6: Upgraded project has targetId="esp32_arduino"');

// ─────────────────────────────────────────────────────────────────
// T7 — No Silent Fallback for Missing Hardware
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: No Silent Fallback for Missing Hardware ---');

const invalidHwProject = {
  format: 'flow',
  version: 2,
  metadata: { name: 'Invalid Board Project' },
  hardware: {
    boardId: 'non_existent_board_999',
    targetId: 'non_existent_target_999',
  },
  schema: { nodes: [], edges: [] },
  flow: { nodes: [], edges: [] },
  functions: { subFlows: {} },
  settings: {},
};

const invalidImportResult = importProject(JSON.stringify(invalidHwProject));
assert(invalidImportResult.success === false, 'T7: Invalid hardware project rejected (not silently converted to Uno)');
assert(
  Boolean(invalidImportResult.errors?.some(e => e.includes('non_existent_board_999'))),
  'T7: Error explicitly identifies missing board'
);

// ─────────────────────────────────────────────────────────────────
// T8 — Zustand Store setProjectHardware Action
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Zustand Store Hardware Action ---');

useFlowStore.setState({
  project: {
    name: 'Store Test Project',
    platform: 'arduino_uno',
    hardware: { boardId: 'arduino_uno', targetId: 'arduino_uno' },
    createdAt: Date.now(),
  }
});

const storeBefore = useFlowStore.getState().project;
assert(storeBefore?.hardware?.targetId === 'arduino_uno', 'T8: Initial store targetId is arduino_uno');

useFlowStore.getState().setProjectHardware({ boardId: 'esp32', targetId: 'esp32_arduino' });
const storeAfter = useFlowStore.getState().project;
assert(storeAfter?.hardware?.boardId === 'esp32', 'T8: Updated store boardId is esp32');
assert(storeAfter?.hardware?.targetId === 'esp32_arduino', 'T8: Updated store targetId is esp32_arduino');

// ─────────────────────────────────────────────────────────────────
// T9 — Target-Aware Compiler Propagation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Target-Aware Compiler Propagation ---');

const flowNodes = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_1',
    type: 'componentNode',
    position: { x: 0, y: 100 },
    data: {
      label: 'Ultrasonic HC-SR04',
      packageId: 'ultrasonic_hcsr04',
      componentInstanceId: 'sensor_1',
      trigPin: 9,
      echoPin: 10,
      distance: 'dist_val',
    },
  },
];

const flowEdges = [
  { id: 'e1', source: 'start_node', target: 'sensor_1', sourceHandle: 'flow', targetHandle: 'flow' },
];

const unoCompiler = new GraphToASTCompiler(
  flowNodes as any,
  flowEdges as any,
  {},
  {},
  [],
  [],
  { targetId: 'arduino_uno' }
);
const unoProgram = unoCompiler.compile();
assert(unoProgram.body.length > 0, 'T9: Uno compiler expanded program AST');

const espCompiler = new GraphToASTCompiler(
  flowNodes as any,
  flowEdges as any,
  {},
  {},
  [],
  [],
  { targetId: 'esp32' }
);
const espProgram = espCompiler.compile();
assert(espProgram.body.length > 0, 'T9: ESP32 compiler expanded program AST');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
