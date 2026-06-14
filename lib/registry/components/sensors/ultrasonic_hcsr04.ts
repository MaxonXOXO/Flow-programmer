import { ComponentDefinition } from '../types';

export const UltrasonicHCSR04Component: ComponentDefinition = {
  id: 'ultrasonic_hcsr04',
  name: 'Ultrasonic HC-SR04',
  category: 'sensor',
  description: 'Ultrasonic distance sensor',
  icon: '📡',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'trig', label: 'TRIG', signal: 'digital_input' },
    { id: 'echo', label: 'ECHO', signal: 'digital_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'distance', label: 'Distance', type: 'float' }
  ],
  tags: ['distance', 'ultrasonic'],
  dependencies: {
    includes: [],
    globals: [],
    setup: []
  },
  packageId: 'ultrasonic_hcsr04'
};

