/**
 * Flow-IDE Canonical Hardware Model Types
 * Specification Version 2.0 (Phase 5K)
 */

export type ArchitectureId =
  | 'avr'
  | 'xtensa_lx6'
  | 'xtensa_l106'
  | 'arm_cortex_m'
  | 'riscv';

export type LogicVoltage = '5V' | '3.3V' | '1.8V' | 'custom';

export type PinSignalCapability =
  // Basic discrete IO
  | 'digital'
  | 'digital_in'
  | 'digital_out'
  // Analog IO
  | 'analog'
  | 'analog_in'
  | 'analog_out'
  // PWM & Special IO
  | 'pwm'
  | 'interrupt'
  | 'dac'
  | 'touch'
  // Bus Protocols
  | 'i2c_sda'
  | 'i2c_scl'
  | 'spi_mosi'
  | 'spi_miso'
  | 'spi_sck'
  | 'spi_cs'
  | 'uart_rx'
  | 'uart_tx'
  // Power Rails
  | 'power'
  | 'power_5v'
  | 'power_3v3'
  | 'power_vin'
  | 'ground';

export type PinCapability = PinSignalCapability; // Backward compatibility alias

export interface PinDefinition {
  capabilities: PinSignalCapability[];
  voltage?: LogicVoltage;
  maxCurrentMa?: number;
  internalPullUp?: boolean;
  internalPullDown?: boolean;
  isStrappingPin?: boolean;
  isReserved?: boolean;
  warningMessage?: string;
}

export interface BoardPinDefinition extends PinDefinition {
  id: string;
  label: string;
  physicalNumber?: number;
}

export interface BusDefinition {
  sda?: string;
  scl?: string;
  miso?: string;
  mosi?: string;
  sck?: string;
  tx?: string;
  rx?: string;
  baudRate?: number;
}

export interface MCUDefinition {
  id: string;
  name: string;
  architecture: ArchitectureId;
  coreCount: number;
  clockFrequencyHz: number;
  flashSizeBytes: number;
  sramSizeBytes: number;
  eepromSizeBytes?: number;
  adcResolutionBits: number;
  dacResolutionBits?: number;
  pwmResolutionBits?: number;
  hardwareTimers: number;
}

export interface TargetDefinition {
  id: string;
  name: string;
  mcuId: string;
  defaultCompiler: string;
  supportedCompilers: string[];
  capabilities: string[];
}

export interface CanonicalBoardDefinition {
  id: string;
  name: string;
  manufacturer?: string;
  targetId: string;
  mcuId: string;
  
  // Backward compatibility fields
  mcu?: string | MCUDefinition;
  architecture?: string | ArchitectureId;
  frequency?: string;

  pins: Record<string, BoardPinDefinition>;

  buses?: {
    i2c?: Array<{ id: string; sda: string; scl: string }> | BusDefinition;
    spi?: Array<{ id: string; mosi: string; miso: string; sck: string }> | BusDefinition;
    uart?: Array<{ id: string; tx: string; rx: string; baudRate?: number }> | BusDefinition;
  };

  defaultLayout?: {
    width: number;
    height: number;
    pinGroups: Array<{
      name: string;
      side: 'left' | 'right' | 'top' | 'bottom';
      pinIds: string[];
    }>;
  };
}

export type BoardDefinition = CanonicalBoardDefinition; // Backward compatibility alias
