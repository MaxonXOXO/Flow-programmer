import { instantiatePackageGraph } from '../lib/packages/packageGraphInstantiator';
import { getComponentPackage, componentsRegistry } from '../lib/registry/components';
import { useFlowStore } from '../store/userFlowStore';

console.log('=== TEST PHASE 5B: PACKAGE GRAPH LOADING & SUBFLOW INSTANTIATION ===\n');

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
// T1 — HC-SR04 package resolution
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: HC-SR04 Package Resolution ---');
const instance = instantiatePackageGraph({ packageId: 'ultrasonic_hcsr04' });

assert(instance !== undefined, 'T1: PackageGraphInstance returned');
assert(instance.packageId === 'ultrasonic_hcsr04', 'T1: packageId is "ultrasonic_hcsr04"');
assert(instance.unlocked === false, 'T1: Default unlocked state is false');
assert(instance.dirty === false, 'T1: Default dirty state is false');

// ─────────────────────────────────────────────────────────────────
// T2 — Graph structure
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Graph Structure ---');
assert(Array.isArray(instance.nodes) && instance.nodes.length === 9, 'T2: Instantiated graph contains 9 nodes');
assert(Array.isArray(instance.edges) && instance.edges.length === 8, 'T2: Instantiated graph contains 8 edges');
assert(instance.entry === 'trig_low_1', 'T2: Instantiated graph entry is "trig_low_1"');
assert(instance.exit === 'return_distance', 'T2: Instantiated graph exit is "return_distance"');

// ─────────────────────────────────────────────────────────────────
// T3 — Deep clone
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Deep Clone & Reference Isolation ---');
const origPkg = getComponentPackage('ultrasonic_hcsr04')!;
const origGraph = (origPkg.implementation.graph || origPkg.implementation.subflow) as any;

assert(instance.nodes !== origGraph.nodes, 'T3: Nodes array is a distinct reference');
assert(instance.edges !== origGraph.edges, 'T3: Edges array is a distinct reference');
assert(instance.nodes[0] !== origGraph.nodes[0], 'T3: Node object is a distinct reference');
assert(instance.nodes[1].data !== origGraph.nodes[1].data, 'T3: Node data object is a distinct reference');
assert(
  instance.nodes[1].data.params !== origGraph.nodes[1].data.params,
  'T3: Node data.params object is a distinct reference'
);

// ─────────────────────────────────────────────────────────────────
// T4 — Package immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Package Immutability ---');
const originalVal = (origGraph.nodes[1].data as any).params.pin;
(instance.nodes[1].data as any).params.pin = 'MODIFIED_PIN_99';

const freshPkgCheck = getComponentPackage('ultrasonic_hcsr04')!;
const freshGraphCheck = (freshPkgCheck.implementation.graph || freshPkgCheck.implementation.subflow) as any;

assert(
  freshGraphCheck.nodes[1].data.params.pin === originalVal,
  'T4: Mutating instance node parameters did not modify the package template graph in registry'
);

// Restore instance value for clean state
(instance.nodes[1].data as any).params.pin = originalVal;

// ─────────────────────────────────────────────────────────────────
// T5 — Instance isolation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Instance Isolation ---');
const frontSensor = instantiatePackageGraph({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front',
});
const rearSensor = instantiatePackageGraph({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_rear',
});

assert(frontSensor.componentInstanceId === 'sensor_front', 'T5: Front sensor instance has instance ID');
assert(rearSensor.componentInstanceId === 'sensor_rear', 'T5: Rear sensor instance has instance ID');

(frontSensor.nodes[1].data as any).params.pin = 'PIN_FRONT_10';

assert(
  (rearSensor.nodes[1].data as any).params.pin !== 'PIN_FRONT_10',
  'T5: Mutating sensor_front graph did not modify sensor_rear graph'
);
assert(
  origGraph.nodes[1].data.params.pin !== 'PIN_FRONT_10',
  'T5: Mutating sensor_front graph did not modify package template graph'
);

// ─────────────────────────────────────────────────────────────────
// T6 — Entry/exit preservation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Entry/Exit Preservation ---');
assert(frontSensor.entry === 'trig_low_1', 'T6: Preserved entry metadata "trig_low_1"');
assert(frontSensor.exit === 'return_distance', 'T6: Preserved exit metadata "return_distance"');

// ─────────────────────────────────────────────────────────────────
// T7 — Missing package error handling
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Missing Package Error Handling ---');
let caughtErrorT7 = false;
try {
  instantiatePackageGraph({ packageId: 'nonexistent_package_123' });
} catch (err: any) {
  caughtErrorT7 = true;
  assert(
    err.message.includes('does not exist'),
    `T7: Produced expected error message: "${err.message}"`
  );
}
assert(caughtErrorT7, 'T7: Threw exception when package does not exist');

