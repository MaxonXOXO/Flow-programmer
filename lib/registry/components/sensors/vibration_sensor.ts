import { PackageDefinition } from '../types';

export const VibrationSensorPackage: PackageDefinition = {
  metadata: {
    id: 'vibration_sensor',
    name: 'Vibration Sensor',
    description: 'Vibration and tilt detection sensor (SW-420 or similar)',
    category: 'sensor',
    icon: 'ðŸ“³',
    tags: ['vibration', 'tilt', 'motion', 'sw420'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',          required: true },
    { id: 'do',  label: 'D0',  signal: 'digital_output', required: true },
    { id: 'gnd', label: 'GND', signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'vibration', label: 'Vibration Detected', type: 'bool', description: 'True when vibration or tilt is detected' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
