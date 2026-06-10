import { ComponentDefinition } from '../types';

export const WaterLevelComponent: ComponentDefinition = {
  id: 'water_level',
  name: 'Water Level Sensor',
  category: 'sensor',
  description: 'Water level detection sensor',
  icon: '💧',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'out', label: 'OUT', signal: 'analog_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'waterLevel', label: 'Water Level', type: 'int' }
  ],
  tags: ['water', 'level', 'liquid'],
  editable: true
};
