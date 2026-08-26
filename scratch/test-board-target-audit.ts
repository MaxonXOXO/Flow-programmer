import { getBoardDefinition, getPinCapabilities, pinSupports, ArduinoUno, ESP32 } from '../lib/registry/boards';
import { createNewProject, exportProjectFromState, importProject } from '../lib/project/projectManager';
import { getComponentPackage } from '../lib/registry/components';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';

console.log('=== TEST PHASE 5J: BOARD & TARGET ARCHITECTURE AUDIT ===\n');

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
// T1 — Existing Board Registry Discovery
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Board Registry Discovery ---');

const unoBoard = getBoardDefinition('arduino_uno');
const esp32Board = getBoardDefinition('esp32');

assert(Boolean(unoBoard), 'T1: Arduino Uno board definition discovered');
assert(Boolean(esp32Board), 'T1: ESP32 board definition discovered');
assert(unoBoard?.mcu === 'ATmega328P', 'T1: Arduino Uno MCU is ATmega328P');
assert(esp32Board?.mcu === 'ESP32-WROOM-32', 'T1: ESP32 MCU is ESP32-WROOM-32');
assert(unoBoard?.architecture === 'avr', 'T1: Arduino Uno architecture is avr');
assert(Boolean(esp32Board?.architecture?.startsWith('xtensa')), 'T1: ESP32 architecture is xtensa family');

// ─────────────────────────────────────────────────────────────────
// T2 — Board Pin Model & Capabilities
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Board Pin Capabilities Audit ---');

assert(Boolean(unoBoard?.pins['D13']), 'T2: Uno D13 pin exists');
assert(pinSupports('arduino_uno', 'D13', 'digital'), 'T2: Uno D13 supports digital');
assert(pinSupports('arduino_uno', 'D13', 'spi_sck'), 'T2: Uno D13 supports SPI SCK');

assert(pinSupports('arduino_uno', 'D3', 'pwm'), 'T2: Uno D3 supports PWM');
assert(!pinSupports('arduino_uno', 'D2', 'pwm'), 'T2: Uno D2 does NOT support PWM');

assert(pinSupports('arduino_uno', 'A4', 'i2c_sda'), 'T2: Uno A4 supports I2C SDA');
assert(pinSupports('arduino_uno', 'A5', 'i2c_scl'), 'T2: Uno A5 supports I2C SCL');

assert(Boolean(esp32Board?.pins['GPIO21']), 'T2: ESP32 GPIO21 exists');
assert(pinSupports('esp32', 'GPIO21', 'i2c_sda'), 'T2: ESP32 GPIO21 supports I2C SDA');

// ─────────────────────────────────────────────────────────────────
// T3 — Project Board Reference Audit
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Project Board Reference Audit ---');

const testProj = createNewProject('Test ESP Project', 'esp32');
assert(testProj.board?.id === 'esp32', 'T3: Project stores boardId="esp32"');

const exported = exportProjectFromState({
  project: { name: 'Test ESP Project', platform: 'esp32' },
  schemaNodes: [],
  schemaEdges: [],
});
assert(exported.board?.id === 'esp32', 'T3: Exported project preserves boardId="esp32"');

// ─────────────────────────────────────────────────────────────────
// T4 — Component Target-Aware Resolution Audit
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Component Target Resolution Audit ---');

const hcsr04 = getComponentPackage('ultrasonic_hcsr04')!;
const unoHcsr04 = resolvePackageImplementation(hcsr04, 'arduino_uno');
const espHcsr04 = resolvePackageImplementation(hcsr04, 'esp32');

assert(unoHcsr04.strategy === 'graph' || unoHcsr04.strategy === 'builtin', 'T4: Uno HC-SR04 strategy resolved');
assert(espHcsr04.targetId === 'esp32', 'T4: Resolution preserves requested targetId');

// ─────────────────────────────────────────────────────────────────
// T5 — Canonical Board Model Prototype Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Canonical Board Model Prototype Validation ---');

export interface PrototypeBoardDefinition {
  id: string;
  name: string;
  targetId: string;
  architecture: string;
  mcu: {
    name: string;
    flashBytes: number;
    sramBytes: number;
    adcBits: number;
  };
  pins: Record<string, {
    capabilities: string[];
    voltage: '5V' | '3.3V';
    isStrapping?: boolean;
  }>;
}

const canonicalUnoPrototype: PrototypeBoardDefinition = {
  id: 'arduino_uno',
  name: 'Arduino Uno R3',
  targetId: 'arduino_uno',
  architecture: 'avr',
  mcu: {
    name: 'ATmega328P',
    flashBytes: 32768,
    sramBytes: 2048,
    adcBits: 10,
  },
  pins: {
    D0: { capabilities: ['digital_io', 'uart_rx'], voltage: '5V' },
    D1: { capabilities: ['digital_io', 'uart_tx'], voltage: '5V' },
    D2: { capabilities: ['digital_io', 'interrupt'], voltage: '5V' },
    D3: { capabilities: ['digital_io', 'pwm', 'interrupt'], voltage: '5V' },
    A0: { capabilities: ['analog_in', 'digital_io'], voltage: '5V' },
  },
};

assert(canonicalUnoPrototype.mcu.flashBytes === 32768, 'T5: Prototype model captures flash size');
assert(canonicalUnoPrototype.mcu.adcBits === 10, 'T5: Prototype model captures ADC resolution');
assert(canonicalUnoPrototype.pins['D3'].capabilities.includes('pwm'), 'T5: Prototype pin capabilities verified');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
