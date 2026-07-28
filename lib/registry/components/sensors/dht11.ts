import { PackageDefinition } from '../types';

export const DHT11Package: PackageDefinition = {
  metadata: {
    id: 'dht11',
    name: 'DHT Sensor',
    description: 'Temperature and humidity sensor (DHT11 / DHT22)',
    category: 'sensor',
    icon: 'ðŸŒ¡',
    tags: ['temperature', 'humidity', 'dht11', 'dht22'],
  },

  pins: [
    { id: 'vcc',  label: 'VCC',  signal: 'power' },
    { id: 'data', label: 'DATA', signal: 'digital_output' },
    { id: 'gnd',  label: 'GND',  signal: 'ground' },
  ],

  outputs: [
    { id: 'temperature', label: 'Temperature', type: 'float', description: 'Temperature in Â°C' },
    { id: 'humidity',    label: 'Humidity',    type: 'float', description: 'Relative humidity in %' },
  ],

  properties: [
    // No user-configurable properties â€” pin assignment is handled via SchemaCanvas wiring.
  ],

  dependencies: {
    includes: ['DHT.h'],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
