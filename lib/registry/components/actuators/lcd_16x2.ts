import { PackageDefinition } from '../types';

export const LCD16x2Package: PackageDefinition = {
  metadata: {
    id: 'lcd_16x2',
    name: 'LCD 16x2',
    description: '16-column Ã— 2-row liquid crystal display via I2C backpack',
    category: 'display',
    icon: 'ðŸ“º',
    tags: ['lcd', 'display', 'text', 'i2c', '16x2'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',  required: true },
    { id: 'sda', label: 'SDA', signal: 'i2c',    required: true },
    { id: 'scl', label: 'SCL', signal: 'i2c',    required: true },
    { id: 'gnd', label: 'GND', signal: 'ground', required: true },
  ],

  outputs: [],

  properties: [
    {
      id: 'address',
      label: 'I2C Address',
      type: 'string',
      defaultValue: '0x27',
      description: 'I2C address of the LCD backpack (commonly 0x27 or 0x3F)',
    },
    {
      id: 'cols',
      label: 'Columns',
      type: 'number',
      defaultValue: 16,
      min: 8,
      max: 40,
      description: 'Number of character columns on the display',
    },
    {
      id: 'rows',
      label: 'Rows',
      type: 'number',
      defaultValue: 2,
      min: 1,
      max: 4,
      description: 'Number of character rows on the display',
    },
  ],

  dependencies: {
    includes: ['Wire.h', 'LiquidCrystal_I2C.h'],
    globals:  ['LiquidCrystal_I2C lcd($address, $cols, $rows)'],
    setup:    ['lcd.init()', 'lcd.backlight()'],
  },

  implementation: { type: 'builtin' },
};
