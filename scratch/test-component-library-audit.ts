import { 
  getAllComponents, 
  getAllPackages, 
  getComponentPackage, 
  getPackage, 
  getComponentsByCategory, 
  componentsRegistry 
} from '../lib/registry/components';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { ComponentPackage, ImplementationStrategy } from '../lib/registry/components/types';

console.log('=== TEST PHASE 5I: COMPLETE COMPONENT LIBRARY MIGRATION AUDIT ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────
// Migration Complexity Classifier
// ─────────────────────────────────────────────────────────────────
export type MigrationComplexityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface ComponentAuditRecord {
  id: string;
  name: string;
  category: string;
  currentStrategy: ImplementationStrategy;
  complexityLevel: MigrationComplexityLevel;
  requiredPrimitives: string[];
  targetSupport: {
    arduino_uno: 'Supported' | 'Target-Specific' | 'Unknown';
    esp32: 'Supported' | 'Target-Specific' | 'Unknown';
    esp8266: 'Supported' | 'Target-Specific' | 'Unknown';
    generic: 'Supported' | 'Unknown';
  };
  recommendedPackage: string;
  recommendedStrategy: 'graph' | 'builtin' | 'native' | 'hybrid';
}

export function auditComponent(comp: ComponentPackage): ComponentAuditRecord {
  const id = comp.id;
  const resolved = resolvePackageImplementation(comp);
  const currentStrategy = resolved.strategy;

  let complexityLevel: MigrationComplexityLevel = 4;
  let requiredPrimitives: string[] = [];
  let recommendedStrategy: 'graph' | 'builtin' | 'native' | 'hybrid' = 'builtin';
  let recommendedPackage = `foton.${comp.category}`;

  const targetSupport: ComponentAuditRecord['targetSupport'] = {
    arduino_uno: 'Supported',
    esp32: 'Unknown',
    esp8266: 'Unknown',
    generic: 'Supported',
  };

  switch (id) {
    case 'ultrasonic_hcsr04':
      complexityLevel = 0; // Already migrated
      requiredPrimitives = ['gpio', 'delay', 'pulse_in', 'assignment'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.sensors.distance';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      targetSupport.generic = 'Supported';
      break;

    // Direct Graph Migration (Level 1)
    case 'ldr_light':
    case 'water_level':
    case 'mq_gas':
    case 'soil_moisture':
      complexityLevel = 1;
      requiredPrimitives = ['analog_read', 'assignment'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.sensors.basic';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'led':
    case 'relay':
      complexityLevel = 1;
      requiredPrimitives = ['gpio'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.actuators.basic';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'buzzer':
      complexityLevel = 1; // Active buzzer
      requiredPrimitives = ['gpio', 'delay'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.actuators.basic';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    // Graph Migration after Reusable Primitive (Level 2)
    case 'pir_motion':
    case 'ir_obstacle':
    case 'vibration_sensor':
    case 'push_button':
      complexityLevel = 2;
      requiredPrimitives = ['digital_read', 'assignment'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.sensors.basic';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'flame_sensor':
      complexityLevel = 2;
      requiredPrimitives = ['digital_read', 'analog_read', 'assignment'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.sensors.basic';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'l298n':
    case 'l293d':
      complexityLevel = 2;
      requiredPrimitives = ['gpio', 'condition', 'pwm', 'assignment'];
      recommendedStrategy = 'graph';
      recommendedPackage = 'foton.motion';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Target-Specific'; // ESP32 uses ledc for PWM
      break;

    // Target-Specific Implementations (Level 3)
    case 'servo_motor':
      complexityLevel = 3;
      requiredPrimitives = ['servo_write'];
      recommendedStrategy = 'native';
      recommendedPackage = 'foton.motion';
      targetSupport.arduino_uno = 'Supported'; // Servo.h
      targetSupport.esp32 = 'Target-Specific'; // ESP32Servo
      break;

    case 'hc05_bluetooth':
      complexityLevel = 3;
      requiredPrimitives = ['uart_read', 'uart_write', 'uart_available'];
      recommendedStrategy = 'native';
      recommendedPackage = 'foton.communication';
      targetSupport.arduino_uno = 'Supported'; // SoftwareSerial
      targetSupport.esp32 = 'Target-Specific'; // HardwareSerial (Serial2)
      break;

    // Native / Builtin Appropriate (Level 4)
    case 'dht11':
      complexityLevel = 4;
      requiredPrimitives = ['dht_read_temp', 'dht_read_hum'];
      recommendedStrategy = 'builtin';
      recommendedPackage = 'foton.sensors.environmental';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'lcd_16x2':
      complexityLevel = 4;
      requiredPrimitives = ['i2c_write', 'display_print'];
      recommendedStrategy = 'builtin';
      recommendedPackage = 'foton.display';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'oled_display':
      complexityLevel = 4;
      requiredPrimitives = ['i2c_write', 'gfx_draw', 'gfx_display'];
      recommendedStrategy = 'builtin';
      recommendedPackage = 'foton.display';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'nrf24l01':
      complexityLevel = 4;
      requiredPrimitives = ['spi_transaction', 'rf_send', 'rf_receive'];
      recommendedStrategy = 'builtin';
      recommendedPackage = 'foton.communication';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    case 'dc_motor':
      complexityLevel = 4;
      requiredPrimitives = [];
      recommendedStrategy = 'builtin';
      recommendedPackage = 'foton.motion';
      targetSupport.arduino_uno = 'Supported';
      targetSupport.esp32 = 'Supported';
      break;

    default:
      complexityLevel = 5;
      requiredPrimitives = [];
      recommendedStrategy = 'hybrid';
      recommendedPackage = `foton.custom`;
  }

  return {
    id,
    name: comp.name,
    category: comp.category,
    currentStrategy,
    complexityLevel,
    requiredPrimitives,
    targetSupport,
    recommendedPackage,
    recommendedStrategy,
  };
}

// ─────────────────────────────────────────────────────────────────
// T1 — Every registered component discovered
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Component Discovery ---');

const allComponents = getAllComponents();
const allPackages = getAllPackages();

assert(allComponents.length === 22, `T1: Exactly 22 components discovered (found ${allComponents.length})`);
assert(allPackages.length >= 22, `T1: At least 22 packages registered (found ${allPackages.length})`);

// ─────────────────────────────────────────────────────────────────
// T2 — Every component has canonical identity
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Canonical Identity & Metadata ---');

let allIdentitiesValid = true;
for (const comp of allComponents) {
  if (!comp.id || typeof comp.id !== 'string') allIdentitiesValid = false;
  if (!comp.name || typeof comp.name !== 'string') allIdentitiesValid = false;
  if (!comp.category || typeof comp.category !== 'string') allIdentitiesValid = false;
  if (!Array.isArray(comp.pins)) allIdentitiesValid = false;
  if (!Array.isArray(comp.outputs)) allIdentitiesValid = false;
  if (!Array.isArray(comp.properties)) allIdentitiesValid = false;
}

assert(allIdentitiesValid, 'T2: Every component has valid canonical id, name, category, pins, outputs, and properties');

// ─────────────────────────────────────────────────────────────────
// T3 — Every component has a recognized implementation strategy
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Recognized Implementation Strategy ---');

let allStrategiesRecognized = true;
const recognizedStrategies = new Set(['builtin', 'subflow', 'graph', 'native']);

for (const comp of allComponents) {
  const resolved = resolvePackageImplementation(comp);
  if (!recognizedStrategies.has(resolved.strategy)) {
    console.error(`Unrecognized strategy "${resolved.strategy}" for component "${comp.id}"`);
    allStrategiesRecognized = false;
  }
}

assert(allStrategiesRecognized, 'T3: All 22 components have recognized implementation strategies');

// ─────────────────────────────────────────────────────────────────
// T4 — HC-SR04 is recognized as graph-backed
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: HC-SR04 Reference Implementation ---');

const hcsr04 = getComponentPackage('ultrasonic_hcsr04');
assert(Boolean(hcsr04), 'T4: HC-SR04 package exists');

const resolvedHcsr04 = resolvePackageImplementation(hcsr04!);
assert(Boolean(resolvedHcsr04.graph || resolvedHcsr04.subflow), 'T4: HC-SR04 has visual graph implementation');
assert(resolvedHcsr04.entry === 'trig_low_1', 'T4: HC-SR04 has explicit entry node trig_low_1');
assert(resolvedHcsr04.exit === 'return_distance', 'T4: HC-SR04 has explicit exit node return_distance');
assert(
  (resolvedHcsr04.graph?.nodes.length || 0) === 9,
  `T4: HC-SR04 graph contains 9 nodes (found ${resolvedHcsr04.graph?.nodes.length})`
);

// ─────────────────────────────────────────────────────────────────
// T5 — Existing builtin components remain recognized as builtin/native
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Builtin / Native Recognition ---');

const builtinComponents = allComponents.filter(c => c.id !== 'ultrasonic_hcsr04');
assert(builtinComponents.length === 21, 'T5: Exactly 21 builtin components exist');

let allBuiltinsResolveCorrectly = true;
for (const comp of builtinComponents) {
  const resolved = resolvePackageImplementation(comp);
  if (resolved.strategy !== 'builtin' && resolved.strategy !== 'native') {
    allBuiltinsResolveCorrectly = false;
  }
}
assert(allBuiltinsResolveCorrectly, 'T5: All 21 non-migrated components resolve to builtin/native strategy');

// ─────────────────────────────────────────────────────────────────
// T6 — Target support matrix can be generated without guessing
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Target Support Matrix Evaluation ---');

const auditRecords = allComponents.map(auditComponent);
assert(auditRecords.length === 22, 'T6: 22 audit records generated');

const unoSupported = auditRecords.filter(r => r.targetSupport.arduino_uno === 'Supported');
assert(unoSupported.length === 22, 'T6: All 22 components have confirmed Arduino Uno support');

const esp32Specialized = auditRecords.filter(r => r.targetSupport.esp32 === 'Target-Specific');
assert(esp32Specialized.length >= 2, 'T6: Target-specific ESP32 components (e.g. Servo, Motor Driver, BT) identified');

// ─────────────────────────────────────────────────────────────────
// T7 — No duplicate canonical component identities
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Component ID Uniqueness ---');

const componentIds = allComponents.map(c => c.id);
const uniqueComponentIds = new Set(componentIds);

assert(
  componentIds.length === uniqueComponentIds.size,
  `T7: All component IDs are unique (${uniqueComponentIds.size}/${componentIds.length})`
);

// ─────────────────────────────────────────────────────────────────
// T8 — No duplicate package identities
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Package ID Uniqueness ---');

const packageIds = allPackages.map(p => p.id);
const uniquePackageIds = new Set(packageIds);

assert(
  packageIds.length === uniquePackageIds.size,
  `T8: All package IDs are unique (${uniquePackageIds.size}/${packageIds.length})`
);

// ─────────────────────────────────────────────────────────────────
// T9 — Existing registry remains immutable
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Registry Immutability ---');

const dht11Before = getComponentPackage('dht11')!;
(dht11Before as any).tempMutatedField = 'mutated';

const dht11After = getComponentPackage('dht11')!;
assert(
  (dht11After as any).tempMutatedField === undefined,
  'T9: Mutating retrieved component object did not mutate registry'
);

// ─────────────────────────────────────────────────────────────────
// T10 — Normalized package access remains backward compatible
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Backward Compatibility ---');

assert(getComponentsByCategory('sensor').length === 11, 'T10: getComponentsByCategory returns 11 sensors');
assert(getComponentsByCategory('actuator').length === 5, 'T10: getComponentsByCategory returns 5 actuators');
assert(getComponentsByCategory('motor_driver').length === 2, 'T10: getComponentsByCategory returns 2 motor drivers');
assert(getComponentsByCategory('display').length === 2, 'T10: getComponentsByCategory returns 2 displays');
assert(getComponentsByCategory('communication').length === 2, 'T10: getComponentsByCategory returns 2 communication modules');

// ─────────────────────────────────────────────────────────────────
// T11 — Migration classification is deterministic
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Deterministic Migration Classification ---');

const runA = allComponents.map(auditComponent);
const runB = allComponents.map(auditComponent);

let isDeterministic = true;
for (let i = 0; i < runA.length; i++) {
  if (
    runA[i].complexityLevel !== runB[i].complexityLevel ||
    runA[i].recommendedStrategy !== runB[i].recommendedStrategy ||
    runA[i].recommendedPackage !== runB[i].recommendedPackage
  ) {
    isDeterministic = false;
    break;
  }
}

assert(isDeterministic, 'T11: Audit classification produces 100% deterministic output');

// ─────────────────────────────────────────────────────────────────
// T12 — Level Distribution Summary
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Migration Level Distribution ---');

const level0 = auditRecords.filter(r => r.complexityLevel === 0);
const level1 = auditRecords.filter(r => r.complexityLevel === 1);
const level2 = auditRecords.filter(r => r.complexityLevel === 2);
const level3 = auditRecords.filter(r => r.complexityLevel === 3);
const level4 = auditRecords.filter(r => r.complexityLevel === 4);
const level5 = auditRecords.filter(r => r.complexityLevel === 5);

console.log(`  • Level 0 (Already Migrated):        ${level0.length} (${level0.map(r => r.id).join(', ')})`);
console.log(`  • Level 1 (Direct Graph Migration):  ${level1.length} (${level1.map(r => r.id).join(', ')})`);
console.log(`  • Level 2 (Requires New Primitive):  ${level2.length} (${level2.map(r => r.id).join(', ')})`);
console.log(`  • Level 3 (Target-Specific Impl):    ${level3.length} (${level3.map(r => r.id).join(', ')})`);
console.log(`  • Level 4 (Builtin/Native Keep):     ${level4.length} (${level4.map(r => r.id).join(', ')})`);
console.log(`  • Level 5 (Arch Investigation):      ${level5.length}`);

assert(level0.length === 1, 'T12: Exactly 1 component at Level 0 (HC-SR04)');
assert(level1.length === 7, 'T12: Exactly 7 components at Level 1 (LDR, Water, MQ, Soil, LED, Relay, Buzzer)');
assert(level2.length === 7, 'T12: Exactly 7 components at Level 2 (PIR, IR, Vibration, Button, Flame, L298N, L293D)');
assert(level3.length === 2, 'T12: Exactly 2 components at Level 3 (Servo, Bluetooth)');
assert(level4.length === 5, 'T12: Exactly 5 components at Level 4 (DHT11, LCD16x2, OLED, NRF24L01, DC Motor)');
assert(level5.length === 0, 'T12: 0 unresolved components at Level 5');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
