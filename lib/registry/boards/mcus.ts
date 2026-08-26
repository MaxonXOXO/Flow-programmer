import { MCUDefinition } from './types';

export const ATMEGA328P: MCUDefinition = {
  id: 'atmega328p',
  name: 'ATmega328P',
  architecture: 'avr',
  coreCount: 1,
  clockFrequencyHz: 16_000_000,
  flashSizeBytes: 32_768,      // 32 KB
  sramSizeBytes: 2_048,        // 2 KB
  eepromSizeBytes: 1_024,      // 1 KB
  adcResolutionBits: 10,
  pwmResolutionBits: 8,
  hardwareTimers: 3,
};

export const ATMEGA2560: MCUDefinition = {
  id: 'atmega2560',
  name: 'ATmega2560',
  architecture: 'avr',
  coreCount: 1,
  clockFrequencyHz: 16_000_000,
  flashSizeBytes: 262_144,     // 256 KB
  sramSizeBytes: 8_192,        // 8 KB
  eepromSizeBytes: 4_096,      // 4 KB
  adcResolutionBits: 10,
  pwmResolutionBits: 8,
  hardwareTimers: 6,
};

export const ESP32_WROOM_32: MCUDefinition = {
  id: 'esp32_wroom_32',
  name: 'ESP32-WROOM-32 (Xtensa LX6 Dual-Core)',
  architecture: 'xtensa_lx6',
  coreCount: 2,
  clockFrequencyHz: 240_000_000,
  flashSizeBytes: 4_194_304,   // 4 MB
  sramSizeBytes: 532_480,      // 520 KB
  adcResolutionBits: 12,
  dacResolutionBits: 8,
  pwmResolutionBits: 16,
  hardwareTimers: 4,
};

export const ESP8266EX: MCUDefinition = {
  id: 'esp8266ex',
  name: 'ESP8266EX (Tensilica L106)',
  architecture: 'xtensa_l106',
  coreCount: 1,
  clockFrequencyHz: 80_000_000,
  flashSizeBytes: 4_194_304,   // 4 MB external flash typical
  sramSizeBytes: 81_920,       // 80 KB
  adcResolutionBits: 10,
  pwmResolutionBits: 10,
  hardwareTimers: 2,
};

export const STM32F103C8T6: MCUDefinition = {
  id: 'stm32f103c8t6',
  name: 'STM32F103C8T6 (ARM Cortex-M3)',
  architecture: 'arm_cortex_m',
  coreCount: 1,
  clockFrequencyHz: 72_000_000,
  flashSizeBytes: 65_536,      // 64 KB
  sramSizeBytes: 20_480,       // 20 KB
  adcResolutionBits: 12,
  pwmResolutionBits: 16,
  hardwareTimers: 4,
};

export const RP2040: MCUDefinition = {
  id: 'rp2040',
  name: 'RP2040 (ARM Cortex-M0+ Dual-Core)',
  architecture: 'arm_cortex_m',
  coreCount: 2,
  clockFrequencyHz: 133_000_000,
  flashSizeBytes: 2_097_152,   // 2 MB external flash typical
  sramSizeBytes: 270_336,      // 264 KB
  adcResolutionBits: 12,
  pwmResolutionBits: 16,
  hardwareTimers: 8,
};

export const CANONICAL_MCUS: Record<string, MCUDefinition> = {
  atmega328p: ATMEGA328P,
  atmega2560: ATMEGA2560,
  esp32_wroom_32: ESP32_WROOM_32,
  esp8266ex: ESP8266EX,
  stm32f103c8t6: STM32F103C8T6,
  rp2040: RP2040,
};
