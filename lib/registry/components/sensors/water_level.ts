import { PackageDefinition } from '../types';

export const WaterLevelPackage: PackageDefinition = {
  metadata: {
    id: 'water_level',
    name: 'Water Level Sensor',
    description: 'Resistive water level / water presence detection sensor',
    category: 'sensor',
    icon: 'ðŸ’§',
    tags: ['water', 'level', 'liquid', 'flood'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',         required: true },
    { id: 'out', label: 'OUT', signal: 'analog_output', required: true },
    { id: 'gnd', label: 'GND', signal: 'ground',        required: true },
  ],

  outputs: [
    { id: 'waterLevel', label: 'Water Level', type: 'int', description: 'Raw analog water level value (0â€“1023)' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
