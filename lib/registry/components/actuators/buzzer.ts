import { PackageDefinition } from '../types';

export const BuzzerPackage: PackageDefinition = {
  id: 'buzzer',
  version: '1.0.0',

  metadata: {
    id: 'buzzer',
    name: 'Buzzer',
    description: 'Piezoelectric buzzer — emits tone on digital HIGH',
    category: 'actuator',
    icon: '🔔',
    tags: ['buzzer', 'sound', 'beeper', 'tone', 'alarm'],
  },

  pins: [
    { id: 'pos', label: '+', signal: 'digital_input', required: true },
    { id: 'neg', label: '-', signal: 'ground',        required: true },
  ],

  outputs: [],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { strategy: 'builtin', type: 'builtin' },
};
