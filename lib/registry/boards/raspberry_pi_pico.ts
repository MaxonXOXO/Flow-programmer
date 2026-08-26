import { CanonicalBoardDefinition } from './types';

export const RaspberryPiPico: CanonicalBoardDefinition = {
  id: 'raspberry_pi_pico',
  name: 'Raspberry Pi Pico',
  manufacturer: 'Raspberry Pi Foundation',
  targetId: 'pico_sdk',
  mcuId: 'rp2040',
  architecture: 'arm_cortex_m',
  mcu: 'RP2040',
  frequency: '133MHz',
  pins: {
    GP0: { id: 'GP0', label: 'GP0 / TX0', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'uart_tx', 'i2c_sda'], voltage: '3.3V' },
    GP1: { id: 'GP1', label: 'GP1 / RX0', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'uart_rx', 'i2c_scl'], voltage: '3.3V' },
    GP2: { id: 'GP2', label: 'GP2', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_sda', 'spi_sck'], voltage: '3.3V' },
    GP3: { id: 'GP3', label: 'GP3', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_scl', 'spi_mosi'], voltage: '3.3V' },
    GP4: { id: 'GP4', label: 'GP4 / SDA0', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_sda', 'spi_miso'], voltage: '3.3V' },
    GP5: { id: 'GP5', label: 'GP5 / SCL0', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_scl', 'spi_cs'], voltage: '3.3V' },
    GP25: { id: 'GP25', label: 'GP25 / LED', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm'], voltage: '3.3V' },
    GP26: { id: 'GP26', label: 'GP26 / A0', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm'], voltage: '3.3V' },
    GP27: { id: 'GP27', label: 'GP27 / A1', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm'], voltage: '3.3V' },
    GP28: { id: 'GP28', label: 'GP28 / A2', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm'], voltage: '3.3V' },
    '3.3V': { id: '3.3V', label: '3V3(OUT)', capabilities: ['power', 'power_3v3'], voltage: '3.3V' },
    VSYS: { id: 'VSYS', label: 'VSYS', capabilities: ['power', 'power_vin'], voltage: '5V' },
    VBUS: { id: 'VBUS', label: 'VBUS (5V USB)', capabilities: ['power', 'power_5v'], voltage: '5V' },
    GND: { id: 'GND', label: 'GND', capabilities: ['ground'] },
  },
  buses: {
    i2c: {
      sda: 'GP4',
      scl: 'GP5',
    },
    spi: {
      miso: 'GP4',
      mosi: 'GP3',
      sck: 'GP2',
    },
    uart: {
      tx: 'GP0',
      rx: 'GP1',
      baudRate: 115200,
    },
  },
  defaultLayout: {
    width: 280,
    height: 420,
    pinGroups: [
      { name: 'Left Header', side: 'left', pinIds: ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND'] },
      { name: 'Right Header', side: 'right', pinIds: ['VBUS', 'VSYS', 'GND', '3.3V', 'GP28', 'GP27', 'GP26', 'GP25', 'GND'] },
    ],
  },
};
