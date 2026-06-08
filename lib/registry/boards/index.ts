import { BoardDefinition, PinCapability } from './types';
import { ArduinoUno } from './arduino_uno';
import { ESP32 } from './esp32';

const BOARD_REGISTRY: Record<string, BoardDefinition> = {
  arduino_uno: ArduinoUno,
  esp32: ESP32,
};

export function getBoardDefinition(boardId: string): BoardDefinition | undefined {
  const normalizedId = boardId.toLowerCase().replace(/-/g, '_');
  return BOARD_REGISTRY[normalizedId] || BOARD_REGISTRY['arduino_uno'];
}

export function getPinCapabilities(boardId: string, pin: string): PinCapability[] {
  const board = getBoardDefinition(boardId);
  if (!board) return [];
  const pinDef = board.pins[pin];
  return pinDef ? pinDef.capabilities : [];
}

export function pinSupports(boardId: string, pin: string, capability: PinCapability): boolean {
  const capabilities = getPinCapabilities(boardId, pin);
  return capabilities.includes(capability);
}

export * from './types';
export { ArduinoUno } from './arduino_uno';
export { ESP32 } from './esp32';
