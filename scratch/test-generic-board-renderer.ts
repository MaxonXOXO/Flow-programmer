import { getBoardDefinition, getAllBoards, pinSupports, getMCU } from '../lib/registry/boards';
import { CompilerValidator } from '../lib/compiler/validators/compilerValidator';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { SimulationEngine } from '../lib/compiler/runtime/simulationEngine';
import { ProgramNode } from '../lib/compiler/ast/ast';

console.log('=== TEST PHASE 5L-B: GENERIC BOARD SCHEMA RENDERER ===\n');

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
// T1 — Canonical Board Definition & Metadata Resolution
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Canonical Board Resolution ---');

const boardIds = ['arduino_uno', 'arduino_mega_2560', 'esp32', 'nodemcu_v2', 'stm32_bluepill', 'raspberry_pi_pico'];

boardIds.forEach(id => {
  const board = getBoardDefinition(id);
  assert(board !== undefined, `T1: Resolved board "${id}"`);
  assert(board?.name.length! > 0, `T1: Board "${id}" has valid name: "${board?.name}"`);
  assert(Object.keys(board?.pins || {}).length > 0, `T1: Board "${id}" defines ${Object.keys(board?.pins || {}).length} pins`);
  assert(board?.targetId.length! > 0, `T1: Board "${id}" specifies targetId "${board?.targetId}"`);
  assert(board?.mcuId.length! > 0, `T1: Board "${id}" specifies mcuId "${board?.mcuId}"`);
});

// ─────────────────────────────────────────────────────────────────
// T2 — Dynamic Pin Header Layout Partitioning
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Dynamic Pin Layout Partitioning ---');

const uno = getBoardDefinition('arduino_uno')!;
assert(uno.defaultLayout !== undefined, 'T2: Uno defines defaultLayout');
assert(uno.defaultLayout?.pinGroups.length! >= 2, 'T2: Uno defines pinGroups');

const esp32 = getBoardDefinition('esp32')!;
assert(esp32.defaultLayout !== undefined, 'T2: ESP32 defines defaultLayout');
const espLeft = esp32.defaultLayout?.pinGroups.find(g => g.side === 'left');
const espRight = esp32.defaultLayout?.pinGroups.find(g => g.side === 'right');
assert(espLeft !== undefined && espLeft.pinIds.length > 0, 'T2: ESP32 has left header pins');
assert(espRight !== undefined && espRight.pinIds.length > 0, 'T2: ESP32 has right header pins');

const nodemcu = getBoardDefinition('nodemcu_v2')!;
assert(nodemcu.defaultLayout !== undefined, 'T2: NodeMCU defines defaultLayout');

const pico = getBoardDefinition('raspberry_pi_pico')!;
assert(pico.defaultLayout !== undefined, 'T2: Pico defines defaultLayout');

// ─────────────────────────────────────────────────────────────────
// T3 — Semantic Pin Capabilities Extraction
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Pin Capabilities Extraction ---');

// Uno Pin Capabilities
assert(pinSupports('arduino_uno', 'D13', 'digital'), 'T3: Uno D13 is digital');
assert(pinSupports('arduino_uno', 'D13', 'spi_sck'), 'T3: Uno D13 is SPI SCK');
assert(pinSupports('arduino_uno', 'D9', 'pwm'), 'T3: Uno D9 is PWM');
assert(pinSupports('arduino_uno', 'A0', 'analog'), 'T3: Uno A0 is Analog');
assert(pinSupports('arduino_uno', 'A4', 'i2c_sda'), 'T3: Uno A4 is I2C SDA');
assert(pinSupports('arduino_uno', 'GND', 'ground'), 'T3: Uno GND is Ground');
assert(pinSupports('arduino_uno', '5V', 'power_5v'), 'T3: Uno 5V is 5V Power');

// ESP32 Pin Capabilities
assert(pinSupports('esp32', 'GPIO21', 'i2c_sda'), 'T3: ESP32 GPIO21 is I2C SDA');
assert(pinSupports('esp32', 'GPIO22', 'i2c_scl'), 'T3: ESP32 GPIO22 is I2C SCL');
assert(pinSupports('esp32', 'GPIO25', 'dac'), 'T3: ESP32 GPIO25 is DAC');
assert(pinSupports('esp32', 'GPIO4', 'touch'), 'T3: ESP32 GPIO4 is Touch');

