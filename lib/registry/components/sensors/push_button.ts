import { PackageDefinition } from '../types';

export const PushButtonPackage: PackageDefinition = {
  id: 'push_button',
  version: '1.0.0',

  metadata: {
    id: 'push_button',
    name: 'Push Button',
    description: 'Tactile momentary push button switch',
    category: 'sensor',
    icon: '🔘',
    tags: ['button', 'input', 'switch', 'tactile'],
  },

  pins: [
    { id: 'pin1', label: 'Pin 1', signal: 'digital_output', required: true },
    { id: 'pin2', label: 'Pin 2', signal: 'ground',         required: true },
  ],

  outputs: [
    { id: 'pressed', label: 'Is Pressed', type: 'bool', description: 'True while the button is held down' },
  ],

  properties: [],

  dependencies: {
    includes: [],
    globals:  [],
    setup:    [],
  },

  implementation: { strategy: 'builtin', type: 'builtin' },
};
