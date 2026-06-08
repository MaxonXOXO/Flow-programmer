export type PinCapability =
  | 'digital'
  | 'analog'
  | 'pwm'
  | 'i2c_sda'
  | 'i2c_scl'
  | 'spi_mosi'
  | 'spi_miso'
  | 'spi_sck'
  | 'uart_rx'
  | 'uart_tx'
  | 'power'
  | 'ground';

export interface PinDefinition {
  capabilities: PinCapability[];
}

export interface BusDefinition {
  sda?: string;
  scl?: string;
  miso?: string;
  mosi?: string;
  sck?: string;
  tx?: string;
  rx?: string;
}

export interface BoardDefinition {
  id: string;
  name: string;
  architecture: string;
  mcu: string;
  frequency: string;
  pins: Record<string, PinDefinition>;
  buses?: {
    i2c?: BusDefinition;
    spi?: BusDefinition;
    uart?: BusDefinition;
  };
}
