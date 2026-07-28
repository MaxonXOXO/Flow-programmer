import { PackageDefinition } from '../types';

export const L298NPackage: PackageDefinition = {
  metadata: {
    id: 'l298n',
    name: 'L298N Motor Driver',
    description: 'Dual H-Bridge motor driver â€” controls two DC motors independently',
    category: 'motor_driver',
    icon: 'âš™',
    tags: ['motor', 'driver', 'l298n', 'h-bridge', 'dc'],
  },

  pins: [
    { id: 'vcc',  label: 'VCC (12V)', signal: 'power',     required: true },
    { id: 'gnd',  label: 'GND',       signal: 'ground',    required: true },
    { id: '5v',   label: '5V Out',    signal: 'power',     required: false },
    { id: 'ena',  label: 'ENA',       signal: 'pwm_input', required: true },
    { id: 'in1',  label: 'IN1',       signal: 'digital_input', required: true },
    { id: 'in2',  label: 'IN2',       signal: 'digital_input', required: true },
    { id: 'in3',  label: 'IN3',       signal: 'digital_input', required: true },
    { id: 'in4',  label: 'IN4',       signal: 'digital_input', required: true },
    { id: 'enb',  label: 'ENB',       signal: 'pwm_input', required: true },
    { id: 'out1', label: 'OUT1',      signal: 'power',     required: false },
    { id: 'out2', label: 'OUT2',      signal: 'power',     required: false },
    { id: 'out3', label: 'OUT3',      signal: 'power',     required: false },
    { id: 'out4', label: 'OUT4',      signal: 'power',     required: false },
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
