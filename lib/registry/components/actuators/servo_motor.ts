import { ComponentDefinition } from '../types';

export const ServoMotorComponent: ComponentDefinition = {
  id: 'servo_motor',
  name: 'Servo Motor',
  category: 'actuator',
  description: 'Angular position controlled motor',
  icon: '🔧',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'signal', label: 'Signal', signal: 'pwm_input' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  tags: ['servo', 'motor', 'angular']
};
