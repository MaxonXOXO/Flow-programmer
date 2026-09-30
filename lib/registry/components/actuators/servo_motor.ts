import { PackageDefinition } from '../types';

export const ServoMotorPackage: PackageDefinition = {
  id: 'servo_motor',
  version: '1.0.0',

  metadata: {
    id: 'servo_motor',
    name: 'Servo Motor',
    description: 'Angular position controlled motor (0°–180°)',
    category: 'actuator',
    icon: '🔧',
    tags: ['servo', 'motor', 'angular', 'position'],
  },

  pins: [
    { id: 'vcc',    label: 'VCC',    signal: 'power',     required: true },
    { id: 'signal', label: 'Signal', signal: 'pwm_input', required: true },
    { id: 'gnd',    label: 'GND',    signal: 'ground',    required: true },
  ],

  outputs: [],

  properties: [
    {
      id: 'signalPin',
      label: 'Signal Pin',
      type: 'pin',
      defaultValue: '',
      description: 'Arduino PWM-capable pin connected to the servo signal wire',
    },
  ],

  dependencies: {
    includes: ['Servo.h'],
    globals:  ['Servo myServo'],
    setup:    ['myServo.attach($signalPin)'],
  },

  implementation: { strategy: 'builtin', type: 'builtin' },
};
