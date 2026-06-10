import { ComponentDefinition } from '../types';

export const IRObstacleComponent: ComponentDefinition = {
  id: 'ir_obstacle',
  name: 'IR Obstacle Sensor',
  category: 'sensor',
  description: 'Infrared obstacle avoidance sensor',
  icon: '👁',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'out', label: 'OUT', signal: 'digital_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'obstacle', label: 'Obstacle Detected', type: 'bool' }
  ],
  tags: ['obstacle', 'infrared'],
  editable: true
};
