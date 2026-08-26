import {
  getBoard,
  getBoardDefinition,
  getAllBoards,
  getMCU,
  getAllMCUs,
  getTarget,
  getAllTargets,
  getPinCapabilities,
  pinSupports,
  canConnectSignal,
  registerBoard,
  registerMCU,
  registerTarget,
  CanonicalBoardDefinition,
  MCUDefinition,
  TargetDefinition,
} from '../lib/registry/boards';

console.log('=== TEST PHASE 5K: CANONICAL HARDWARE & CAPABILITY MODEL ===\n');

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
// T1 — Architecture & MCU Registry
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: MCU Registry & Architecture Separation ---');

const mcus = getAllMCUs();
assert(mcus.length >= 6, `T1: At least 6 MCUs registered (found ${mcus.length})`);

const atmega328p = getMCU('atmega328p')!;
assert(Boolean(atmega328p), 'T1: ATmega328P MCU found');
assert(atmega328p.architecture === 'avr', 'T1: ATmega328P architecture is "avr"');
assert(atmega328p.clockFrequencyHz === 16_000_000, 'T1: ATmega328P clock is 16MHz');
assert(atmega328p.flashSizeBytes === 32_768, 'T1: ATmega328P Flash is 32KB');
assert(atmega328p.sramSizeBytes === 2_048, 'T1: ATmega328P SRAM is 2KB');
assert(atmega328p.adcResolutionBits === 10, 'T1: ATmega328P ADC is 10-bit');

const esp32Mcu = getMCU('esp32_wroom_32')!;
assert(Boolean(esp32Mcu), 'T1: ESP32 MCU found');
assert(esp32Mcu.architecture === 'xtensa_lx6', 'T1: ESP32 architecture is "xtensa_lx6"');
assert(esp32Mcu.coreCount === 2, 'T1: ESP32 is dual-core');
assert(esp32Mcu.clockFrequencyHz === 240_000_000, 'T1: ESP32 clock is 240MHz');
assert(esp32Mcu.flashSizeBytes === 4_194_304, 'T1: ESP32 Flash is 4MB');
assert(esp32Mcu.adcResolutionBits === 12, 'T1: ESP32 ADC is 12-bit');
assert(esp32Mcu.dacResolutionBits === 8, 'T1: ESP32 DAC is 8-bit');

const stm32Mcu = getMCU('stm32f103c8t6')!;
assert(Boolean(stm32Mcu), 'T1: STM32 MCU found');
assert(stm32Mcu.architecture === 'arm_cortex_m', 'T1: STM32 architecture is "arm_cortex_m"');

const rp2040Mcu = getMCU('rp2040')!;
assert(Boolean(rp2040Mcu), 'T1: RP2040 MCU found');
assert(rp2040Mcu.coreCount === 2, 'T1: RP2040 is dual-core');

// ─────────────────────────────────────────────────────────────────
// T2 — Target Registry
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Target Registry & Compiler Mapping ---');

const targets = getAllTargets();
assert(targets.length >= 8, `T2: At least 8 Targets registered (found ${targets.length})`);

const unoTarget = getTarget('arduino_uno')!;
assert(Boolean(unoTarget), 'T2: arduino_uno target found');
assert(unoTarget.mcuId === 'atmega328p', 'T2: arduino_uno targets ATmega328P');
assert(unoTarget.defaultCompiler === 'arduino_cpp', 'T2: arduino_uno default compiler is arduino_cpp');

const espTarget = getTarget('esp32_arduino')!;
assert(Boolean(espTarget), 'T2: esp32_arduino target found');
assert(espTarget.mcuId === 'esp32_wroom_32', 'T2: esp32_arduino targets ESP32');
assert(espTarget.capabilities.includes('wifi'), 'T2: esp32_arduino has wifi capability');
assert(espTarget.capabilities.includes('ble'), 'T2: esp32_arduino has ble capability');

const stm32HalTarget = getTarget('stm32_hal')!;
assert(Boolean(stm32HalTarget), 'T2: stm32_hal target found');
assert(stm32HalTarget.defaultCompiler === 'stm32_hal', 'T2: stm32_hal default compiler is stm32_hal');

