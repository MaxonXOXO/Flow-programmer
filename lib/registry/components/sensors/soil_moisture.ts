import { PackageDefinition } from '../types';

export const SoilMoisturePackage: PackageDefinition = {
  metadata: {
    id: 'soil_moisture',
    name: 'Soil Moisture Sensor',
    description: 'Capacitive or resistive soil moisture detection sensor',
    category: 'sensor',
    icon: 'ðŸŒ±',
    tags: ['moisture', 'soil', 'agriculture', 'plant'],
  },

  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power',          required: true },
    { id: 'do',  label: 'D0',  signal: 'digital_output', required: false },
    { id: 'ao',  label: 'A0',  signal: 'analog_output',  required: false },
    { id: 'gnd', label: 'GND', signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'moisture', label: 'Moisture Level', type: 'int', description: 'Raw analog moisture value (0â€“1023; lower = wetter on resistive sensors)' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { type: 'builtin' },
};
