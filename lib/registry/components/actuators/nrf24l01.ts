import { ComponentDefinition } from '../types';

export const NRF24L01Component: ComponentDefinition = {
  id: 'nrf24l01',
  name: 'NRF24L01',
  category: 'communication',
  description: '2.4GHz RF transceiver module',
  icon: '📡',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'gnd', label: 'GND', signal: 'ground' },
    { id: 'ce', label: 'CE', signal: 'digital_input' },
    { id: 'csn', label: 'CSN', signal: 'digital_input' },
    { id: 'sck', label: 'SCK', signal: 'spi' },
    { id: 'mosi', label: 'MOSI', signal: 'spi' },
    { id: 'miso', label: 'MISO', signal: 'spi' }
  ],
  tags: ['nrf24', 'comms', 'rf', 'wireless', 'spi']
};
