import { PackageDefinition } from '../types';

export const PIRMotionPackage: PackageDefinition = {
  metadata: {
    id: 'pir_motion',
    name: 'PIR Motion Sensor',
    description: 'Passive infrared motion sensor â€” detects nearby movement',
    category: 'sensor',
    icon: 'ðŸ‘',
    tags: ['motion', 'pir', 'security'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',          required: true },
    { id: 'out', label: 'OUT', signal: 'digital_output', required: true },
    { id: 'gnd', label: 'GND', signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'motion', label: 'Motion Detected', type: 'bool', description: 'True when motion is detected' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
