import { ComponentDefinition } from '../types';

export const RelayComponent: ComponentDefinition = {
  id: 'relay',
  name: 'Relay',
  category: 'actuator',
  description: 'Electromagnetic relay switch',
  icon: '⚡',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'in', label: 'IN', signal: 'digital_input' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  tags: ['relay', 'switch', 'high-voltage']
};
