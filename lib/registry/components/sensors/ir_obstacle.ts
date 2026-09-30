import { PackageDefinition } from '../types';

export const IRObstaclePackage: PackageDefinition = {
  id: 'ir_obstacle',
  version: '1.0.0',

  metadata: {
    id: 'ir_obstacle',
    name: 'IR Obstacle Sensor',
    description: 'Infrared obstacle avoidance sensor — detects objects in front',
    category: 'sensor',
    icon: '👁️',
    tags: ['obstacle', 'infrared', 'avoidance', 'ir'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',          required: true },
    { id: 'out', label: 'OUT', signal: 'digital_output', required: true },
    { id: 'gnd', label: 'GND', signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'obstacle', label: 'Obstacle Detected', type: 'bool', description: 'True when an obstacle is detected' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { strategy: 'builtin', type: 'builtin' },
};
