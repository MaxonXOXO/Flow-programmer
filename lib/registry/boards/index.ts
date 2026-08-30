import { CanonicalBoardDefinition, MCUDefinition, TargetDefinition, PinSignalCapability, BoardPinDefinition } from './types';
import { ArduinoUno } from './arduino_uno';
import { ArduinoMega2560 } from './arduino_mega_2560';
import { ESP32 } from './esp32';
import { NodeMCUV2 } from './nodemcu_v2';
import { STM32BluePill } from './stm32_bluepill';
import { RaspberryPiPico } from './raspberry_pi_pico';
import { CANONICAL_MCUS } from './mcus';
import { CANONICAL_TARGETS } from './targets';

// ─── Registries ───────────────────────────────────────────────────

const BOARD_REGISTRY: Record<string, CanonicalBoardDefinition> = {
  arduino_uno: ArduinoUno,
  'arduino-uno': ArduinoUno,
  arduino_mega_2560: ArduinoMega2560,
  arduino_mega: ArduinoMega2560,
  esp32: ESP32,
  esp32_devkit_c: ESP32,
  nodemcu_v2: NodeMCUV2,
  esp8266: NodeMCUV2,
  stm32_bluepill: STM32BluePill,
  stm32: STM32BluePill,
  raspberry_pi_pico: RaspberryPiPico,
  rp2040: RaspberryPiPico,
};

const MCU_REGISTRY: Record<string, MCUDefinition> = { ...CANONICAL_MCUS };
const TARGET_REGISTRY: Record<string, TargetDefinition> = { ...CANONICAL_TARGETS };

// ─── Lookup APIs ──────────────────────────────────────────────────

export function getBoard(boardId: string): CanonicalBoardDefinition | undefined {
  if (!boardId) return undefined;
  const normalized = boardId.toLowerCase().replace(/-/g, '_');
  return BOARD_REGISTRY[normalized] || BOARD_REGISTRY[boardId];
}

/** Legacy lookup with fallback to Arduino Uno */
export function getBoardDefinition(boardId?: string): CanonicalBoardDefinition | undefined {
  return (boardId ? getBoard(boardId) : undefined) || BOARD_REGISTRY['arduino_uno'];
}

export function getAllBoards(): CanonicalBoardDefinition[] {
  // Return unique board objects
  const seen = new Set<string>();
  const list: CanonicalBoardDefinition[] = [];
  for (const board of Object.values(BOARD_REGISTRY)) {
    if (!seen.has(board.id)) {
      seen.add(board.id);
      list.push(board);
    }
  }
  return list;
}

export function getMCU(mcuId: string): MCUDefinition | undefined {
  if (!mcuId) return undefined;
  const normalized = mcuId.toLowerCase().replace(/-/g, '_');
  return MCU_REGISTRY[normalized] || MCU_REGISTRY[mcuId];
}

export function getAllMCUs(): MCUDefinition[] {
  return Object.values(MCU_REGISTRY);
}

export function getTarget(targetId: string): TargetDefinition | undefined {
  if (!targetId) return undefined;
  const normalized = targetId.toLowerCase().replace(/-/g, '_');
  return TARGET_REGISTRY[normalized] || TARGET_REGISTRY[targetId];
}

export function getAllTargets(): TargetDefinition[] {
  const seen = new Set<string>();
  const list: TargetDefinition[] = [];
  for (const target of Object.values(TARGET_REGISTRY)) {
    if (!seen.has(target.id)) {
      seen.add(target.id);
      list.push(target);
    }
  }
  return list;
}

export function getPinDefinition(boardId: string, pin: string): BoardPinDefinition | undefined {
  const board = getBoard(boardId);
  if (!board) return undefined;
  return board.pins[pin];
}

export function getPinCapabilities(boardId: string, pin: string): PinSignalCapability[] {
  const pinDef = getPinDefinition(boardId, pin);
  return pinDef ? pinDef.capabilities : [];
}

/**
 * Checks if a specific board pin supports a given signal/capability.
 * Supports smart matching between generic (e.g. 'digital', 'analog') and specific capabilities.
 */
export function pinSupports(boardId: string, pin: string, capability: PinSignalCapability | string): boolean {
  const caps = getPinCapabilities(boardId, pin);
  if (caps.includes(capability as PinSignalCapability)) return true;

  // Smart umbrella matches
  if (capability === 'digital') {
    return caps.includes('digital_in') || caps.includes('digital_out');
  }
  if (capability === 'digital_in') {
    return caps.includes('digital');
  }
  if (capability === 'digital_out') {
    return caps.includes('digital');
  }
  if (capability === 'analog') {
    return caps.includes('analog_in') || caps.includes('analog_out');
  }
  if (capability === 'analog_in') {
    return caps.includes('analog');
  }
  if (capability === 'analog_out') {
    return caps.includes('analog') || caps.includes('dac');
  }
  if (capability === 'power') {
    return caps.includes('power_5v') || caps.includes('power_3v3') || caps.includes('power_vin');
  }

  return false;
}