const genericTarget = getTarget('generic')!;
assert(Boolean(genericTarget), 'T2: generic fallback target found');

// ─────────────────────────────────────────────────────────────────
// T3 — Canonical Board Registry
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Canonical Board Registry ---');

const boards = getAllBoards();
assert(boards.length >= 6, `T3: At least 6 Boards registered (found ${boards.length})`);

const uno = getBoard('arduino_uno')!;
assert(Boolean(uno), 'T3: Arduino Uno board found');
assert(uno.targetId === 'arduino_uno', 'T3: Uno links to targetId="arduino_uno"');
assert(uno.mcuId === 'atmega328p', 'T3: Uno links to mcuId="atmega328p"');
assert(uno.defaultLayout !== undefined, 'T3: Uno has defaultLayout');

const mega = getBoard('arduino_mega_2560')!;
assert(Boolean(mega), 'T3: Arduino Mega 2560 board found');
assert(mega.mcuId === 'atmega2560', 'T3: Mega links to mcuId="atmega2560"');
assert(Boolean(mega.pins['D50']), 'T3: Mega has pin D50');

const esp32Board = getBoard('esp32')!;
assert(Boolean(esp32Board), 'T3: ESP32 board found');
assert(esp32Board.mcuId === 'esp32_wroom_32', 'T3: ESP32 links to mcuId="esp32_wroom_32"');
assert(Boolean(esp32Board.pins['GPIO25']), 'T3: ESP32 has pin GPIO25');

const nodemcu = getBoard('nodemcu_v2')!;
assert(Boolean(nodemcu), 'T3: NodeMCU board found');
assert(nodemcu.mcuId === 'esp8266ex', 'T3: NodeMCU links to mcuId="esp8266ex"');

const bluepill = getBoard('stm32_bluepill')!;
assert(Boolean(bluepill), 'T3: STM32 BluePill board found');
assert(bluepill.mcuId === 'stm32f103c8t6', 'T3: BluePill links to mcuId="stm32f103c8t6"');

const pico = getBoard('raspberry_pi_pico')!;
assert(Boolean(pico), 'T3: Raspberry Pi Pico board found');
assert(pico.mcuId === 'rp2040', 'T3: Pico links to mcuId="rp2040"');

// ─────────────────────────────────────────────────────────────────
// T4 — Pin Capabilities & Voltage Model
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Pin Capabilities & Voltage ---');

// Uno Pin Voltages and Capabilities
assert(uno.pins['D3'].voltage === '5V', 'T4: Uno D3 is 5V');
assert(uno.pins['D3'].capabilities.includes('pwm'), 'T4: Uno D3 has PWM capability');
assert(uno.pins['D2'].capabilities.includes('interrupt'), 'T4: Uno D2 has Interrupt capability');
assert(uno.pins['D0'].isReserved === true, 'T4: Uno D0 is reserved for UART RX');

// ESP32 Pin Voltages and Capabilities
assert(esp32Board.pins['GPIO25'].voltage === '3.3V', 'T4: ESP32 GPIO25 is 3.3V');
assert(esp32Board.pins['GPIO25'].capabilities.includes('dac'), 'T4: ESP32 GPIO25 has DAC capability');
assert(esp32Board.pins['GPIO0'].isStrappingPin === true, 'T4: ESP32 GPIO0 is marked as strapping pin');
assert(esp32Board.pins['GPIO34'].capabilities.includes('digital_in'), 'T4: ESP32 GPIO34 supports input');
assert(!esp32Board.pins['GPIO34'].capabilities.includes('digital_out'), 'T4: ESP32 GPIO34 does NOT support output (input only)');

// ─────────────────────────────────────────────────────────────────
// T5 — Granular Signal Capability Matching
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Signal Capability Matching ---');

assert(pinSupports('arduino_uno', 'D3', 'pwm'), 'T5: pinSupports("arduino_uno", "D3", "pwm") is true');
assert(pinSupports('arduino_uno', 'D3', 'digital'), 'T5: pinSupports("arduino_uno", "D3", "digital") is true');
assert(pinSupports('arduino_uno', 'A0', 'analog'), 'T5: pinSupports("arduino_uno", "A0", "analog") is true');
assert(pinSupports('arduino_uno', 'A0', 'analog_in'), 'T5: pinSupports("arduino_uno", "A0", "analog_in") is true');
assert(!pinSupports('arduino_uno', 'D2', 'pwm'), 'T5: pinSupports("arduino_uno", "D2", "pwm") is false');

