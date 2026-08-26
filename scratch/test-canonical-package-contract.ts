import { Node, Edge } from '@xyflow/react';
import { 
  PackageManifest, 
  CanonicalComponentDefinition,
  TargetImplementation,
  ComponentPackage
} from '../lib/registry/components/types';
import { 
  registerPackage, 
  registerComponent, 
  getPackage, 
  getComponentPackage, 
  getAllPackages, 
  getAllComponents, 
  getComponentsByCategory, 
  getComponentDependencies,
  componentsRegistry
} from '../lib/registry/components';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { instantiatePackageGraph } from '../lib/packages/packageGraphInstantiator';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';

console.log('=== TEST PHASE 5H: CANONICAL PACKAGE CONTRACT & TARGET-AWARE ARCHITECTURE ===\n');

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

const generator = new ArduinoUnoGenerator();

// ─────────────────────────────────────────────────────────────────
// T1 — Canonical Package Manifest
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Canonical Package Manifest ---');

const testSensorPack: PackageManifest = {
  id: 'flow.sensors.environmental',
  name: 'Environmental Sensor Pack',
  version: '1.2.0',
  description: 'Collection of environmental sensors for IoT projects',
  author: 'Flow Robotics Lab',
  license: 'MIT',
  tags: ['sensors', 'environment', 'iot'],
  dependencies: {
    'flow.core.math': '^1.0.0'
  },
  components: {
    'env_temp_sensor': {
      id: 'env_temp_sensor',
      name: 'Precision Temperature Sensor',
      category: 'sensor',
      description: 'Digital temperature sensor',
      pins: [
        { id: 'vcc', label: 'VCC', signal: 'power', required: true },
        { id: 'data', label: 'DATA', signal: 'digital_input', required: true },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true }
      ],
      outputs: [
        { id: 'temperature', label: 'Temperature', type: 'float', description: 'Degrees Celsius' }
      ],
      properties: [
        { id: 'pin', label: 'Data Pin', type: 'pin', defaultValue: '2' }
      ],
      dependencies: {
        includes: ['<OneWire.h>'],
        setup: ['pinMode($pin, INPUT)']
      },
      implementations: {
        'arduino_uno': {
          strategy: 'graph',
          version: 1,
          entry: 'start_read_uno',
          exit: 'return_temp_uno',
          dependencies: {
            includes: ['<ArduinoUnoFastTemp.h>'],
            setup: ['initUnoTemp($pin)']
          },
          graph: {
            entry: 'start_read_uno',
            exit: 'return_temp_uno',
            nodes: [
              { id: 'start_read_uno', type: 'baseNode', data: { label: 'Start Read Uno', nodeType: 'gpio', params: { pin: '2', value: 'LOW' } } },
              { id: 'delay_uno', type: 'baseNode', data: { nodeType: 'delay', params: { ms: '10' } } },
              { id: 'return_temp_uno', type: 'baseNode', data: { nodeType: 'assignment', params: { target: 'val', expression: '25.0' } } }
            ],
            edges: [
              { id: 'e1', source: 'start_read_uno', target: 'delay_uno', sourceHandle: 'flow', targetHandle: 'flow' },
              { id: 'e2', source: 'delay_uno', target: 'return_temp_uno', sourceHandle: 'flow', targetHandle: 'flow' }
            ]
          }
        },
        'esp32': {
          strategy: 'graph',
          version: 1,
          entry: 'start_read_esp',
          exit: 'return_temp_esp',
          dependencies: {
            includes: ['<ESP32FastTemp.h>'],
            setup: ['initEspTemp($pin)']
          },
          graph: {
            entry: 'start_read_esp',
            exit: 'return_temp_esp',
            nodes: [
              { id: 'start_read_esp', type: 'baseNode', data: { nodeType: 'gpio', params: { pin: '4', value: 'LOW' } } },
              { id: 'delay_esp', type: 'baseNode', data: { nodeType: 'delay', params: { ms: '2' } } },
              { id: 'return_temp_esp', type: 'baseNode', data: { nodeType: 'assignment', params: { target: 'val', expression: '25.0' } } }
            ],
            edges: [
              { id: 'e1', source: 'start_read_esp', target: 'delay_esp', sourceHandle: 'flow', targetHandle: 'flow' },
              { id: 'e2', source: 'delay_esp', target: 'return_temp_esp', sourceHandle: 'flow', targetHandle: 'flow' }
            ]
          }
        },
        'generic': {
          strategy: 'builtin',
          version: 1,
          dependencies: {
            includes: ['<GenericTemp.h>']
          }
        }
      }
    },
    'env_humidity_sensor': {
      id: 'env_humidity_sensor',
      name: 'Precision Humidity Sensor',
      category: 'sensor',
      pins: [
        { id: 'vcc', label: 'VCC', signal: 'power', required: true },
        { id: 'sig', label: 'SIG', signal: 'analog_input', required: true },
        { id: 'gnd', label: 'GND', signal: 'ground', required: true }
      ],
      outputs: [
        { id: 'humidity', label: 'Humidity', type: 'float' }
      ],
      properties: [
        { id: 'pin', label: 'Signal Pin', type: 'pin', defaultValue: 'A0' }
      ],
      implementation: {
        strategy: 'builtin',
        version: 1
      }
    }
  }
};

