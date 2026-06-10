import { ComponentDefinition } from '../types';

export const SoilMoistureComponent: ComponentDefinition = {
  id: 'soil_moisture',
  name: 'Soil Moisture Sensor',
  category: 'sensor',
  description: 'Soil moisture detection sensor',
  icon: '🌱',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'do', label: 'D0', signal: 'digital_output' },
    { id: 'ao', label: 'A0', signal: 'analog_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'moisture', label: 'Moisture Level', type: 'int' }
  ],
  tags: ['moisture', 'soil', 'agriculture'],
  editable: true
};