// ─────────────────────────────────────────────────────────────────
// T8 — Missing implementation graph error handling
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Missing Implementation Graph Error Handling ---');
// Temporarily register a package without a graph
const mockNoGraphPkg = getComponentPackage('dht11')!;
const savedImpl = mockNoGraphPkg.implementation;
(mockNoGraphPkg as any).implementation = { strategy: 'builtin', version: 1 };

let caughtErrorT8 = false;
try {
  instantiatePackageGraph({ packageId: 'dht11' });
} catch (err: any) {
  caughtErrorT8 = true;
  assert(
    err.message.includes('has no graph') || err.message.includes('has no implementation'),
    `T8: Produced expected error message: "${err.message}"`
  );
}
assert(caughtErrorT8, 'T8: Threw exception when package has no implementation graph');
// Restore
(mockNoGraphPkg as any).implementation = savedImpl;

// ─────────────────────────────────────────────────────────────────
// T9 — Invalid entry error handling
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Invalid Entry Node Reference Error Handling ---');
const regPkgT9 = (componentsRegistry as any)['ultrasonic_hcsr04'];
const savedGraphT9 = regPkgT9.implementation.graph;
regPkgT9.implementation.graph = {
  ...savedGraphT9,
  entry: 'nonexistent_entry_node',
};

let caughtErrorT9 = false;
try {
  instantiatePackageGraph({ packageId: 'ultrasonic_hcsr04' });
} catch (err: any) {
  caughtErrorT9 = true;
  assert(
    err.message.includes('entry references a nonexistent node'),
    `T9: Produced expected error message: "${err.message}"`
  );
}
assert(caughtErrorT9, 'T9: Threw exception when entry node does not exist');
regPkgT9.implementation.graph = savedGraphT9;

// ─────────────────────────────────────────────────────────────────
// T10 — Invalid exit error handling
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Invalid Exit Node Reference Error Handling ---');
const regPkgT10 = (componentsRegistry as any)['ultrasonic_hcsr04'];
const savedGraphT10 = regPkgT10.implementation.graph;
regPkgT10.implementation.graph = {
  ...savedGraphT10,
  exit: 'nonexistent_exit_node',
};

let caughtErrorT10 = false;
try {
  instantiatePackageGraph({ packageId: 'ultrasonic_hcsr04' });
} catch (err: any) {
  caughtErrorT10 = true;
  assert(
    err.message.includes('exit references a nonexistent node'),
    `T10: Produced expected error message: "${err.message}"`
  );
}
assert(caughtErrorT10, 'T10: Threw exception when exit node does not exist');
regPkgT10.implementation.graph = savedGraphT10;

// ─────────────────────────────────────────────────────────────────
// T11 — Repeated instantiation reference isolation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Repeated Instantiation Reference Isolation ---');
const instanceA = instantiatePackageGraph({ packageId: 'ultrasonic_hcsr04' });
const instanceB = instantiatePackageGraph({ packageId: 'ultrasonic_hcsr04' });

assert(instanceA !== instanceB, 'T11: instanceA and instanceB are distinct objects');
assert(instanceA.nodes !== instanceB.nodes, 'T11: instanceA and instanceB have distinct nodes arrays');
assert(
  instanceA.nodes[0].data.params !== instanceB.nodes[0].data.params,
  'T11: instanceA and instanceB have distinct parameter object references'
);

// ─────────────────────────────────────────────────────────────────
// T12 — Store integration & lifecycle
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Store Integration & Lifecycle ---');
const storeDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'test_store_sensor',
  title: 'Test Store Sensor',
});

const storedGraphInstance = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'test_store_sensor');

assert(storedGraphInstance !== undefined, 'T12: Store contains instantiated PackageGraphInstance');
assert(
  storedGraphInstance?.packageId === 'ultrasonic_hcsr04',
  'T12: Stored instance packageId is "ultrasonic_hcsr04"'
);
assert(
  storedGraphInstance?.componentInstanceId === 'test_store_sensor',
  'T12: Stored instance componentInstanceId is "test_store_sensor"'
);
assert(storedGraphInstance?.nodes.length === 9, 'T12: Stored instance has 9 nodes');

// Close subflow document and verify graph instance cleanup
useFlowStore.getState().closeSubflowDocument(storeDocId);
const cleanedInstance = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'test_store_sensor');
assert(cleanedInstance === undefined, 'T12: Closing subflow document destroys temporary graph instance from store');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