// Smart Connection Validation
const connVcc = canConnectSignal('arduino_uno', '5V', 'VCC');
assert(connVcc.compatible === true, 'T5: VCC connects to 5V power pin');

const connGnd = canConnectSignal('arduino_uno', 'GND', 'GND');
assert(connGnd.compatible === true, 'T5: GND connects to GND pin');

const connAnalogOk = canConnectSignal('arduino_uno', 'A0', 'analog');
assert(connAnalogOk.compatible === true, 'T5: Analog sensor pin connects to A0');

const connAnalogBad = canConnectSignal('arduino_uno', 'D4', 'analog');
assert(connAnalogBad.compatible === false, 'T5: Analog sensor pin rejected on digital-only pin D4');

const connPwmOk = canConnectSignal('esp32', 'GPIO18', 'pwm');
assert(connPwmOk.compatible === true, 'T5: PWM connects to ESP32 GPIO18');

const connStrapping = canConnectSignal('esp32', 'GPIO0', 'digital');
assert(connStrapping.compatible === true, 'T5: Digital connects to GPIO0');
assert(connStrapping.warning !== undefined, 'T5: GPIO0 connection includes strapping warning');

// ─────────────────────────────────────────────────────────────────
// T6 — Backward Compatibility APIs
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Backward Compatibility ---');

const legacyUno = getBoardDefinition('arduino_uno')!;
assert(Boolean(legacyUno), 'T6: getBoardDefinition works');
assert(legacyUno.architecture === 'avr', 'T6: legacyUno.architecture is "avr"');
assert(legacyUno.mcu === 'ATmega328P', 'T6: legacyUno.mcu is "ATmega328P"');
assert(legacyUno.frequency === '16MHz', 'T6: legacyUno.frequency is "16MHz"');

const legacyKebab = getBoardDefinition('arduino-uno')!;
assert(Boolean(legacyKebab), 'T6: getBoardDefinition("arduino-uno") normalizes and resolves');

// ─────────────────────────────────────────────────────────────────
// T7 — Dynamic Hardware Extension
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Dynamic Hardware Extension ---');

const customMcu: MCUDefinition = {
  id: 'samd21g18a',
  name: 'SAMD21G18A (ARM Cortex-M0+)',
  architecture: 'arm_cortex_m',
  coreCount: 1,
  clockFrequencyHz: 48_000_000,
  flashSizeBytes: 262_144,
  sramSizeBytes: 32_768,
  adcResolutionBits: 12,
  dacResolutionBits: 10,
  pwmResolutionBits: 16,
  hardwareTimers: 5,
};
registerMCU(customMcu);
assert(getMCU('samd21g18a')?.name === 'SAMD21G18A (ARM Cortex-M0+)', 'T7: Dynamic MCU registration');

const customTarget: TargetDefinition = {
  id: 'arduino_zero',
  name: 'Arduino Zero Target',
  mcuId: 'samd21g18a',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp'],
  capabilities: ['gpio', 'adc_12bit', 'dac_10bit', 'native_usb'],
};
registerTarget(customTarget);
assert(getTarget('arduino_zero')?.mcuId === 'samd21g18a', 'T7: Dynamic Target registration');

const customBoard: CanonicalBoardDefinition = {
  id: 'arduino_zero',
  name: 'Arduino Zero',
  targetId: 'arduino_zero',
  mcuId: 'samd21g18a',
  pins: {
    D0: { id: 'D0', label: 'D0', capabilities: ['digital', 'digital_in', 'digital_out', 'uart_rx'], voltage: '3.3V' },
    A0: { id: 'A0', label: 'A0', capabilities: ['analog', 'analog_in', 'analog_out', 'dac'], voltage: '3.3V' },
  },
};
registerBoard(customBoard);
assert(Boolean(getBoard('arduino_zero')?.pins['A0'].capabilities.includes('dac')), 'T7: Dynamic Board registration');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
