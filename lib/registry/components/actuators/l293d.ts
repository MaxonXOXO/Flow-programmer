import { ComponentDefinition } from '../types';

export const L293DComponent: ComponentDefinition = {
  id: 'l293d',
  name: 'L293D Motor Driver',
  category: 'motor_driver',
  description: 'Quadruple half-H drivers motor driver IC',
  icon: '⚙',
  pins: [
    { id: 'vcc1', label: 'VCC1 (5V)', signal: 'power' },
    { id: 'gnd', label: 'GND', signal: 'ground' },
    { id: 'vcc2', label: 'VCC2 (Motor)', signal: 'power' },
    { id: 'en1', label: 'EN1', signal: 'pwm_input' },
    { id: 'in1', label: 'IN1', signal: 'digital_input' },
    { id: 'in2', label: 'IN2', signal: 'digital_input' },
    { id: 'in3', label: 'IN3', signal: 'digital_input' },
    { id: 'in4', label: 'IN4', signal: 'digital_input' },
    { id: 'en2', label: 'EN2', signal: 'pwm_input' },
    { id: 'out1', label: 'OUT1', signal: 'power' },
    { id: 'out2', label: 'OUT2', signal: 'power' },
    { id: 'out3', label: 'OUT3', signal: 'power' },
    { id: 'out4', label: 'OUT4', signal: 'power' }
  ],
  tags: ['motor', 'driver', 'l293d', 'h-bridge']
};
