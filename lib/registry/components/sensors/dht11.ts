import { ComponentDefinition } from '../types';

export const DHT11Component: ComponentDefinition = {
  id: 'dht11',
  name: 'DHT Sensor',
  category: 'sensor',
  description: 'Temperature and humidity sensor',
  icon: '🌡',
  pins: [
    {
      id: 'vcc',
      label: 'VCC',
      signal: 'power'
    },
    {
      id: 'data',
      label: 'DATA',
      signal: 'digital_output'
    },
    {
      id: 'gnd',
      label: 'GND',
      signal: 'ground'
    }
  ],
  outputs: [
    {
      id: 'temperature',
      label: 'Temperature',
      type: 'float'
    },
    {
      id: 'humidity',
      label: 'Humidity',
      type: 'float'
    }
  ],
  tags: ['temperature', 'humidity']
};
