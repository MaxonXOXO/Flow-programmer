// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Phase 6A.4.2 Test Suite
//  Package Registry Ingestion Boundary & Builtin Normalization Hardening
// ─────────────────────────────────────────────────────────────────

import {
  registerComponent,
  registerPackage,
  getComponentPackage,
  getPackage,
  getAllComponents,
  getAllPackages,
  componentsRegistry,
} from '../lib/registry/components';
import type {
  PackageDefinition,
  PackageManifest,
} from '../lib/registry/components/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${message}`);
  } else {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== PHASE 6A.4.2: PACKAGE REGISTRY HARDENING TEST SUITE ===\n');

// ─── Section 1: Package Registration & Atomicity ─────────────────
console.log('--- 1. Package Registration & Atomicity ---');

const initialComponentCount = getAllComponents().length;
const initialPackageCount = getAllPackages().length;

// 1.1 Valid package registers successfully
const validTempSensor: PackageDefinition = {
  id: 'test_temp_probe',
  version: '1.0.0',
  metadata: {
    id: 'test_temp_probe',
    name: 'Test Temperature Probe',
    description: 'Precision temperature sensor for registry testing',
    category: 'sensor',
    icon: '🌡️',
    tags: ['test', 'temp'],
  },
  pins: [
    { id: 'vcc', label: 'VCC', signal: 'power', required: true },
    { id: 'sig', label: 'SIG', signal: 'analog_output', required: true },
    { id: 'gnd', label: 'GND', signal: 'ground', required: true },
  ],
  outputs: [
    { id: 'tempC', label: 'Temperature C', type: 'float', description: 'Temp in Celsius' },
  ],
  properties: [
    { id: 'sampleRate', label: 'Sample Rate', type: 'number', defaultValue: 100 },
  ],
  dependencies: {
    includes: ['TempSensor.h'],
    globals: ['TempSensor probe;'],
    setup: ['pinMode($sig, INPUT);'],
  },
  implementation: {
    strategy: 'builtin',
    type: 'builtin',
  },
};

const registered = registerComponent(validTempSensor);
assert(registered.id === 'test_temp_probe', 'Valid package registers successfully');
assert(registered.version === '1.0.0', 'Registered package has semver 1.0.0');

const retrieved = getComponentPackage('test_temp_probe');
assert(retrieved !== undefined, 'Registered package is retrievable via getComponentPackage');
assert(retrieved?.metadata.name === 'Test Temperature Probe', 'Retrieved package metadata matches');
assert(getAllComponents().length === initialComponentCount + 1, 'Registry component count increased by 1');

// 1.2 Invalid package is rejected immediately
let rejectionError: Error | null = null;
try {
  registerComponent({
    id: 'broken_sensor',
    version: '1.0.0',
    metadata: {
      id: 'broken_sensor',
      name: 'Broken Sensor',
      category: 'sensor',
    },
    pins: [
      { id: 'pin1', label: 'Pin 1', signal: 'invalid_signal' as any },
    ],
    outputs: [],
    properties: [],
    dependencies: {},
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  rejectionError = err;
}

assert(rejectionError !== null, 'Invalid package is rejected during registration');
assert(rejectionError!.message.includes('broken_sensor'), 'Error message contains package ID');
assert(rejectionError!.message.includes('PIN_SIGNAL_INVALID'), 'Error message contains validation diagnostic code PIN_SIGNAL_INVALID');
assert(rejectionError!.message.includes('pins[0].signal'), 'Error message contains validation path pins[0].signal');

// 1.3 Registry remains completely unchanged after rejected package (Atomicity for single component)
assert(getAllComponents().length === initialComponentCount + 1, 'Registry count remains unchanged after rejected registration');
assert(getComponentPackage('broken_sensor') === undefined, 'Rejected package was not inserted into registry');

// 1.4 Atomic Multi-Component Package Manifest Rollback
const manifestComponentCountBefore = getAllComponents().length;
const manifestPackageCountBefore = getAllPackages().length;

let manifestError: Error | null = null;
try {
  registerPackage({
    id: 'test.atomic.pack',
    name: 'Atomic Rollback Pack',
    version: '1.0.0',
    components: {
      valid_comp: {
        id: 'atomic_valid_comp',
        version: '1.0.0',
        metadata: {
          id: 'atomic_valid_comp',
          name: 'Atomic Valid Comp',
          category: 'sensor',
        },
        pins: [
          { id: 'sig', label: 'Signal', signal: 'analog_output' },
        ],
        outputs: [
          { id: 'val', label: 'Value', type: 'int' },
        ],
        properties: [],
        dependencies: {},
        implementation: { strategy: 'builtin' },
      },
      invalid_comp: {
        id: 'atomic_invalid_comp',
        version: '1.0.0',
        metadata: {
          id: 'atomic_invalid_comp',
          name: 'Atomic Invalid Comp',
          category: 'sensor',
        },
        pins: [
          // Duplicate pin ID
          { id: 'dup', label: 'D1', signal: 'digital_input' },
          { id: 'dup', label: 'D2', signal: 'digital_input' },
        ],
        outputs: [],
        properties: [],
        dependencies: {},
        implementation: { strategy: 'builtin' },
      },
    },
  });
} catch (err: any) {
  manifestError = err;
}

assert(manifestError !== null, 'Package manifest with 1 invalid component is rejected');
assert(manifestError!.message.includes('PACKAGE_DUPLICATE_PIN'), 'Diagnostic code PACKAGE_DUPLICATE_PIN reported');
assert(getAllComponents().length === manifestComponentCountBefore, 'Multi-component atomicity: zero components registered on failure');
assert(getAllPackages().length === manifestPackageCountBefore, 'Multi-component atomicity: package manifest not registered on failure');
assert(getComponentPackage('atomic_valid_comp') === undefined, 'First valid component in failed manifest was rolled back');
assert(getPackage('test.atomic.pack') === undefined, 'Package manifest was rolled back');

// ─── Section 2: Package Identity Validation ──────────────────────
console.log('\n--- 2. Package Identity Validation ---');

// 2.1 metadata.id mismatch rejected
let idMismatchErr: Error | null = null;
try {
  registerComponent({
    id: 'package_alpha',
    version: '1.0.0',
    metadata: {
      id: 'package_beta', // mismatch
      name: 'Alpha Beta Sensor',
      category: 'sensor',
    },
    pins: [],
    outputs: [],
    properties: [],
    dependencies: {},
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  idMismatchErr = err;
}
assert(idMismatchErr !== null, 'metadata.id mismatch rejected');
assert(idMismatchErr!.message.includes('METADATA_ID_MISMATCH'), 'Diagnostic METADATA_ID_MISMATCH reported');

// 2.2 Missing / empty version rejected
let missingVersionErr: Error | null = null;
try {
  registerComponent({
    id: 'unversioned_sensor',
    version: '' as any,
    metadata: {
      id: 'unversioned_sensor',
      name: 'Unversioned Sensor',
      category: 'sensor',
    },
    pins: [],
    outputs: [],
    properties: [],
    dependencies: {},
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  missingVersionErr = err;
}
assert(missingVersionErr !== null, 'Missing / empty version rejected');
assert(
  missingVersionErr!.message.includes('PACKAGE_VERSION_MISSING') ||
  missingVersionErr!.message.includes('PACKAGE_VERSION_INVALID'),
  'Version missing/invalid diagnostic reported'
);

// 2.3 Invalid semver rejected
let invalidVersionErr: Error | null = null;
try {
  registerComponent({
    id: 'bad_version_sensor',
    version: 'v2.0', // Non-semver
    metadata: {
      id: 'bad_version_sensor',
      name: 'Bad Version Sensor',
      category: 'sensor',
    },
    pins: [],
    outputs: [],
    properties: [],
    dependencies: {},
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  invalidVersionErr = err;
}
assert(invalidVersionErr !== null, 'Invalid semver "v2.0" rejected');
assert(invalidVersionErr!.message.includes('PACKAGE_VERSION_INVALID'), 'Diagnostic PACKAGE_VERSION_INVALID reported');

// ─── Section 3: Pin Integrity Validation ─────────────────────────
console.log('\n--- 3. Pin Integrity Validation ---');

// 3.1 Duplicate pin rejected
let dupPinErr: Error | null = null;
try {
  registerComponent({
    id: 'dup_pin_sensor',
    version: '1.0.0',
    metadata: {
      id: 'dup_pin_sensor',
      name: 'Dup Pin Sensor',
      category: 'sensor',
    },
    pins: [
      { id: 'pin1', label: 'Pin 1', signal: 'digital_input' },
      { id: 'pin1', label: 'Pin 1 Duplicate', signal: 'digital_input' },
    ],
    outputs: [],
    properties: [],
    dependencies: {},
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  dupPinErr = err;
}
assert(dupPinErr !== null, 'Duplicate pin rejected');
assert(dupPinErr!.message.includes('PACKAGE_DUPLICATE_PIN'), 'Diagnostic PACKAGE_DUPLICATE_PIN reported');

// 3.2 Invalid signal rejected
let badSignalErr: Error | null = null;
try {
  registerComponent({
    id: 'bad_signal_sensor',
    version: '1.0.0',
    metadata: {
      id: 'bad_signal_sensor',
      name: 'Bad Signal Sensor',
      category: 'sensor',
    },
    pins: [
      { id: 'pin1', label: 'Pin 1', signal: 'hyperspace_link' as any },
    ],
    outputs: [],
    properties: [],
    dependencies: {},
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  badSignalErr = err;
}
assert(badSignalErr !== null, 'Invalid signal type rejected');
assert(badSignalErr!.message.includes('PIN_SIGNAL_INVALID'), 'Diagnostic PIN_SIGNAL_INVALID reported');

// ─── Section 4: Graph Integrity Validation ───────────────────────
console.log('\n--- 4. Graph Integrity Validation ---');

// 4.1 Graph package without subflow rejected
let missingSubflowErr: Error | null = null;
try {
  registerComponent({
    id: 'no_subflow_sensor',
    version: '1.0.0',
    metadata: {
      id: 'no_subflow_sensor',
      name: 'No Subflow Sensor',
      category: 'sensor',
    },
    pins: [{ id: 'p1', label: 'P1', signal: 'analog_input' }],
    outputs: [{ id: 'out', label: 'Out', type: 'int' }],
    properties: [],
    dependencies: {},
    implementation: {
      strategy: 'graph', // graph strategy but no subflow or graph provided
    },
  });
} catch (err: any) {
  missingSubflowErr = err;
}
assert(missingSubflowErr !== null, 'Graph package without subflow rejected');
assert(missingSubflowErr!.message.includes('SUBFLOW_MISSING'), 'Diagnostic SUBFLOW_MISSING reported');

// 4.2 Invalid entry rejected
let invalidEntryErr: Error | null = null;
try {
  registerComponent({
    id: 'bad_entry_sensor',
    version: '1.0.0',
    metadata: {
      id: 'bad_entry_sensor',
      name: 'Bad Entry Sensor',
      category: 'sensor',
    },
    pins: [{ id: 'p1', label: 'P1', signal: 'analog_input' }],
    outputs: [{ id: 'out', label: 'Out', type: 'int' }],
    properties: [],
    dependencies: {},
    implementation: {
      strategy: 'graph',
      entry: 'non_existent_entry_node',
      exit: 'node_exit',
      subflow: {
        entry: 'non_existent_entry_node',
        exit: 'node_exit',
        nodes: [
          { id: 'node_exit', type: 'baseNode', data: { nodeType: 'return', params: { value: '0' } } } as any,
        ],
        edges: [],
      },
    },
  });
} catch (err: any) {
  invalidEntryErr = err;
}
assert(invalidEntryErr !== null, 'Subflow with invalid entry rejected');
assert(invalidEntryErr!.message.includes('SUBFLOW_ENTRY_NOT_FOUND'), 'Diagnostic SUBFLOW_ENTRY_NOT_FOUND reported');

// 4.3 Invalid exit rejected
let invalidExitErr: Error | null = null;
try {
  registerComponent({
    id: 'bad_exit_sensor',
    version: '1.0.0',
    metadata: {
      id: 'bad_exit_sensor',
      name: 'Bad Exit Sensor',
      category: 'sensor',
    },
    pins: [{ id: 'p1', label: 'P1', signal: 'analog_input' }],
    outputs: [{ id: 'out', label: 'Out', type: 'int' }],
    properties: [],
    dependencies: {},
    implementation: {
      strategy: 'graph',
      entry: 'node_entry',
      exit: 'non_existent_exit_node',
      subflow: {
        entry: 'node_entry',
        exit: 'non_existent_exit_node',
        nodes: [
          { id: 'node_entry', type: 'baseNode', data: { nodeType: 'digital_read', params: { pin: '$p1' } } } as any,
        ],
        edges: [],
      },
    },
  });
} catch (err: any) {
  invalidExitErr = err;
}
assert(invalidExitErr !== null, 'Subflow with invalid exit rejected');
assert(invalidExitErr!.message.includes('SUBFLOW_EXIT_NOT_FOUND'), 'Diagnostic SUBFLOW_EXIT_NOT_FOUND reported');

// 4.4 Non-canonical subflow primitive rejected
let nonCanonicalErr: Error | null = null;
try {
  registerComponent({
    id: 'non_canonical_sensor',
    version: '1.0.0',
    metadata: {
      id: 'non_canonical_sensor',
      name: 'Non Canonical Sensor',
      category: 'sensor',
    },
    pins: [{ id: 'p1', label: 'P1', signal: 'analog_input' }],
    outputs: [{ id: 'out', label: 'Out', type: 'int' }],
    properties: [],
    dependencies: {},
    implementation: {
      strategy: 'graph',
      entry: 'node_1',
      exit: 'node_2',
      subflow: {
        entry: 'node_1',
        exit: 'node_2',
        nodes: [
          { id: 'node_1', type: 'baseNode', data: { nodeType: 'legacy_magical_sensor', params: {} } } as any,
          { id: 'node_2', type: 'baseNode', data: { nodeType: 'return', params: { value: '0' } } } as any,
        ],
        edges: [{ id: 'e1', source: 'node_1', target: 'node_2' } as any],
      },
    },
  });
} catch (err: any) {
  nonCanonicalErr = err;
}
assert(nonCanonicalErr !== null, 'Subflow with non-canonical primitive rejected');
assert(nonCanonicalErr!.message.includes('SUBFLOW_NON_CANONICAL_PRIMITIVE'), 'Diagnostic SUBFLOW_NON_CANONICAL_PRIMITIVE reported');

// ─── Section 5: Placeholder Integrity Validation ─────────────────
console.log('\n--- 5. Placeholder Integrity Validation ---');

// 5.1 Undeclared placeholder in setup rejected
let undeclaredPlaceholderErr: Error | null = null;
try {
  registerComponent({
    id: 'undeclared_ph_sensor',
    version: '1.0.0',
    metadata: {
      id: 'undeclared_ph_sensor',
      name: 'Undeclared PH Sensor',
      category: 'sensor',
    },
    pins: [{ id: 'pin1', label: 'Pin 1', signal: 'digital_input' }],
    outputs: [],
    properties: [],
    dependencies: {
      setup: ['pinMode($phantomPin, INPUT);'], // $phantomPin is undeclared
    },
    implementation: { strategy: 'builtin' },
  });
} catch (err: any) {
  undeclaredPlaceholderErr = err;
}
assert(undeclaredPlaceholderErr !== null, 'Undeclared placeholder in setup rejected');
assert(undeclaredPlaceholderErr!.message.includes('UNDECLARED_PLACEHOLDER'), 'Diagnostic UNDECLARED_PLACEHOLDER reported');
assert(undeclaredPlaceholderErr!.message.includes('$phantomPin'), 'Error identifies offending placeholder $phantomPin');

// 5.2 Declared pin placeholder accepted
const declaredPinComp = registerComponent({
  id: 'declared_pin_sensor',
  version: '1.0.0',
  metadata: {
    id: 'declared_pin_sensor',
    name: 'Declared Pin Sensor',
    category: 'sensor',
  },
  pins: [{ id: 'sig', label: 'Signal', signal: 'digital_input' }],
  outputs: [],
  properties: [],
  dependencies: {
    setup: ['pinMode($sig, INPUT);'],
  },
  implementation: { strategy: 'builtin' },
});
assert(declaredPinComp.id === 'declared_pin_sensor', 'Declared pin placeholder $sig accepted');

// 5.3 Declared property placeholder accepted
const declaredPropComp = registerComponent({
  id: 'declared_prop_sensor',
  version: '1.0.0',
  metadata: {
    id: 'declared_prop_sensor',
    name: 'Declared Prop Sensor',
    category: 'sensor',
  },
  pins: [{ id: 'p1', label: 'P1', signal: 'digital_input' }],
  outputs: [],
  properties: [{ id: 'baudRate', label: 'Baud Rate', type: 'number', defaultValue: 9600 }],
  dependencies: {
    setup: ['Serial.begin($baudRate);'],
  },
  implementation: { strategy: 'builtin' },
});
assert(declaredPropComp.id === 'declared_prop_sensor', 'Declared property placeholder $baudRate accepted');

// ─── Section 6: Registry Isolation & Immutability ────────────────
console.log('\n--- 6. Registry Isolation & Immutability ---');

// 6.1 Direct mutation through componentsRegistry is blocked
let proxyMutationErr: Error | null = null;
try {
  (componentsRegistry as any)['tampered_package'] = { id: 'tampered' };
} catch (err: any) {
  proxyMutationErr = err;
}
assert(proxyMutationErr !== null, 'Direct property assignment on componentsRegistry throws error');
assert(proxyMutationErr!.message.includes('Cannot directly mutate componentsRegistry'), 'Protected proxy error message returned');

// 6.2 Direct deletion from componentsRegistry is blocked
let proxyDeleteErr: Error | null = null;
try {
  delete (componentsRegistry as any)['ldr_light'];
} catch (err: any) {
  proxyDeleteErr = err;
}
assert(proxyDeleteErr !== null, 'Direct deletion from componentsRegistry throws error');
assert(proxyDeleteErr!.message.includes('Cannot directly delete'), 'Protected proxy delete error message returned');

// 6.3 External mutation of retrieved package does NOT corrupt registered definition
const pkgFirstRetrieve = getComponentPackage('ldr_light');
assert(pkgFirstRetrieve !== undefined, 'Retrieved ldr_light from registry');
assert(pkgFirstRetrieve!.pins.length === 2, 'Initial ldr_light has 2 pins');

// Attempt external mutation on the retrieved object
pkgFirstRetrieve!.pins = [];
pkgFirstRetrieve!.metadata.name = 'CORRUPTED_NAME';

// Retrieve again and verify internal registry was NOT affected
const pkgSecondRetrieve = getComponentPackage('ldr_light');
assert(pkgSecondRetrieve!.pins.length === 2, 'Canonical registered definition retains 2 pins after external mutation');
assert(pkgSecondRetrieve!.metadata.name === 'LDR Light Sensor', 'Canonical registered metadata.name remains pristine');

// 6.4 External mutation of componentsRegistry index access does NOT corrupt registry
const pkgFromDirectAccess = componentsRegistry['ultrasonic_hcsr04'];
assert(pkgFromDirectAccess !== undefined, 'Retrieved ultrasonic_hcsr04 via componentsRegistry');
assert(pkgFromDirectAccess.pins.length === 4, 'Initial ultrasonic_hcsr04 has 4 pins');

// Attempt external mutation
pkgFromDirectAccess.pins = [];
pkgFromDirectAccess.id = 'CORRUPTED_HCSR04';

// Retrieve again via componentsRegistry
const pkgFromSecondDirectAccess = componentsRegistry['ultrasonic_hcsr04'];
assert(pkgFromSecondDirectAccess.pins.length === 4, 'componentsRegistry returns defensive copy: pins remain pristine');
assert(pkgFromSecondDirectAccess.id === 'ultrasonic_hcsr04', 'componentsRegistry id remains pristine');

// 6.5 Pre-registration mutability is preserved
const candidatePackage: PackageDefinition = {
  id: 'mutable_builder_sensor',
  version: '1.0.0',
  metadata: {
    id: 'mutable_builder_sensor',
    name: 'Builder Sensor',
    category: 'sensor',
  },
  pins: [],
  outputs: [],
  properties: [],
  dependencies: {},
  implementation: { strategy: 'builtin' },
};
// Legitimate mutable construction before registration
candidatePackage.pins.push({ id: 'din', label: 'DIN', signal: 'digital_input' });
candidatePackage.outputs.push({ id: 'active', label: 'Active', type: 'bool' });

const registeredCandidate = registerComponent(candidatePackage);
assert(registeredCandidate.pins.length === 1, 'Candidate package registered successfully after mutable construction');
assert(registeredCandidate.outputs.length === 1, 'Candidate outputs registered correctly');

// ─── Summary ─────────────────────────────────────────────────────
console.log('\n==================================================');
console.log(`SUMMARY: ${passedTests} passed, ${totalTests - passedTests} failed`);
console.log('==================================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
