import { PackageDefinition } from '../types';

export const PIRMotionPackage: PackageDefinition = {
  id: 'pir_motion',
  version: '1.0.0',

  metadata: {
    id: 'pir_motion',
    name: 'PIR Motion Sensor',
    description: 'Passive infrared motion sensor — detects nearby movement',
    category: 'sensor',
    icon: '🏃',
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

  implementation: { strategy: 'builtin', type: 'builtin' },
};
