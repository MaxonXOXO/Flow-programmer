import { ComponentDefinition } from '../types';

export const OLEDDisplayComponent: ComponentDefinition = {
  id: 'oled_display',
  name: 'OLED Display',
  category: 'display',
  description: '128x64 OLED graphic display via I2C',
  icon: '🖥',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'sda', label: 'SDA', signal: 'i2c' },
    { id: 'scl', label: 'SCL', signal: 'i2c' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  tags: ['oled', 'display', 'graphics', 'i2c']
};
