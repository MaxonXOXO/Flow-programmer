import { ComponentDefinition } from '../types';

export const VibrationSensorComponent: ComponentDefinition = {
  id: 'vibration_sensor',
  name: 'Vibration Sensor',
  category: 'sensor',
  description: 'Vibration and tilt detection sensor',
  icon: '📳',
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power' },
    { id: 'do', label: 'D0', signal: 'digital_output' },
    { id: 'gnd', label: 'GND', signal: 'ground' }
  ],
  outputs: [
    { id: 'vibration', label: 'Vibration Detected', type: 'bool' }
  ],
  tags: ['vibration', 'motion'],
  editable: true
};
