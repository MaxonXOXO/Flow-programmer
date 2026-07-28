import { PackageDefinition } from '../types';

export const MQGasPackage: PackageDefinition = {
  metadata: {
    id: 'mq_gas',
    name: 'MQ Gas Sensor',
    description: 'Gas concentration and air quality sensor (MQ-2, MQ-135, etc.)',
    category: 'sensor',
    icon: 'ðŸ’¨',
    tags: ['gas', 'air', 'safety', 'mq2', 'mq135'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',          required: true },
    { id: 'do',  label: 'D0',  signal: 'digital_output', required: false },
    { id: 'ao',  label: 'A0',  signal: 'analog_output',  required: false },
    { id: 'gnd', label: 'GND', signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'gasLevel', label: 'Gas Level', type: 'int', description: 'Raw analog gas concentration value (0â€“1023)' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