registerPackage(testSensorPack);

const retrievedPack = getPackage('flow.sensors.environmental');
assert(Boolean(retrievedPack), 'T1: Package manifest retrieved from registry');
assert(retrievedPack?.name === 'Environmental Sensor Pack', 'T1: Package name matches');
assert(retrievedPack?.version === '1.2.0', 'T1: Package version matches');
assert(retrievedPack?.author === 'Flow Robotics Lab', 'T1: Package author matches');
assert(retrievedPack?.license === 'MIT', 'T1: Package license matches');

// ─────────────────────────────────────────────────────────────────
// T2 — Multi-Component Packages
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Multi-Component Packages ---');

const tempComp = getComponentPackage('env_temp_sensor');
const humComp = getComponentPackage('env_humidity_sensor');

assert(Boolean(tempComp), 'T2: First component in package resolved');
assert(Boolean(humComp), 'T2: Second component in package resolved');
assert(tempComp?.name === 'Precision Temperature Sensor', 'T2: First component name matches');
assert(humComp?.name === 'Precision Humidity Sensor', 'T2: Second component name matches');
assert(tempComp?.category === 'sensor', 'T2: Category shim mapped accurately');

// ─────────────────────────────────────────────────────────────────
// T3 — Single-Component Package Compatibility
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Single-Component Package Compatibility ---');

const hcsr04 = getComponentPackage('ultrasonic_hcsr04');
const dht11 = getComponentPackage('dht11');
const l298n = getComponentPackage('l298n');

assert(Boolean(hcsr04), 'T3: Builtin HC-SR04 package resolved');
assert(Boolean(dht11), 'T3: Builtin DHT11 package resolved');
assert(Boolean(l298n), 'T3: Builtin L298N package resolved');
assert(hcsr04?.pins.length === 4, 'T3: HC-SR04 pins intact');
assert(dht11?.category === 'sensor', 'T3: DHT11 category intact');

// ─────────────────────────────────────────────────────────────────
// T4 — Target-Specific Implementations
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Target-Specific Implementations ---');

const unoResolution = resolvePackageImplementation(tempComp!, 'arduino_uno');
const esp32Resolution = resolvePackageImplementation(tempComp!, 'esp32');

assert(unoResolution.strategy === 'graph', 'T4: Uno resolved to graph strategy');
assert(unoResolution.entry === 'start_read_uno', 'T4: Uno resolved entry = start_read_uno');
assert(unoResolution.graph?.nodes.length === 3, 'T4: Uno resolved 3 graph nodes');

assert(esp32Resolution.strategy === 'graph', 'T4: ESP32 resolved to graph strategy');
assert(esp32Resolution.entry === 'start_read_esp', 'T4: ESP32 resolved entry = start_read_esp');
assert(esp32Resolution.graph?.nodes.length === 3, 'T4: ESP32 resolved 3 graph nodes');

// ─────────────────────────────────────────────────────────────────
// T5 — Target Fallback to Generic
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Target Fallback to Generic ---');

const stm32Resolution = resolvePackageImplementation(tempComp!, 'stm32');
assert(stm32Resolution.strategy === 'builtin', 'T5: STM32 falls back to generic target builtin strategy');
assert(stm32Resolution.dependencies?.includes?.[0] === '<GenericTemp.h>', 'T5: Generic target dependencies returned');

