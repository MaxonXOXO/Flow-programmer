import { getBoard, getTarget, getMCU, CanonicalBoardDefinition, TargetDefinition, MCUDefinition } from '../registry/boards';
import { ProjectHardwareConfig } from './types';

export interface HardwareValidationResult {
  valid: boolean;
  board?: CanonicalBoardDefinition;
  target?: TargetDefinition;
  boardMcu?: MCUDefinition;
  targetMcu?: MCUDefinition;
  errors: string[];
  warnings: string[];
}

/**
 * Returns the default targetId for a given boardId.
 */
export function getDefaultTargetForBoard(boardId: string): string {
  const board = getBoard(boardId);
  if (board && board.targetId) {
    return board.targetId;
  }
  const normalized = boardId.toLowerCase().replace(/-/g, '_');
  if (normalized.includes('esp32')) return 'esp32_arduino';
  if (normalized.includes('esp8266') || normalized.includes('nodemcu')) return 'esp8266_arduino';
  if (normalized.includes('stm32') || normalized.includes('bluepill')) return 'stm32_arduino';
  if (normalized.includes('pico') || normalized.includes('rp2040')) return 'pico_sdk';
  if (normalized.includes('mega')) return 'arduino_mega';
  return 'arduino_uno';
}

/**
 * Validates a ProjectHardwareConfig object for consistency, board existence, target existence,
 * and MCU compatibility between the selected Board and Target.
 */
export function validateProjectHardware(hardware: ProjectHardwareConfig): HardwareValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hardware || typeof hardware !== 'object') {
    return {
      valid: false,
      errors: ['Hardware configuration is missing or invalid.'],
      warnings: [],
    };
  }

  if (!hardware.boardId || typeof hardware.boardId !== 'string') {
    errors.push('Hardware configuration must specify a valid "boardId".');
  }

  if (!hardware.targetId || typeof hardware.targetId !== 'string') {
    errors.push('Hardware configuration must specify a valid "targetId".');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 1. Resolve Board
  const board = getBoard(hardware.boardId);
  if (!board) {
    errors.push(`Unrecognized board "${hardware.boardId}". Board is not registered in the board registry.`);
  }

  // 2. Resolve Target
  const target = getTarget(hardware.targetId);
  if (!target) {
    errors.push(`Unrecognized target "${hardware.targetId}". Target is not registered in the target registry.`);
  }

  if (!board || !target) {
    return { valid: false, board, target, errors, warnings };
  }

  // 3. Resolve MCUs
  const boardMcu = getMCU(board.mcuId);
  const targetMcu = getMCU(target.mcuId);

  if (!boardMcu) {
    warnings.push(`Board "${board.name}" references unknown MCU ID "${board.mcuId}".`);
  }
  if (!targetMcu) {
    warnings.push(`Target "${target.name}" references unknown MCU ID "${target.mcuId}".`);
  }

  // 4. Validate Board MCU vs Target MCU compatibility
  if (boardMcu && targetMcu) {
    // If target is 'generic', it is universal across all MCUs
    if (target.id !== 'generic') {
      // Check architecture match
      if (boardMcu.architecture !== targetMcu.architecture) {
        errors.push(
          `Hardware Incompatibility: Board "${board.name}" (Architecture: ${boardMcu.architecture}) cannot execute target "${target.name}" (Architecture: ${targetMcu.architecture}).`
        );
      } else if (board.mcuId !== target.mcuId) {
        warnings.push(
          `MCU Warning: Board "${board.name}" MCU (${boardMcu.name}) differs from target "${target.name}" designated MCU (${targetMcu.name}).`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    board,
    target,
    boardMcu,
    targetMcu,
    errors,
    warnings,
  };
}
