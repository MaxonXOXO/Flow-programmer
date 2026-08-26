import { CanonicalBoardDefinition } from './types';

export const NodeMCUV2: CanonicalBoardDefinition = {
  id: 'nodemcu_v2',
  name: 'NodeMCU V2 (ESP8266)',
  manufacturer: 'AI-Thinker / Amica',
  targetId: 'esp8266_arduino',
  mcuId: 'esp8266ex',
  architecture: 'xtensa_l106',
  mcu: 'ESP8266EX',
  frequency: '80MHz',
  pins: {
    D0: { id: 'D0', label: 'D0 / GPIO16', capabilities: ['digital', 'digital_in', 'digital_out'], voltage: '3.3V', warningMessage: 'WAKE pin for Deep Sleep' },
    D1: { id: 'D1', label: 'D1 / SCL', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_scl'], voltage: '3.3V' },
    D2: { id: 'D2', label: 'D2 / SDA', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'i2c_sda'], voltage: '3.3V' },
    D3: { id: 'D3', label: 'D3 / FLASH', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm'], voltage: '3.3V', isStrappingPin: true },
    D4: { id: 'D4', label: 'D4 / LED', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'uart_tx'], voltage: '3.3V', isStrappingPin: true },
    D5: { id: 'D5', label: 'D5 / SCK', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'spi_sck'], voltage: '3.3V' },
    D6: { id: 'D6', label: 'D6 / MISO', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'spi_miso'], voltage: '3.3V' },
    D7: { id: 'D7', label: 'D7 / MOSI', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'spi_mosi'], voltage: '3.3V' },
    D8: { id: 'D8', label: 'D8 / CS', capabilities: ['digital', 'digital_in', 'digital_out', 'pwm', 'spi_cs'], voltage: '3.3V', isStrappingPin: true },
    RX: { id: 'RX', label: 'RX / GPIO3', capabilities: ['digital', 'digital_in', 'digital_out', 'uart_rx'], voltage: '3.3V', isReserved: true },
    TX: { id: 'TX', label: 'TX / GPIO1', capabilities: ['digital', 'digital_in', 'digital_out', 'uart_tx'], voltage: '3.3V', isReserved: true },
    A0: { id: 'A0', label: 'A0 (ADC0)', capabilities: ['analog', 'analog_in'], voltage: '3.3V', warningMessage: 'Max input 1.0V (or 3.3V with onboard divider)' },
    '3.3V': { id: '3.3V', label: '3.3V', capabilities: ['power', 'power_3v3'], voltage: '3.3V' },
    VIN: { id: 'VIN', label: 'VIN (5V)', capabilities: ['power', 'power_vin'], voltage: '5V' },
    GND: { id: 'GND', label: 'GND', capabilities: ['ground'] },
  },
  buses: {
    i2c: {
      sda: 'D2',
      scl: 'D1',
    },
    spi: {
      miso: 'D6',
      mosi: 'D7',
      sck: 'D5',
    },
    uart: {
      tx: 'TX',
      rx: 'RX',
      baudRate: 115200,
    },
  },
  defaultLayout: {
    width: 280,
    height: 380,
    pinGroups: [
      { name: 'Left Header', side: 'left', pinIds: ['A0', 'GND', '3.3V', 'D0', 'D1', 'D2', 'D3', 'D4', '3.3V', 'GND'] },
      { name: 'Right Header', side: 'right', pinIds: ['VIN', 'GND', 'TX', 'RX', 'D5', 'D6', 'D7', 'D8', 'GND', '3.3V'] },
    ],
  },
};
