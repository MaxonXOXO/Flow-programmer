import { ComponentDefinition } from '../types';

export const LCD16x2Component: ComponentDefinition = {
  id: 'lcd_16x2',
  name: 'LCD 16x2',
  category: 'display',
  description: '16x2 liquid crystal display via I2C',
  icon: '📺',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'sda', label: 'SDA', signal: 'i2c' },
    { id: 'scl', label: 'SCL', signal: 'i2c' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  tags: ['lcd', 'display', 'text', 'i2c']
};
