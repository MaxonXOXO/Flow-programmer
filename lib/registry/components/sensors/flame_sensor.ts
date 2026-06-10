import { ComponentDefinition } from '../types';

export const FlameSensorComponent: ComponentDefinition = {
  id: 'flame_sensor',
  name: 'Flame Sensor',
  category: 'sensor',
  description: 'Flame detection sensor',
  icon: '🔥',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'do', label: 'D0', signal: 'digital_output' },
    { id: 'ao', label: 'A0', signal: 'analog_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'flameDigital', label: 'Flame Detected (Digital)', type: 'bool' },
    { id: 'flameAnalog', label: 'Flame Level (Analog)', type: 'int' }
  ],
  tags: ['flame', 'fire', 'safety'],
  editable: true
};
