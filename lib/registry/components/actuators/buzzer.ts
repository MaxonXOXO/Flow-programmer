import { ComponentDefinition } from '../types';

export const BuzzerComponent: ComponentDefinition = {
  id: 'buzzer',
  name: 'Buzzer',
  category: 'actuator',
  description: 'Piezoelectric buzzer',
  icon: '🔔',
  pins: [
    { id: 'pos', label: '+', signal: 'digital_input' },
    { id: 'neg', label: '−', signal: 'ground' }
  ],
  tags: ['buzzer', 'sound', 'beeper']
};
