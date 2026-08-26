import { CanonicalBoardDefinition } from './types';

export const STM32BluePill: CanonicalBoardDefinition = {
  id: 'stm32_bluepill',
  name: 'STM32 BluePill (F103C8)',
  manufacturer: 'Generic / STMicroelectronics',
  targetId: 'stm32_arduino',
  mcuId: 'stm32f103c8t6',
  architecture: 'arm_cortex_m',
  mcu: 'STM32F103C8T6',
  frequency: '72MHz',
  pins: {
    PA0: { id: 'PA0', label: 'PA0 / A0', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm', 'interrupt'], voltage: '3.3V' },
    PA1: { id: 'PA1', label: 'PA1 / A1', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm', 'interrupt'], voltage: '3.3V' },
    PA2: { id: 'PA2', label: 'PA2 / TX2', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm', 'uart_tx'], voltage: '3.3V' },
    PA3: { id: 'PA3', label: 'PA3 / RX2', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm', 'uart_rx'], voltage: '3.3V' },
    PA4: { id: 'PA4', label: 'PA4 / NSS1', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'spi_cs'], voltage: '3.3V' },
    PA5: { id: 'PA5', label: 'PA5 / SCK1', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'spi_sck'], voltage: '3.3V' },
    PA6: { id: 'PA6', label: 'PA6 / MISO1', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm', 'spi_miso'], voltage: '3.3V' },
    PA7: { id: 'PA7', label: 'PA7 / MOSI1', capabilities: ['digital', 'digital_in', 'digital_out', 'analog', 'analog_in', 'pwm', 'spi_mosi'], voltage: '3.3V' },
    PA8: { id: 'PA8', label: 'PA8', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm'], voltage: '3.3V' },
    PA9: { id: 'PA9', label: 'PA9 / TX1', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'uart_tx'], voltage: '3.3V' },
    PA10: { id: 'PA10', label: 'PA10 / RX1', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'uart_rx'], voltage: '3.3V' },
    PB6: { id: 'PB6', label: 'PB6 / SCL1', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_scl'], voltage: '3.3V' },
    PB7: { id: 'PB7', label: 'PB7 / SDA1', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_sda'], voltage: '3.3V' },
    PC13: { id: 'PC13', label: 'PC13 / LED', capabilities: ['digital', 'digital_in', 'digital_out'], voltage: '3.3V' },
    '3.3V': { id: '3.3V', label: '3.3V', capabilities: ['power', 'power_3v3'], voltage: '3.3V' },
    '5V': { id: '5V', label: '5V', capabilities: ['power', 'power_5v'], voltage: '5V' },
    GND: { id: 'GND', label: 'GND', capabilities: ['ground'] },
  },
  buses: {
    i2c: {
      sda: 'PB7',
      scl: 'PB6',
    },
    spi: {
      miso: 'PA6',
      mosi: 'PA7',
      sck: 'PA5',
    },
    uart: {
      tx: 'PA9',
      rx: 'PA10',
      baudRate: 115200,
    },
  },
  defaultLayout: {
    width: 260,
    height: 400,
    pinGroups: [
      { name: 'Left Header (Port A)', side: 'left', pinIds: ['PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'PA7', 'PA8', 'PA9', 'PA10', '3.3V', 'GND'] },
      { name: 'Right Header (Port B/C)', side: 'right', pinIds: ['PB6', 'PB7', 'PC13', '5V', 'GND'] },
    ],
  },
};
