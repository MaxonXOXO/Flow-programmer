// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Component Package Registry
//  Canonical Package Contract & Target-Aware Registry
// ─────────────────────────────────────────────────────────────────

import { 
  ComponentPackage, 
  PackageDefinition, 
  ComponentCategory, 
  PropertyDefinition, 
  ComponentDependencies, 
  PackageManifest, 
  CanonicalComponentDefinition,
  TargetId,
  TargetImplementation
} from './types';

// ─── Sensor Imports ───────────────────────────────────────────────
import { DHT11Package } from './sensors/dht11';
import { UltrasonicHCSR04Package } from './sensors/ultrasonic_hcsr04';
import { PIRMotionPackage } from './sensors/pir_motion';
import { LDRLightPackage, BasicSensorsManifest } from './sensors/ldr_light';
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
  BasicSensorsManifest,
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

// ─── Internal Registries ──────────────────────────────────────────

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  const cloned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, any>)[key]);
  }
  return cloned as T;
}

/**
 * Stamps flat compatibility shims (id, name, category, icon, etc.) from
 * a package's metadata section onto the top-level object.
 */
export function makePackage(pkg: PackageDefinition | CanonicalComponentDefinition, fallbackPackageId?: string): ComponentPackage {
  const id = pkg.metadata?.id || pkg.id || fallbackPackageId || 'unknown';
  const name = pkg.metadata?.name || pkg.name || id;
  const category = pkg.metadata?.category || pkg.category || 'sensor';
  const icon = pkg.metadata?.icon || pkg.icon || '🔌';
  const description = pkg.metadata?.description || pkg.description || '';
  const tags = pkg.metadata?.tags || pkg.tags || [];

  const baseMetadata = pkg.metadata || {
    id,
    name,
    category,
    icon,
    description,
    tags,
  };

  return {
    ...deepClone(pkg),
    metadata: deepClone(baseMetadata),
    pins: deepClone(pkg.pins || []),
    outputs: deepClone(pkg.outputs || []),
    properties: deepClone(pkg.properties || []),
    dependencies: deepClone(pkg.dependencies || {}),
    implementation: deepClone(pkg.implementation || { strategy: 'builtin' }),
    implementations: deepClone(pkg.implementations),
    // Flat shims — mirror metadata fields
    id,
    name,
    category,
    icon,
    description,
    tags: deepClone(tags),
    packageId: fallbackPackageId || id,
  };
}

/** Builtin package definitions list */
const BUILTIN_PACKAGES: PackageDefinition[] = [
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
];

/**
 * The central registry of all Component Packages.
 * Keys must match each package's metadata.id exactly.
 */
const COMPONENT_REGISTRY: Record<string, ComponentPackage> = Object.fromEntries(
  BUILTIN_PACKAGES.map(pkg => [pkg.metadata.id, makePackage(pkg)])
);

/**
 * Package Manifest registry.
 */
const PACKAGE_REGISTRY: Record<string, PackageManifest> = Object.fromEntries(
  BUILTIN_PACKAGES.map(pkg => [
    pkg.metadata.id,
    {
      id: pkg.metadata.id,
      name: pkg.metadata.name,
      version: '1.0.0',
      description: pkg.metadata.description,
      tags: pkg.metadata.tags,
      components: { [pkg.metadata.id]: pkg },
    }
  ])
);

// Register canonical package namespaces
PACKAGE_REGISTRY[BasicSensorsManifest.id] = BasicSensorsManifest;

// ─── Public API ───────────────────────────────────────────────────

/**
 * Get a Package Manifest by its unique package identifier.
 */
export function getPackage(packageId: string): PackageManifest | undefined {
  return PACKAGE_REGISTRY[packageId];
}

/**
 * Get all registered Package Manifests.
 */
export function getAllPackages(): PackageManifest[] {
  return Object.values(PACKAGE_REGISTRY);
}

/**
 * Get a Component Package by its unique identifier (or packageId + componentId).
 */
export function getComponentDefinition(id: string, packageId?: string): ComponentPackage | undefined {
  if (COMPONENT_REGISTRY[id]) {
    return deepClone(COMPONENT_REGISTRY[id]);
  }
  if (packageId && PACKAGE_REGISTRY[packageId]) {
    const pkg = PACKAGE_REGISTRY[packageId];
    const components = Array.isArray(pkg.components) ? pkg.components : Object.values(pkg.components);
    const found = components.find(c => (c.metadata?.id === id || c.id === id));
    if (found) {
      return makePackage(found, packageId);
    }
  }
  return undefined;
}

/** Alias for getComponentDefinition — preferred name for new code. */
export const getComponentPackage = getComponentDefinition;

/**
 * Get all registered Component Packages.
 */
export function getAllComponents(): ComponentPackage[] {
  return Object.values(COMPONENT_REGISTRY).map(c => deepClone(c));
}

/**
 * Get all Component Packages belonging to a specific category.
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentPackage[] {
  return getAllComponents().filter(pkg => pkg.metadata.category === category);
}

/**
 * Get only the editable properties for a component.
 */
export function getComponentProperties(id: string): PropertyDefinition[] {
  return COMPONENT_REGISTRY[id]?.properties ?? [];
}

/**
 * Get dependency declarations for a component, optionally resolving target-specific dependencies.
 */
export function getComponentDependencies(id: string, targetId: TargetId = 'generic'): ComponentDependencies {
  const comp = COMPONENT_REGISTRY[id];
  if (!comp) return {};

  if (comp.implementations) {
    const targetImpl = comp.implementations[targetId] || comp.implementations['generic'] || comp.implementations['default'];
    if (targetImpl?.dependencies) {
      return targetImpl.dependencies;
    }
  }

  return comp.dependencies ?? {};
}

/**
 * Dynamically register a package manifest and expose its components in the registry.
 */
export function registerPackage(manifest: PackageManifest): void {
  PACKAGE_REGISTRY[manifest.id] = manifest;

  const components = Array.isArray(manifest.components) 
    ? manifest.components 
    : Object.values(manifest.components);

  for (const comp of components) {
    const normalized = makePackage(comp, manifest.id);
    COMPONENT_REGISTRY[normalized.id] = normalized;
  }
}

/**
 * Dynamically register a single component.
 */
export function registerComponent(comp: CanonicalComponentDefinition | PackageDefinition, packageId?: string): ComponentPackage {
  const normalized = makePackage(comp, packageId);
  COMPONENT_REGISTRY[normalized.id] = normalized;
  return normalized;
}

// ─── Convenience: componentsRegistry (used by SchemaCanvas) ──────

/**
 * Direct registry map access.
 */
export const componentsRegistry = COMPONENT_REGISTRY;

