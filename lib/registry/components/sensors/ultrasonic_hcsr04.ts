import { PackageDefinition } from '../types';

export const UltrasonicHCSR04Package: PackageDefinition = {
  metadata: {
    id: 'ultrasonic_hcsr04',
    name: 'Ultrasonic HC-SR04',
    description: 'Ultrasonic distance sensor â€” measures distance via echo timing',
    category: 'sensor',
    icon: 'ðŸ“¡',
    tags: ['distance', 'ultrasonic', 'hcsr04'],
  },

  pins: [
    { id: 'vcc',  label: 'VCC',  signal: 'power',          required: true },
    { id: 'trig', label: 'TRIG', signal: 'digital_input',  required: true },
    { id: 'echo', label: 'ECHO', signal: 'digital_output', required: true },
    { id: 'gnd',  label: 'GND',  signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'distance', label: 'Distance', type: 'float', description: 'Measured distance in centimetres' },
  ],

  properties: [
    {
      id: 'trigPin',
      label: 'Trigger Pin',
      type: 'pin',
      defaultValue: '',
      description: 'Arduino pin connected to the TRIG pin of the sensor',
    },
    {
      id: 'echoPin',
      label: 'Echo Pin',
      type: 'pin',
      defaultValue: '',
      description: 'Arduino pin connected to the ECHO pin of the sensor',
    },
  ],

  dependencies: {
    includes: [],
    globals:  [],
    // pinMode calls are emitted by the compiler using the $trigPin / $echoPin property values
    setup: [
      'pinMode($trigPin, OUTPUT)',
      'pinMode($echoPin, INPUT)',
    ],
  },

  implementation: { type: 'builtin' },
};
