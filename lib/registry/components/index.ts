// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Component Package Registry
//  Phase 2 — Component Package Architecture (Foundation)
// ─────────────────────────────────────────────────────────────────

import { ComponentPackage, PackageDefinition, ComponentCategory, PropertyDefinition, ComponentDependencies } from './types';

// ─────────────────────────────────────────────────────────────────
//  Registry Helper: makePackage
//
//  All package definition objects call makePackage() which stamps
//  flat-shim fields (id, name, category, icon, etc.) from metadata
//  onto the top-level object.
//  This keeps individual package files clean (metadata section only)
//  while allowing existing consumers to access comp.name, comp.id, etc.
// ─────────────────────────────────────────────────────────────────

// ─── Sensor Imports ───────────────────────────────────────────────
import { DHT11Package } from './sensors/dht11';
import { UltrasonicHCSR04Package } from './sensors/ultrasonic_hcsr04';
import { PIRMotionPackage } from './sensors/pir_motion';
import { LDRLightPackage } from './sensors/ldr_light';
import { IRObstaclePackage } from './sensors/ir_obstacle';
import { FlameSensorPackage } from './sensors/flame_sensor';
import { SoilMoisturePackage } from './sensors/soil_moisture';
import { WaterLevelPackage } from './sensors/water_level';
import { MQGasPackage } from './sensors/mq_gas';
import { VibrationSensorPackage } from './sensors/vibration_sensor';
import { PushButtonPackage } from './sensors/push_button';

// ─── Actuator / Display / Comms Imports ──────────────────────────
import { ServoMotorPackage } from './actuators/servo_motor';
import { LCD16x2Package } from './actuators/lcd_16x2';
import { OLEDDisplayPackage } from './actuators/oled_display';
import { L298NPackage } from './actuators/l298n';
import { L293DPackage } from './actuators/l293d';
import { LEDPackage } from './actuators/led';
import { DCMotorPackage } from './actuators/dc_motor';
import { BuzzerPackage } from './actuators/buzzer';
import { RelayPackage } from './actuators/relay';
import { HC05BluetoothPackage } from './actuators/hc05_bluetooth';
import { NRF24L01Package } from './actuators/nrf24l01';

// ─── Re-export Types ──────────────────────────────────────────────
export * from './types';

// ─── Re-export Individual Packages ───────────────────────────────
// Legacy export names preserved so existing imports don't break.
export {
  DHT11Package,
  DHT11Package as DHT11Component,
  UltrasonicHCSR04Package,
  UltrasonicHCSR04Package as UltrasonicHCSR04Component,
  PIRMotionPackage,
  PIRMotionPackage as PIRMotionComponent,
  LDRLightPackage,
  LDRLightPackage as LDRLightComponent,
  IRObstaclePackage,
  IRObstaclePackage as IRObstacleComponent,
  FlameSensorPackage,
  FlameSensorPackage as FlameSensorComponent,
  SoilMoisturePackage,
  SoilMoisturePackage as SoilMoistureComponent,
  WaterLevelPackage,
  WaterLevelPackage as WaterLevelComponent,
  MQGasPackage,
  MQGasPackage as MQGasComponent,
  VibrationSensorPackage,
  VibrationSensorPackage as VibrationSensorComponent,
  PushButtonPackage,
  PushButtonPackage as PushButtonComponent,
  ServoMotorPackage,
  ServoMotorPackage as ServoMotorComponent,
  LCD16x2Package,
  LCD16x2Package as LCD16x2Component,
  OLEDDisplayPackage,
  OLEDDisplayPackage as OLEDDisplayComponent,
  L298NPackage,
  L298NPackage as L298NComponent,
  L293DPackage,
  L293DPackage as L293DComponent,
  LEDPackage,
  LEDPackage as LEDComponent,
  DCMotorPackage,
  DCMotorPackage as DCMotorComponent,
  BuzzerPackage,
  BuzzerPackage as BuzzerComponent,
  RelayPackage,
  RelayPackage as RelayComponent,
  HC05BluetoothPackage,
  HC05BluetoothPackage as HC05BluetoothComponent,
  NRF24L01Package,
  NRF24L01Package as NRF24L01Component,
};

// ─── Internal Registry Map ────────────────────────────────────────

/**
 * Stamps flat compatibility shims (id, name, category, icon, etc.) from
 * a package's metadata section onto the top-level object.
 *
 * This allows existing consumers (Sidebar, ComponentNode) to access
 * comp.name, comp.id, comp.category etc. without any code changes,
 * while new code should read from pkg.metadata.* instead.
 */
function makePackage(pkg: PackageDefinition): ComponentPackage {
  return {
    ...pkg,
    // Flat shims — mirror metadata fields
    id:          pkg.metadata.id,
    name:        pkg.metadata.name,
    category:    pkg.metadata.category,
    icon:        pkg.metadata.icon,
    description: pkg.metadata.description,
    tags:        pkg.metadata.tags,
  };
}

/**
 * The central registry of all Component Packages.
 * Keys must match each package's metadata.id exactly.
 */
const COMPONENT_REGISTRY: Record<string, ComponentPackage> = Object.fromEntries(
  [
    DHT11Package,
    UltrasonicHCSR04Package,
    PIRMotionPackage,
    LDRLightPackage,
    IRObstaclePackage,
    FlameSensorPackage,
    SoilMoisturePackage,
    WaterLevelPackage,
    MQGasPackage,
    VibrationSensorPackage,
    PushButtonPackage,
    ServoMotorPackage,
    LCD16x2Package,
    OLEDDisplayPackage,
    L298NPackage,
    L293DPackage,
    LEDPackage,
    DCMotorPackage,
    BuzzerPackage,
    RelayPackage,
    HC05BluetoothPackage,
    NRF24L01Package,
  ].map(pkg => [pkg.metadata.id, makePackage(pkg)])
);

// ─── Public API ───────────────────────────────────────────────────

/**
 * Get a Component Package by its unique identifier.
 * Returns the full package including metadata, pins, outputs,
 * properties, dependencies, and implementation.
 */
export function getComponentDefinition(id: string): ComponentPackage | undefined {
  return COMPONENT_REGISTRY[id];
}

/** Alias for getComponentDefinition — preferred name for new code. */
export const getComponentPackage = getComponentDefinition;

/**
 * Get all registered Component Packages.
 */
export function getAllComponents(): ComponentPackage[] {
  return Object.values(COMPONENT_REGISTRY);
}

/**
 * Get all Component Packages belonging to a specific category.
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentPackage[] {
  return getAllComponents().filter(pkg => pkg.metadata.category === category);
}

/**
 * Get only the editable properties for a component.
 * Useful for the Properties Panel to render the correct controls
 * without needing to load the full package.
 */
export function getComponentProperties(id: string): PropertyDefinition[] {
  return COMPONENT_REGISTRY[id]?.properties ?? [];
}

/**
 * Get only the dependency declarations for a component.
 * Useful for the compiler to quickly gather includes / globals / setup
 * without loading the full package.
 */
export function getComponentDependencies(id: string): ComponentDependencies {
  return COMPONENT_REGISTRY[id]?.dependencies ?? {};
}

// ─── Convenience: componentsRegistry (used by SchemaCanvas) ──────

/**
 * Direct registry map access.
 * SchemaCanvas uses: componentsRegistry[compId]
 * This export preserves that access pattern without any changes to SchemaCanvas.
 */
export const componentsRegistry = COMPONENT_REGISTRY;
