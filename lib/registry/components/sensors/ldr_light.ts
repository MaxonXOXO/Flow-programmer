import { ComponentDefinition } from '../types';

export const LDRLightComponent: ComponentDefinition = {
  id: 'ldr_light',
  name: 'LDR Light Sensor',
  category: 'sensor',
  description: 'Light dependent resistor sensor',
  icon: '☀',
  pins: [
    { id: 'pin1', label: 'Pin 1', signal: 'analog_output' },
    { id: 'pin2', label: 'Pin 2', signal: 'ground' }
  ],
  outputs: [
    { id: 'lightLevel', label: 'Light Level', type: 'int' }
  ],
  tags: ['light', 'ambient']
};
