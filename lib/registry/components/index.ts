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
import { validatePackageDefinition } from '../../compiler/packages/packageValidator';
import type { ValidationResult } from '../../compiler/packages/packageContract';

function throwRegistrationError(pkgId: string, result: ValidationResult): never {
  const firstErr = result.diagnostics.find(d => d.severity !== 'warning') || result.diagnostics[0];
  const code = firstErr?.code || 'PACKAGE_VALIDATION_FAILED';
  const path = firstErr?.path ? ` at ${firstErr.path}` : '';
  const message = firstErr?.message || result.errors.join('; ');
  throw new Error(`[Registry] Registration failed for package "${pkgId}": [${code}] ${message}${path}`);
}

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
  const id = pkg.id || pkg.metadata?.id || fallbackPackageId;
  const name = pkg.metadata?.name || pkg.name || id || '';
  const category = pkg.metadata?.category || pkg.category || 'sensor';
  const icon = pkg.metadata?.icon || pkg.icon || '🔌';
  const description = pkg.metadata?.description || pkg.description || '';
  const tags = pkg.metadata?.tags || pkg.tags || [];
  const version = (pkg as any).version !== undefined ? (pkg as any).version : (pkg.metadata as any)?.version;

  const baseMetadata = pkg.metadata ? deepClone(pkg.metadata) : {
    id: id || '',
    name,
    category,
    icon,
    description,
    tags,
  };

  return {
    ...deepClone(pkg),
    id: id as string,
    version: version as string,
    metadata: baseMetadata,
    pins: deepClone(pkg.pins || []),
    outputs: deepClone(pkg.outputs || []),
    properties: deepClone(pkg.properties || []),
    dependencies: deepClone(pkg.dependencies || {}),
    implementation: deepClone(pkg.implementation || { strategy: 'builtin' }),
    implementations: deepClone(pkg.implementations),
    // Flat shims — mirror metadata fields
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
const COMPONENT_REGISTRY: Record<string, ComponentPackage> = {};

/**
 * Package Manifest registry.
 */
const PACKAGE_REGISTRY: Record<string, PackageManifest> = {};

// Ingest and validate all builtin packages at startup
for (const pkg of BUILTIN_PACKAGES) {
  const normalized = makePackage(pkg);
  const validation = validatePackageDefinition(normalized);
  if (!validation.valid) {
    throwRegistrationError(normalized.id, validation);
  }
  COMPONENT_REGISTRY[normalized.id] = deepClone(normalized);
  PACKAGE_REGISTRY[normalized.id] = {
    id: normalized.id,
    name: normalized.metadata.name,
    version: normalized.version,
    description: normalized.metadata.description,
    tags: normalized.metadata.tags,
    components: { [normalized.id]: deepClone(normalized) },
  };
}

// Register canonical package namespaces
PACKAGE_REGISTRY[BasicSensorsManifest.id] = deepClone(BasicSensorsManifest);

// ─── Public API ───────────────────────────────────────────────────

/**
 * Get a Package Manifest by its unique package identifier.
 */
export function getPackage(packageId: string): PackageManifest | undefined {
  const manifest = PACKAGE_REGISTRY[packageId];
  return manifest ? deepClone(manifest) : undefined;
}

/**
 * Get all registered Package Manifests.
 */
export function getAllPackages(): PackageManifest[] {
  return Object.values(PACKAGE_REGISTRY).map(p => deepClone(p));
}

/**
 * Get a Component Package by its unique identifier (or packageId + componentId).
 */
export function getComponentDefinition(id: string, packageId?: string): ComponentPackage | undefined {
  if (id && typeof id === 'string' && Object.prototype.hasOwnProperty.call(COMPONENT_REGISTRY, id)) {
    return deepClone(COMPONENT_REGISTRY[id]);
  }
  if (packageId && Object.prototype.hasOwnProperty.call(PACKAGE_REGISTRY, packageId)) {
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
 * Validation occurs BEFORE any registry mutation (atomic registration).
 */
export function registerPackage(manifest: PackageManifest): void {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('[Registry] Invalid package manifest: must be a non-null object.');
  }

  const rawComponents = Array.isArray(manifest.components) 
    ? manifest.components 
    : Object.values(manifest.components || {});

  // Atomicity: Validate ALL candidate components first.
  const normalizedComponents: ComponentPackage[] = [];
  for (const comp of rawComponents) {
    const normalized = makePackage(comp, manifest.id);
    const validation = validatePackageDefinition(normalized);
    if (!validation.valid) {
      throwRegistrationError(normalized.id, validation);
    }
    normalizedComponents.push(normalized);
  }

  // Commit atomically only after 100% of candidate components pass validation
  PACKAGE_REGISTRY[manifest.id] = deepClone(manifest);
  for (const comp of normalizedComponents) {
    COMPONENT_REGISTRY[comp.id] = deepClone(comp);
  }
}

/**
 * Dynamically register a single component.
 * Validation occurs BEFORE registry mutation (atomic registration).
 */
export function registerComponent(comp: CanonicalComponentDefinition | PackageDefinition, packageId?: string): ComponentPackage {
  const normalized = makePackage(comp, packageId);
  const validation = validatePackageDefinition(normalized);
  if (!validation.valid) {
    throwRegistrationError(normalized.id, validation);
  }

  // Commit atomically only after validation passes
  COMPONENT_REGISTRY[normalized.id] = deepClone(normalized);
  return deepClone(normalized);
}

// ─── Convenience: componentsRegistry (used by SchemaCanvas) ──────

/**
 * Direct registry map access.
 * Protected by a readonly proxy returning defensive copies to guarantee registry immutability.
 */
export const componentsRegistry: Readonly<Record<string, ComponentPackage>> = new Proxy(
  COMPONENT_REGISTRY,
  {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && Object.prototype.hasOwnProperty.call(target, prop)) {
        return deepClone(target[prop]);
      }
      return Reflect.get(target, prop, receiver);
    },
    set() {
      throw new Error('[Registry] Cannot directly mutate componentsRegistry. Use registerComponent() or registerPackage().');
    },
    deleteProperty() {
      throw new Error('[Registry] Cannot directly delete from componentsRegistry.');
    },
    defineProperty() {
      throw new Error('[Registry] Cannot directly define property on componentsRegistry.');
    },
    has(target, prop) {
      return Reflect.has(target, prop);
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  }
);

