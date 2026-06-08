import { BoardDefinition } from './types';

export const ESP32: BoardDefinition = {
  id: 'esp32',
  name: 'ESP32 DevKitC',
  architecture: 'xtensa',
  mcu: 'ESP32-WROOM-32',
  frequency: '240MHz',
  pins: {
    GPIO0: { capabilities: ['digital'] },
    GPIO2: { capabilities: ['digital', 'pwm'] },
    GPIO4: { capabilities: ['digital', 'analog', 'pwm'] },
    GPIO12: { capabilities: ['digital', 'analog', 'pwm', 'spi_miso'] },
    GPIO13: { capabilities: ['digital', 'analog', 'pwm', 'spi_mosi'] },
    GPIO14: { capabilities: ['digital', 'analog', 'pwm', 'spi_sck'] },
    GPIO15: { capabilities: ['digital', 'analog', 'pwm'] },
    GPIO21: { capabilities: ['digital', 'i2c_sda'] },
    GPIO22: { capabilities: ['digital', 'i2c_scl'] },
    GPIO25: { capabilities: ['digital', 'analog', 'pwm'] },
    GPIO26: { capabilities: ['digital', 'analog', 'pwm'] },
    GPIO27: { capabilities: ['digital', 'analog', 'pwm'] },
    GPIO32: { capabilities: ['digital', 'analog'] },
    GPIO33: { capabilities: ['digital', 'analog'] },
    GPIO34: { capabilities: ['analog'] },
    GPIO35: { capabilities: ['analog'] },
    GPIO36: { capabilities: ['analog'] },
    GPIO39: { capabilities: ['analog'] },
    '5V': { capabilities: ['power'] },
    '3.3V': { capabilities: ['power'] },
    GND: { capabilities: ['ground'] },
  },
  buses: {
    i2c: {
      sda: 'GPIO21',
      scl: 'GPIO22',
    },
    spi: {
      miso: 'GPIO12',
      mosi: 'GPIO13',
      sck: 'GPIO14',
    },
  },
};
