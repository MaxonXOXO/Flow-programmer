import { PackageDefinition } from '../types';

export const HC05BluetoothPackage: PackageDefinition = {
  metadata: {
    id: 'hc05_bluetooth',
    name: 'HC-05 Bluetooth',
    description: 'Bluetooth serial communication module (SPP profile)',
    category: 'communication',
    icon: 'ðŸ“¶',
    tags: ['bluetooth', 'comms', 'serial', 'wireless', 'hc05'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',  required: true },
    { id: 'gnd', label: 'GND', signal: 'ground', required: true },
    { id: 'tx',  label: 'TX',  signal: 'uart',   required: true },
    { id: 'rx',  label: 'RX',  signal: 'uart',   required: true },
  ],

  outputs: [],

  properties: [
    {
      id: 'baudRate',
      label: 'Baud Rate',
      type: 'select',
      defaultValue: 9600,
      options: [
        { label: '9600',   value: 9600   },
        { label: '38400',  value: 38400  },
        { label: '57600',  value: 57600  },
        { label: '115200', value: 115200 },
      ],
      description: 'Serial communication speed â€” must match the module\'s configured baud rate',
    },
  ],

  dependencies: {
    includes: ['SoftwareSerial.h'],
    globals:  ['SoftwareSerial bt($rx, $tx)'],
    setup:    ['bt.begin($baudRate)'],
  },

  implementation: { type: 'builtin' },
};