// ─────────────────────────────────────────────────────────────────
// T6 — Target-Specific Dependencies
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Target-Specific Dependencies ---');

const unoDeps = getComponentDependencies('env_temp_sensor', 'arduino_uno');
const espDeps = getComponentDependencies('env_temp_sensor', 'esp32');

assert(unoDeps.includes?.[0] === '<ArduinoUnoFastTemp.h>', 'T6: Uno target dependencies include ArduinoUnoFastTemp.h');
assert(espDeps.includes?.[0] === '<ESP32FastTemp.h>', 'T6: ESP32 target dependencies include ESP32FastTemp.h');

// ─────────────────────────────────────────────────────────────────
// T7 — Graph vs Native vs Builtin Strategies
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Graph vs Native vs Builtin Strategies ---');

const nativeComp = registerComponent({
  id: 'custom_dsp_filter',
  name: 'DSP Math Filter',
  category: 'sensor',
  pins: [],
  outputs: [{ id: 'filtered', label: 'Filtered', type: 'float' }],
  properties: [],
  implementation: {
    strategy: 'native',
    version: 1,
    native: {
      template: 'float $out = dsp_biquad_filter($in);'
    }
  }
});

const resolvedNative = resolvePackageImplementation(nativeComp);
assert(resolvedNative.strategy === 'native', 'T7: Native implementation resolves with strategy="native"');
assert(Boolean(resolvedNative.native), 'T7: Native metadata preserved in resolved implementation');

// ─────────────────────────────────────────────────────────────────
// T8 — Target-Aware Instantiation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Target-Aware Instantiation ---');

const unoInst = instantiatePackageGraph({
  packageId: 'env_temp_sensor',
  componentInstanceId: 'temp_inst_1',
  targetId: 'arduino_uno'
});

const espInst = instantiatePackageGraph({
  packageId: 'env_temp_sensor',
  componentInstanceId: 'temp_inst_2',
  targetId: 'esp32'
});

assert(unoInst.entry === 'start_read_uno', 'T8: Uno instance entry is start_read_uno');
assert(espInst.entry === 'start_read_esp', 'T8: ESP32 instance entry is start_read_esp');
assert(unoInst.nodes !== espInst.nodes, 'T8: Instances have isolated node arrays');
assert(unoInst.nodes[0] !== espInst.nodes[0], 'T8: Instances have isolated node objects');

// ─────────────────────────────────────────────────────────────────
// T9 — Target-Aware Compilation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Target-Aware Compilation ---');

const targetNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'temp_sensor_node', type: 'componentNode', data: { packageId: 'env_temp_sensor', varTemp: 'val' }, position: { x: 200, y: 0 } }
];
const targetEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'temp_sensor_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const compilerUno = new GraphToASTCompiler(
  targetNodes,
  targetEdges,
  {},
  {},
  [],
  [],
  { targetId: 'arduino_uno' }
);
const astUno = compilerUno.compile();
assert(astUno.kind === 'Program', 'T9: Target-aware compilation produces Program AST');
assert(astUno.body.length > 0, 'T9: AST body has expanded nodes');

// ─────────────────────────────────────────────────────────────────
// T10 — Registry Immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Registry Immutability ---');

const originalNodes = (testSensorPack.components as any)['env_temp_sensor'].implementations['arduino_uno'].graph.nodes;
unoInst.nodes[0].data.label = 'MUTATED IN INSTANCE';

assert(
  originalNodes[0].data.label === 'Start Read Uno',
  'T10: Mutating instantiated graph node did not mutate package registry template'
);

// ─────────────────────────────────────────────────────────────────
// T11 — Backward Compatibility
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Backward Compatibility ---');

const allComps = getAllComponents();
assert(allComps.length >= 22, 'T11: getAllComponents returns full list of components');

const allCategories = getComponentsByCategory('sensor');
assert(allCategories.length >= 11, 'T11: getComponentsByCategory returns matching components');

const directRegistryLookup = componentsRegistry['ultrasonic_hcsr04'];
assert(Boolean(directRegistryLookup), 'T11: Direct componentsRegistry lookup works for existing components');
assert(directRegistryLookup.name === 'Ultrasonic HC-SR04', 'T11: Direct registry access returns flat name');
assert(directRegistryLookup.category === 'sensor', 'T11: Direct registry access returns flat category');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