// ─────────────────────────────────────────────────────────────────
// T4 — Compiler Validator Connection Extraction with boardNode
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Compiler Validator with boardNode ---');

const validator = new CompilerValidator();
const emptyProgram: ProgramNode = { kind: 'Program', body: [] };

const validSchemaNodes = [
  { id: 'mcu-board', type: 'boardNode', data: { boardId: 'arduino_uno' }, position: { x: 300, y: 80 } },
  { id: 'led-1', type: 'componentNode', data: { label: 'LED', componentType: 'led' }, position: { x: 100, y: 80 } }
];

const validSchemaEdges = [
  { id: 'e1', source: 'mcu-board', target: 'led-1', sourceHandle: 'D13', targetHandle: 'anode' }
];

const validErrors = validator.validate(emptyProgram, validSchemaNodes as any, validSchemaEdges as any, 'arduino_uno');
assert(validErrors.filter(e => e.severity === 'error').length === 0, 'T4: Valid connection to boardNode D13 produces 0 errors');

// Invalid pin connection
const invalidSchemaEdges = [
  { id: 'e2', source: 'mcu-board', target: 'led-1', sourceHandle: 'D99_NON_EXISTENT', targetHandle: 'anode' }
];
const invalidErrors = validator.validate(emptyProgram, validSchemaNodes as any, invalidSchemaEdges as any, 'arduino_uno');
assert(invalidErrors.some(e => e.message.includes('does not exist')), 'T4: Non-existent pin on boardNode detected as error');

// ─────────────────────────────────────────────────────────────────
// T5 — Code Generator Connection Extraction with boardNode
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Code Generator Connection Extraction ---');

const generator = new ArduinoUnoGenerator();
const genSchemaNodes = [
  { id: 'board-main', type: 'boardNode', data: { boardId: 'arduino_uno' }, position: { x: 300, y: 80 } },
  { id: 'hcsr04-1', type: 'componentNode', data: { label: 'HC-SR04', componentType: 'ultrasonic_hcsr04' }, position: { x: 100, y: 80 } }
];
const genSchemaEdges = [
  { id: 'e1', source: 'board-main', target: 'hcsr04-1', sourceHandle: 'D9', targetHandle: 'trig' },
  { id: 'e2', source: 'board-main', target: 'hcsr04-1', sourceHandle: 'D10', targetHandle: 'echo' }
];

const generated = generator.generate(emptyProgram, genSchemaNodes as any, genSchemaEdges as any);
assert(generated.main.includes('void setup()'), 'T5: Generated sketch contains setup function');

// ─────────────────────────────────────────────────────────────────
// T6 — Simulation Engine Hardware Node Isolation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Simulation Engine Hardware Node Isolation ---');

const simEngine = new SimulationEngine();
simEngine.loadProgram(emptyProgram, genSchemaNodes);
assert((simEngine as any).hardwareStates['board_main'] === undefined, 'T6: boardNode is not initialized as a peripheral component in simulation');

// ─────────────────────────────────────────────────────────────────
// T7 — Backward Compatibility (unoNode)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Backward Compatibility (unoNode) ---');

const legacySchemaNodes = [
  { id: 'arduino-uno', type: 'unoNode', data: { label: 'Arduino Uno' }, position: { x: 300, y: 80 } },
  { id: 'buzzer-1', type: 'componentNode', data: { label: 'Buzzer', componentType: 'buzzer' }, position: { x: 100, y: 80 } }
];
const legacySchemaEdges = [
  { id: 'e1', source: 'arduino-uno', target: 'buzzer-1', sourceHandle: 'D8', targetHandle: 'pos' }
];

const legacyErrors = validator.validate(emptyProgram, legacySchemaNodes as any, legacySchemaEdges as any, 'arduino_uno');
assert(legacyErrors.filter(e => e.severity === 'error').length === 0, 'T7: Legacy unoNode validates cleanly with 0 errors');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
