export type ComponentCategory =
  | 'sensor'
  | 'actuator'
  | 'communication'
  | 'display'
  | 'motor_driver';

export type SignalType =
  | 'digital_input'
  | 'digital_output'
  | 'analog_input'
  | 'analog_output'
  | 'pwm_input'
  | 'pwm_output'
  | 'i2c'
  | 'spi'
  | 'uart'
  | 'power'
  | 'ground';

export interface ComponentPin {
  id: string;
  label: string;
  signal: SignalType;
  required?: boolean;
}

export interface ComponentOutput {
  id: string;
  label: string;
  type: 'int' | 'float' | 'bool' | 'string';
}

export interface ComponentDefinition {
  id: string;

  name: string;

  description?: string;

  category: ComponentCategory;

  icon?: string;

  pins: ComponentPin[];

  outputs?: ComponentOutput[];

  tags?: string[];

  editable?: boolean;
}
