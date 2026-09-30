import { PackageDefinition } from '../types';

export const LEDPackage: PackageDefinition = {
  id: 'led',
  version: '1.0.0',

  metadata: {
    id: 'led',
    name: 'LED',
    description: 'Light Emitting Diode — simple digital output indicator',
    category: 'actuator',
    icon: '💡',
    tags: ['led', 'light', 'indicator', 'output'],
  },

  pins: [
    { id: 'anode',   label: 'Anode (+)',   signal: 'digital_input', required: true },
    { id: 'cathode', label: 'Cathode (-)', signal: 'ground',        required: true },
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