/**
 * Validates whether a component signal requirement can connect to a board pin.
 */
export function canConnectSignal(
  boardId: string,
  pinId: string,
  requiredSignal: string
): { compatible: boolean; reason?: string; warning?: string } {
  const board = getBoard(boardId);
  if (!board) {
    return { compatible: false, reason: `Unknown board "${boardId}"` };
  }

  const pinDef = board.pins[pinId];
  if (!pinDef) {
    return { compatible: false, reason: `Pin "${pinId}" does not exist on board "${board.name}"` };
  }

  const normalizedReq = requiredSignal.toLowerCase();

  // Check Power rails
  if (normalizedReq === 'vcc' || normalizedReq === '5v' || normalizedReq === '3.3v' || normalizedReq === 'power') {
    const hasPower = pinSupports(boardId, pinId, 'power');
    if (!hasPower) return { compatible: false, reason: `Pin "${pinId}" is not a power supply pin` };
    return { compatible: true, warning: pinDef.warningMessage };
  }

  if (normalizedReq === 'gnd' || normalizedReq === 'ground') {
    const hasGnd = pinSupports(boardId, pinId, 'ground');
    if (!hasGnd) return { compatible: false, reason: `Pin "${pinId}" is not a Ground pin` };
    return { compatible: true, warning: pinDef.warningMessage };
  }

  // Check Analog input
  if (normalizedReq.startsWith('a') || normalizedReq.includes('analog')) {
    const hasAnalog = pinSupports(boardId, pinId, 'analog_in');
    if (!hasAnalog) return { compatible: false, reason: `Pin "${pinId}" does not support Analog Input on ${board.name}` };
    return { compatible: true, warning: pinDef.warningMessage };
  }

  // Check Digital / Signal
  if (normalizedReq.startsWith('d') || normalizedReq.includes('digital') || normalizedReq === 'signal') {
    const hasDigital = pinSupports(boardId, pinId, 'digital');
    if (!hasDigital) return { compatible: false, reason: `Pin "${pinId}" does not support Digital I/O on ${board.name}` };
    return { compatible: true, warning: pinDef.warningMessage };
  }

  // Check PWM
  if (normalizedReq.includes('pwm')) {
    const hasPwm = pinSupports(boardId, pinId, 'pwm');
    if (!hasPwm) return { compatible: false, reason: `Pin "${pinId}" does not support PWM on ${board.name}` };
    return { compatible: true, warning: pinDef.warningMessage };
  }

  // Check I2C / SPI / UART
  if (normalizedReq.includes('sda')) {
    const hasSda = pinSupports(boardId, pinId, 'i2c_sda');
    if (!hasSda) return { compatible: false, reason: `Pin "${pinId}" does not support I2C SDA` };
    return { compatible: true, warning: pinDef.warningMessage };
  }
  if (normalizedReq.includes('scl')) {
    const hasScl = pinSupports(boardId, pinId, 'i2c_scl');
    if (!hasScl) return { compatible: false, reason: `Pin "${pinId}" does not support I2C SCL` };
    return { compatible: true, warning: pinDef.warningMessage };
  }

  // Default fallback check
  const directSupport = pinSupports(boardId, pinId, requiredSignal);
  return {
    compatible: directSupport,
    reason: directSupport ? undefined : `Pin "${pinId}" does not support required signal "${requiredSignal}"`,
    warning: pinDef.warningMessage,
  };
}

// ─── Dynamic Registration APIs ────────────────────────────────────

export function registerBoard(board: CanonicalBoardDefinition): void {
  BOARD_REGISTRY[board.id] = board;
}

export function registerMCU(mcu: MCUDefinition): void {
  MCU_REGISTRY[mcu.id] = mcu;
}

export function registerTarget(target: TargetDefinition): void {
  TARGET_REGISTRY[target.id] = target;
}

// ─── Exports ──────────────────────────────────────────────────────

export * from './types';
export { ArduinoUno } from './arduino_uno';
export { ArduinoMega2560 } from './arduino_mega_2560';
export { ESP32 } from './esp32';
export { NodeMCUV2 } from './nodemcu_v2';
export { STM32BluePill } from './stm32_bluepill';
export { RaspberryPiPico } from './raspberry_pi_pico';
export * from './mcus';
export * from './targets';
export const validatePinCompatibility = canConnectSignal;
