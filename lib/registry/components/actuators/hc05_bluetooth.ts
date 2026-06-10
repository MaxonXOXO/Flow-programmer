import { ComponentDefinition } from '../types';

export const HC05BluetoothComponent: ComponentDefinition = {
  id: 'hc05_bluetooth',
  name: 'HC-05 Bluetooth',
  category: 'communication',
  description: 'Bluetooth serial communication module',
  icon: '📶',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'gnd', label: 'GND', signal: 'ground' },
    { id: 'tx', label: 'TX', signal: 'uart' },
    { id: 'rx', label: 'RX', signal: 'uart' }
  ],
  tags: ['bluetooth', 'comms', 'serial', 'wireless']
};
