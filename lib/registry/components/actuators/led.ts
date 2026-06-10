import { ComponentDefinition } from '../types';

export const LEDComponent: ComponentDefinition = {
  id: 'led',
  name: 'LED',
  category: 'actuator',
  description: 'Light Emitting Diode',
  icon: '💡',
  pins: [
    { id: 'anode', label: 'Anode (+)', signal: 'digital_input' },
    { id: 'cathode', label: 'Cathode (−)', signal: 'ground' }
  ],
  tags: ['led', 'light', 'indicator']
};
