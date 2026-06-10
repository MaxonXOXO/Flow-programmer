import { ComponentDefinition } from '../types';

export const DCMotorComponent: ComponentDefinition = {
  id: 'dc_motor',
  name: 'DC Motor',
  category: 'actuator',
  description: 'Standard DC motor',
  icon: '⚙',
  pins: [
    { id: 'pos', label: '+', signal: 'power' },
    { id: 'neg', label: '−', signal: 'ground' }
  ],
  tags: ['motor', 'dc', 'actuator']
};
