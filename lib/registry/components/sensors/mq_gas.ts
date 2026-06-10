import { ComponentDefinition } from '../types';

export const MQGasComponent: ComponentDefinition = {
  id: 'mq_gas',
  name: 'MQ Gas Sensor',
  category: 'sensor',
  description: 'Gas concentration and air quality sensor',
  icon: '💨',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'do', label: 'D0', signal: 'digital_output' },
    { id: 'ao', label: 'A0', signal: 'analog_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'gasLevel', label: 'Gas Level', type: 'int' }
  ],
  tags: ['gas', 'air', 'safety'],
  editable: true
};
