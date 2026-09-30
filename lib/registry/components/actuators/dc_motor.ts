import { PackageDefinition } from '../types';

export const DCMotorPackage: PackageDefinition = {
  id: 'dc_motor',
  version: '1.0.0',

  metadata: {
    id: 'dc_motor',
    name: 'DC Motor',
    description: 'Standard brushed DC motor — requires a motor driver to operate',
    category: 'actuator',
    icon: '⚙️',
    tags: ['motor', 'dc', 'actuator', 'brushed'],
  },

  pins: [
    { id: 'pos', label: '+', signal: 'power',  required: true },
    { id: 'neg', label: '-', signal: 'ground', required: true },
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
