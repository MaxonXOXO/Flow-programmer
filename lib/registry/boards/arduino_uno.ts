export interface PinDefinition {
  capabilities: ('digital' | 'analog' | 'pwm' | 'uart_rx' | 'uart_tx' | 'i2c_sda' | 'i2c_scl' | 'spi_ss' | 'spi_mosi' | 'spi_miso' | 'spi_sck' | 'power' | 'ground')[];
}

export interface BoardDefinition {
  id: string;
  name: string;
  architecture: string;
  mcu: string;
  frequency: string;
  pins: Record<string, PinDefinition>;
  buses: {
    i2c: { sda: string; scl: string };
    spi: { mosi: string; miso: string; sck: string; ss: string };
  };
}

export const ArduinoUno: BoardDefinition = {
  id: "arduino_uno",
  name: "Arduino Uno",
  architecture: "avr",
  mcu: "ATmega328P",
  frequency: "16MHz",
  pins: {
    "0": { capabilities: ["digital", "uart_rx"] },
    "1": { capabilities: ["digital", "uart_tx"] },
    "2": { capabilities: ["digital"] },
    "3": { capabilities: ["digital", "pwm"] },
    "4": { capabilities: ["digital"] },
    "5": { capabilities: ["digital", "pwm"] },
    "6": { capabilities: ["digital", "pwm"] },
    "7": { capabilities: ["digital"] },
    "8": { capabilities: ["digital"] },
    "9": { capabilities: ["digital", "pwm"] },
    "10": { capabilities: ["digital", "pwm", "spi_ss"] },
    "11": { capabilities: ["digital", "pwm", "spi_mosi"] },
    "12": { capabilities: ["digital", "spi_miso"] },
    "13": { capabilities: ["digital", "spi_sck"] },
    "A0": { capabilities: ["analog", "digital"] },
    "A1": { capabilities: ["analog", "digital"] },
    "A2": { capabilities: ["analog", "digital"] },
    "A3": { capabilities: ["analog", "digital"] },
    "A4": { capabilities: ["analog", "digital", "i2c_sda"] },
    "A5": { capabilities: ["analog", "digital", "i2c_scl"] },
    "5V": { capabilities: ["power"] },
    "3.3V": { capabilities: ["power"] },
    "GND": { capabilities: ["ground"] }
  },
  buses: {
    i2c: {
      sda: "A4",
      scl: "A5"
    },
    spi: {
      mosi: "11",
      miso: "12",
      sck: "13",
      ss: "10"
    }
  }
};
