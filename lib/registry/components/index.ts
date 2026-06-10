import { ComponentDefinition, ComponentCategory } from './types';

// Import all sensors
import { DHT11Component } from './sensors/dht11';
import { UltrasonicHCSR04Component } from './sensors/ultrasonic_hcsr04';
import { PIRMotionComponent } from './sensors/pir_motion';
import { LDRLightComponent } from './sensors/ldr_light';
import { IRObstacleComponent } from './sensors/ir_obstacle';
import { FlameSensorComponent } from './sensors/flame_sensor';
import { SoilMoistureComponent } from './sensors/soil_moisture';
import { WaterLevelComponent } from './sensors/water_level';
import { MQGasComponent } from './sensors/mq_gas';
import { VibrationSensorComponent } from './sensors/vibration_sensor';
import { PushButtonComponent } from './sensors/push_button';

// Import all actuators/drivers/displays/comms
import { ServoMotorComponent } from './actuators/servo_motor';
import { LCD16x2Component } from './actuators/lcd_16x2';
import { OLEDDisplayComponent } from './actuators/oled_display';
import { L298NComponent } from './actuators/l298n';
import { L293DComponent } from './actuators/l293d';
import { LEDComponent } from './actuators/led';
import { DCMotorComponent } from './actuators/dc_motor';
import { BuzzerComponent } from './actuators/buzzer';
import { RelayComponent } from './actuators/relay';
import { HC05BluetoothComponent } from './actuators/hc05_bluetooth';
import { NRF24L01Component } from './actuators/nrf24l01';

// Re-export types
export * from './types';

// Export individual components
export {
  DHT11Component,
  UltrasonicHCSR04Component,
  PIRMotionComponent,
  LDRLightComponent,
  IRObstacleComponent,
  FlameSensorComponent,
  SoilMoistureComponent,
  WaterLevelComponent,
  MQGasComponent,
  VibrationSensorComponent,
  PushButtonComponent,
  ServoMotorComponent,
  LCD16x2Component,
  OLEDDisplayComponent,
  L298NComponent,
  L293DComponent,
  LEDComponent,
  DCMotorComponent,
  BuzzerComponent,
  RelayComponent,
  HC05BluetoothComponent,
  NRF24L01Component
};

// Internal registry map
const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  dht11: DHT11Component,
  ultrasonic_hcsr04: UltrasonicHCSR04Component,
  pir_motion: PIRMotionComponent,
  ldr_light: LDRLightComponent,
  ir_obstacle: IRObstacleComponent,
  flame_sensor: FlameSensorComponent,
  soil_moisture: SoilMoistureComponent,
  water_level: WaterLevelComponent,
  mq_gas: MQGasComponent,
  vibration_sensor: VibrationSensorComponent,
  push_button: PushButtonComponent,
  servo_motor: ServoMotorComponent,
  lcd_16x2: LCD16x2Component,
  oled_display: OLEDDisplayComponent,
  l298n: L298NComponent,
  l293d: L293DComponent,
  led: LEDComponent,
  dc_motor: DCMotorComponent,
  buzzer: BuzzerComponent,
  relay: RelayComponent,
  hc05_bluetooth: HC05BluetoothComponent,
  nrf24l01: NRF24L01Component
};

/**
 * Get a component definition by its unique identifier
 */
export function getComponentDefinition(id: string): ComponentDefinition | undefined {
  return COMPONENT_REGISTRY[id];
}

/**
 * Get all registered component definitions
 */
export function getAllComponents(): ComponentDefinition[] {
  return Object.values(COMPONENT_REGISTRY);
}

/**
 * Get all registered component definitions belonging to a specific category
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return getAllComponents().filter(comp => comp.category === category);
}
