import { PackageDefinition } from '../types';

export const NRF24L01Package: PackageDefinition = {
  id: 'nrf24l01',
  version: '1.0.0',

  metadata: {
    id: 'nrf24l01',
    name: 'NRF24L01',
    description: '2.4 GHz RF transceiver module — peer-to-peer wireless communication',
    category: 'communication',
    icon: '📡',
    tags: ['nrf24', 'comms', 'rf', 'wireless', 'spi', '2.4ghz'],
  },

  pins: [
    { id: 'vcc',  label: 'VCC',  signal: 'power',         required: true },
    { id: 'gnd',  label: 'GND',  signal: 'ground',        required: true },
    { id: 'ce',   label: 'CE',   signal: 'digital_input', required: true },
    { id: 'csn',  label: 'CSN',  signal: 'digital_input', required: true },
    { id: 'sck',  label: 'SCK',  signal: 'spi',           required: true },
    { id: 'mosi', label: 'MOSI', signal: 'spi',           required: true },
    { id: 'miso', label: 'MISO', signal: 'spi',           required: true },
  ],

  outputs: [],

  properties: [
    {
      id: 'channel',
      label: 'RF Channel',
      type: 'number',
      defaultValue: 76,
      min: 0,
      max: 125,
      description: 'RF channel (0–125). Must be the same on both transmitter and receiver',
    },
    {
      id: 'address',
      label: 'Pipe Address',
      type: 'string',
      defaultValue: '00001',
      description: '5-character pipe address string — must match on both ends',
    },
  ],

  dependencies: {
    includes: ['SPI.h', 'nRF24L01.h', 'RF24.h'],
    globals:  ['RF24 radio($ce, $csn)'],
    setup: [
      'radio.begin()',
      'radio.setChannel($channel)',
      'radio.openWritingPipe((byte*)$address, 5)',
      'radio.setPALevel(RF24_PA_LOW)',
    ],
  },

  implementation: { strategy: 'builtin', type: 'builtin' },
};
