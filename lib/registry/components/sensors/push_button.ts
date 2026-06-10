import { ComponentDefinition } from '../types';

export const PushButtonComponent: ComponentDefinition = {
  id: 'push_button',
  name: 'Push Button',
  category: 'sensor',
  description: 'Tactile push button switch',
  icon: '⬛',
  pins: [
    { id: 'pin1', label: 'Pin 1', signal: 'digital_output' },
    { id: 'pin2', label: 'Pin 2', signal: 'ground' }
  ],
  outputs: [
    { id: 'pressed', label: 'Is Pressed', type: 'bool' }
  ],
  tags: ['button', 'input', 'switch']
};
