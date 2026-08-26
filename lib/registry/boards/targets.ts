import { TargetDefinition } from './types';

export const TARGET_ARDUINO_UNO: TargetDefinition = {
  id: 'arduino_uno',
  name: 'Arduino Uno (AVR C++)',
  mcuId: 'atmega328p',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp', 'avr_c'],
  capabilities: ['gpio', 'adc_10bit', 'hardware_uart', 'hardware_i2c', 'hardware_spi', 'eeprom'],
};

export const TARGET_ARDUINO_MEGA: TargetDefinition = {
  id: 'arduino_mega',
  name: 'Arduino Mega 2560 (AVR C++)',
  mcuId: 'atmega2560',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp', 'avr_c'],
  capabilities: ['gpio', 'adc_10bit', 'hardware_uart_4x', 'hardware_i2c', 'hardware_spi', 'eeprom'],
};

export const TARGET_ESP32_ARDUINO: TargetDefinition = {
  id: 'esp32_arduino',
  name: 'ESP32 (Arduino Core)',
  mcuId: 'esp32_wroom_32',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp', 'esp_idf'],
  capabilities: ['gpio', 'adc_12bit', 'dac_8bit', 'wifi', 'ble', 'freertos', 'hardware_i2c', 'hardware_spi', 'hardware_uart_3x', 'touch', 'ledc_pwm'],
};

export const TARGET_ESP32_IDF: TargetDefinition = {
  id: 'esp32_idf',
  name: 'ESP32 (ESP-IDF Native)',
  mcuId: 'esp32_wroom_32',
  defaultCompiler: 'esp_idf',
  supportedCompilers: ['esp_idf', 'arduino_cpp'],
  capabilities: ['gpio', 'adc_12bit', 'dac_8bit', 'wifi', 'ble', 'freertos', 'hardware_i2c', 'hardware_spi', 'hardware_uart_3x', 'touch'],
};

export const TARGET_ESP8266_ARDUINO: TargetDefinition = {
  id: 'esp8266_arduino',
  name: 'ESP8266 (Arduino Core)',
  mcuId: 'esp8266ex',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp'],
  capabilities: ['gpio', 'adc_10bit', 'wifi', 'hardware_uart', 'hardware_i2c', 'hardware_spi'],
};

export const TARGET_STM32_ARDUINO: TargetDefinition = {
  id: 'stm32_arduino',
  name: 'STM32 (Arduino Core)',
  mcuId: 'stm32f103c8t6',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp', 'stm32_hal'],
  capabilities: ['gpio', 'adc_12bit', 'hardware_i2c', 'hardware_spi', 'hardware_uart_3x', 'usb_device'],
};

export const TARGET_STM32_HAL: TargetDefinition = {
  id: 'stm32_hal',
  name: 'STM32 (HAL C / CubeMX)',
  mcuId: 'stm32f103c8t6',
  defaultCompiler: 'stm32_hal',
  supportedCompilers: ['stm32_hal', 'arduino_cpp'],
  capabilities: ['gpio', 'adc_12bit', 'hardware_i2c', 'hardware_spi', 'hardware_uart_3x', 'usb_device', 'dma'],
};

export const TARGET_PICO_SDK: TargetDefinition = {
  id: 'pico_sdk',
  name: 'Raspberry Pi Pico (C/C++ SDK)',
  mcuId: 'rp2040',
  defaultCompiler: 'pico_sdk',
  supportedCompilers: ['pico_sdk', 'arduino_cpp'],
  capabilities: ['gpio', 'adc_12bit', 'pio', 'dual_core', 'hardware_i2c', 'hardware_spi', 'hardware_uart_2x', 'usb_device'],
};

export const TARGET_GENERIC: TargetDefinition = {
  id: 'generic',
  name: 'Generic Universal Target',
  mcuId: 'atmega328p',
  defaultCompiler: 'arduino_cpp',
  supportedCompilers: ['arduino_cpp'],
  capabilities: ['gpio', 'adc', 'pwm'],
};

export const CANONICAL_TARGETS: Record<string, TargetDefinition> = {
  arduino_uno: TARGET_ARDUINO_UNO,
  arduino_mega: TARGET_ARDUINO_MEGA,
  esp32_arduino: TARGET_ESP32_ARDUINO,
  esp32: TARGET_ESP32_ARDUINO, // Alias for convenience
  esp32_idf: TARGET_ESP32_IDF,
  esp8266_arduino: TARGET_ESP8266_ARDUINO,
  esp8266: TARGET_ESP8266_ARDUINO, // Alias
  stm32_arduino: TARGET_STM32_ARDUINO,
  stm32: TARGET_STM32_ARDUINO, // Alias
  stm32_hal: TARGET_STM32_HAL,
  pico_sdk: TARGET_PICO_SDK,
  generic: TARGET_GENERIC,
};
