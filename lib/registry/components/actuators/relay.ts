import { PackageDefinition } from '../types';

export const RelayPackage: PackageDefinition = {
  id: 'relay',
  version: '1.0.0',

  metadata: {
    id: 'relay',
    name: 'Relay',
    description: 'Electromagnetic relay switch — controls high-voltage/high-current loads',
    category: 'actuator',
    icon: '⚡',
    tags: ['relay', 'switch', 'high-voltage', 'actuator'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',         required: true },
    { id: 'in',  label: 'IN',  signal: 'digital_input', required: true },
    { id: 'gnd', label: 'GND', signal: 'ground',        required: true },
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
