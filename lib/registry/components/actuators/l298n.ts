import { ComponentDefinition } from '../types';

export const L298NComponent: ComponentDefinition = {
  id: 'l298n',
  name: 'L298N Motor Driver',
  category: 'motor_driver',
  description: 'Dual H-Bridge motor driver',
  icon: '⚙',
  pins: [
    { id: 'vcc', label: 'VCC (12V)', signal: 'power' },
    { id: 'gnd', label: 'GND', signal: 'ground' },
    { id: '5v', label: '5V Out', signal: 'power' },
    { id: 'ena', label: 'ENA', signal: 'pwm_input' },
    { id: 'in1', label: 'IN1', signal: 'digital_input' },
    { id: 'in2', label: 'IN2', signal: 'digital_input' },
    { id: 'in3', label: 'IN3', signal: 'digital_input' },
    { id: 'in4', label: 'IN4', signal: 'digital_input' },
    { id: 'enb', label: 'ENB', signal: 'pwm_input' },
    { id: 'out1', label: 'OUT1', signal: 'power' },
    { id: 'out2', label: 'OUT2', signal: 'power' },
    { id: 'out3', label: 'OUT3', signal: 'power' },
    { id: 'out4', label: 'OUT4', signal: 'power' }
  ],
  tags: ['motor', 'driver', 'l298n', 'h-bridge']
};
