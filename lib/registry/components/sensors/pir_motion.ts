import { ComponentDefinition } from '../types';

export const PIRMotionComponent: ComponentDefinition = {
  id: 'pir_motion',
  name: 'PIR Motion Sensor',
  category: 'sensor',
  description: 'Passive infrared motion sensor',
  icon: '👁',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'out', label: 'OUT', signal: 'digital_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'motion', label: 'Motion Detected', type: 'bool' }
  ],
  tags: ['motion', 'security']
};
