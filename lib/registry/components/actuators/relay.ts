import { PackageDefinition } from '../types';

export const RelayPackage: PackageDefinition = {
  metadata: {
    id: 'relay',
    name: 'Relay',
    description: 'Electromagnetic relay switch â€” controls high-voltage/high-current loads',
    category: 'actuator',
    icon: 'âš¡',
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

  implementation: { type: 'builtin' },
};
