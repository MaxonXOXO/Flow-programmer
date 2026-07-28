import { PackageDefinition } from '../types';

export const DCMotorPackage: PackageDefinition = {
  metadata: {
    id: 'dc_motor',
    name: 'DC Motor',
    description: 'Standard brushed DC motor â€” requires a motor driver to operate',
    category: 'actuator',
    icon: 'âš™',
    tags: ['motor', 'dc', 'actuator', 'brushed'],
  },

  pins: [
    { id: 'pos', label: '+', signal: 'power',  required: true },
    { id: 'neg', label: 'âˆ’', signal: 'ground', required: true },
  ],

  outputs: [],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
