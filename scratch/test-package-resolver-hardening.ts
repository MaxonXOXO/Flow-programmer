import { 
  resolvePackage, 
  resolvePackageImplementation, 
  PackageResolverError, 
  ResolverErrorCode 
} from '../lib/compiler/packages/packageResolver';
import { 
  normalizePackageId, 
  normalizeFlowGraphNode, 
  LEGACY_PACKAGE_ID_ALIASES 
} from '../lib/compiler/parser/nodeNormalizer';
import { getComponentPackage } from '../lib/registry/components';
import { dispatchPackageExecution } from '../lib/compiler/packages/packageDispatcher';
import { Node } from '@xyflow/react';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

function assertThrows(fn: () => any, expectedCode: ResolverErrorCode, message: string) {
  try {
    fn();
    console.error(`❌ [FAIL] Expected to throw ${expectedCode} but did not: ${message}`);
    failed++;
  } catch (err: any) {
    if (err instanceof PackageResolverError && err.code === expectedCode) {
      console.log(`✅ [PASS] Threw expected ${expectedCode}: ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Threw unexpected error (expected ${expectedCode}): ${err.message || err} for: ${message}`);
      failed++;
    }
  }
}

async function runTests() {
  console.log('=== PHASE 6A.4.3: PACKAGE RESOLVER HARDENING & LEGACY ALIAS ELIMINATION ===\n');

  // --------------------------------------------------------------------------
  // 1. Canonical Resolution
  // --------------------------------------------------------------------------
  console.log('--- 1. Canonical Package Resolution ---');
  {
    // Known canonical package resolves
    const ldrPkg = resolvePackage('ldr_light');
    assert(ldrPkg !== undefined, 'Known canonical package "ldr_light" resolves');
    assert(ldrPkg.id === 'ldr_light', 'Returned package ID strictly matches "ldr_light"');
    assert(ldrPkg.metadata.name === 'LDR Light Sensor', 'Returned package metadata matches registered package');

    const hcsr04Pkg = resolvePackage('ultrasonic_hcsr04');
    assert(hcsr04Pkg !== undefined, 'Known canonical package "ultrasonic_hcsr04" resolves');
    assert(hcsr04Pkg.id === 'ultrasonic_hcsr04', 'Returned package ID strictly matches "ultrasonic_hcsr04"');

    // Implementation resolution for canonical package
    const ldrImpl = resolvePackageImplementation('ldr_light', 'arduino_uno');
    assert(ldrImpl.packageId === 'ldr_light', 'resolvePackageImplementation produces canonical packageId');
    assert(ldrImpl.strategy === 'graph', 'ldr_light resolves to "graph" strategy on arduino_uno');
    assert(ldrImpl.entry === 'read_analog', 'ldr_light preserves explicit subflow entry');
    assert(ldrImpl.exit === 'return_light', 'ldr_light preserves explicit subflow exit');

    // Nonexistent canonical package fails
    assertThrows(
      () => resolvePackage('nonexistent_hardware_pkg_xyz'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage throws PACKAGE_NOT_FOUND for nonexistent package'
    );

    assertThrows(
      () => resolvePackageImplementation('nonexistent_hardware_pkg_xyz'),
      'PACKAGE_NOT_FOUND',
      'resolvePackageImplementation throws PACKAGE_NOT_FOUND for nonexistent package'
    );
  }

  // --------------------------------------------------------------------------
  // 2. Legacy Aliases Isolation & Normalizer Boundary Ownership
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Legacy Aliases Isolation & Normalizer Boundary Ownership ---');
  {
    // 2.1 Resolver itself does NOT own legacy alias lookup
    assertThrows(
      () => resolvePackage('ldr'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("ldr") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackage('ultrasonic'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("ultrasonic") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackage('hcsr04'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("hcsr04") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackage('pir'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("pir") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackage('servo'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("servo") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackage('dht'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("dht") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackage('button'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("button") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackageImplementation('ldr'),
      'PACKAGE_NOT_FOUND',
      'resolvePackageImplementation("ldr") rejects legacy alias without guessing'
    );

    assertThrows(
      () => resolvePackageImplementation('hcsr04'),
      'PACKAGE_NOT_FOUND',
      'resolvePackageImplementation("hcsr04") rejects legacy alias without guessing'
    );

    // 2.2 nodeNormalizer owns legacy identifier normalization
    assert(normalizePackageId('ldr') === 'ldr_light', 'normalizePackageId converts "ldr" -> "ldr_light"');
    assert(normalizePackageId('ultrasonic') === 'ultrasonic_hcsr04', 'normalizePackageId converts "ultrasonic" -> "ultrasonic_hcsr04"');
    assert(normalizePackageId('hcsr04') === 'ultrasonic_hcsr04', 'normalizePackageId converts "hcsr04" -> "ultrasonic_hcsr04"');
    assert(normalizePackageId('pir') === 'pir_motion', 'normalizePackageId converts "pir" -> "pir_motion"');
    assert(normalizePackageId('servo') === 'servo_motor', 'normalizePackageId converts "servo" -> "servo_motor"');
    assert(normalizePackageId('dht') === 'dht11', 'normalizePackageId converts "dht" -> "dht11"');
    assert(normalizePackageId('button') === 'push_button', 'normalizePackageId converts "button" -> "push_button"');
    assert(normalizePackageId('btn') === 'push_button', 'normalizePackageId converts "btn" -> "push_button"');
    assert(normalizePackageId('motor') === 'dc_motor', 'normalizePackageId converts "motor" -> "dc_motor"');
    assert(normalizePackageId('buzzer') === 'piezo_buzzer', 'normalizePackageId converts "buzzer" -> "piezo_buzzer"');
    assert(normalizePackageId('relay') === 'relay_module', 'normalizePackageId converts "relay" -> "relay_module"');
    assert(normalizePackageId('stepper') === 'stepper_motor', 'normalizePackageId converts "stepper" -> "stepper_motor"');
    assert(normalizePackageId('bluetooth') === 'hc05_bluetooth', 'normalizePackageId converts "bluetooth" -> "hc05_bluetooth"');
    assert(normalizePackageId('nrf') === 'nrf24l01', 'normalizePackageId converts "nrf" -> "nrf24l01"');

    // Canonical IDs pass through unchanged
    assert(normalizePackageId('ldr_light') === 'ldr_light', 'normalizePackageId preserves canonical "ldr_light"');
    assert(normalizePackageId('ultrasonic_hcsr04') === 'ultrasonic_hcsr04', 'normalizePackageId preserves canonical "ultrasonic_hcsr04"');

    // 2.3 End-to-end pipeline: legacy input -> nodeNormalizer -> canonical packageId -> resolver -> package
    const legacyInput = 'ldr';
    const canonicalId = normalizePackageId(legacyInput);
    const resolvedFromLegacy = resolvePackage(canonicalId);
    const resolvedDirect = resolvePackage('ldr_light');
    assert(resolvedFromLegacy.id === resolvedDirect.id && resolvedFromLegacy.metadata.name === resolvedDirect.metadata.name, 'Pipeline produces identical package definition via normalization');
    assert(resolvedFromLegacy.id === 'ldr_light', 'Normalized legacy input successfully resolves canonical package');

    // 2.4 Node normalization at graph ingestion boundary
    const rawLegacyNode: Node = {
      id: 'n1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'ldr', label: 'Legacy LDR', params: { varLight: 'lux' } },
    };
    const normalizedNode = normalizeFlowGraphNode(rawLegacyNode);
    assert((normalizedNode.data as any).nodeType === 'component', 'Legacy nodeType="ldr" normalized to nodeType="component"');
    assert((normalizedNode.data as any).packageId === 'ldr_light', 'data.packageId set to canonical "ldr_light"');
    assert((normalizedNode.data as any).params.packageId === 'ldr_light', 'data.params.packageId set to canonical "ldr_light"');
    assert((normalizedNode.data as any).params.target === 'lux', 'data.params.target harmonized from varLight');

    const rawHcsr04Node: Node = {
      id: 'n2',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'hcsr04', label: 'Legacy HC-SR04' },
    };
    const normHcsr04Node = normalizeFlowGraphNode(rawHcsr04Node);
    assert((normHcsr04Node.data as any).nodeType === 'component', 'Legacy nodeType="hcsr04" normalized to nodeType="component"');
    assert((normHcsr04Node.data as any).packageId === 'ultrasonic_hcsr04', 'data.packageId set to canonical "ultrasonic_hcsr04"');

    const componentWithLegacyPackageId: Node = {
      id: 'n3',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: { packageId: 'ultrasonic' } },
    };
    const normCompNode = normalizeFlowGraphNode(componentWithLegacyPackageId);
    assert((normCompNode.data as any).params.packageId === 'ultrasonic_hcsr04', 'component node with params.packageId="ultrasonic" normalized to canonical ID');
  }

  // --------------------------------------------------------------------------
  // 3. Unknown-Package Resolution Rejection (No Synthetic Builtin Fallback)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Unknown-Package Rejection & Error Structure ---');
  {
    let thrownError: PackageResolverError | null = null;
    try {
      resolvePackage('totally_unknown_sensor');
    } catch (err: any) {
      thrownError = err;
    }

    assert(thrownError !== null, 'Unknown package throws error');
    assert(thrownError instanceof PackageResolverError, 'Error is instance of PackageResolverError');
    assert(thrownError?.code === 'PACKAGE_NOT_FOUND', 'Error code is PACKAGE_NOT_FOUND');
    assert(thrownError?.packageId === 'totally_unknown_sensor', 'Error contains offending packageId');
    assert(Boolean(thrownError?.message.includes('totally_unknown_sensor')), 'Error message contains packageId');
    assert(Boolean(thrownError?.message.includes('not registered')), 'Error message states package is not registered');

    // Test rejection in resolvePackageImplementation
    let thrownImplError: PackageResolverError | null = null;
    try {
      resolvePackageImplementation('bogus_actuator_99');
    } catch (err: any) {
      thrownImplError = err;
    }

    assert(thrownImplError !== null, 'resolvePackageImplementation throws on unknown package');
    assert(thrownImplError?.code === 'PACKAGE_NOT_FOUND', 'Implementation error code is PACKAGE_NOT_FOUND');
    assert(thrownImplError?.packageId === 'bogus_actuator_99', 'Implementation error contains packageId');

    // Invalid package references & whitespace
    assertThrows(
      () => resolvePackage(''),
      'INVALID_PACKAGE_REFERENCE',
      'Empty string package ID throws INVALID_PACKAGE_REFERENCE'
    );

    assertThrows(
      () => resolvePackage('   '),
      'INVALID_PACKAGE_REFERENCE',
      'Whitespace-only package ID throws INVALID_PACKAGE_REFERENCE'
    );

    assertThrows(
      () => resolvePackageImplementation(''),
      'INVALID_PACKAGE_REFERENCE',
      'Empty string resolvePackageImplementation throws INVALID_PACKAGE_REFERENCE'
    );

    assertThrows(
      () => resolvePackageImplementation('   '),
      'INVALID_PACKAGE_REFERENCE',
      'Whitespace-only resolvePackageImplementation throws INVALID_PACKAGE_REFERENCE'
    );

    assertThrows(
      () => resolvePackageImplementation(null as any),
      'INVALID_PACKAGE_REFERENCE',
      'null reference throws INVALID_PACKAGE_REFERENCE'
    );

    assertThrows(
      () => resolvePackageImplementation(undefined as any),
      'INVALID_PACKAGE_REFERENCE',
      'undefined reference throws INVALID_PACKAGE_REFERENCE'
    );

    assertThrows(
      () => resolvePackageImplementation({} as any),
      'INVALID_PACKAGE_REFERENCE',
      'Object without id throws INVALID_PACKAGE_REFERENCE'
    );

    // 3.1 Prototype Pollution & Inherited Property Safety (toString, constructor, __proto__)
    assert(normalizePackageId('toString') === 'toString', 'normalizePackageId("toString") returns string "toString"');
    assert(typeof normalizePackageId('toString') === 'string', 'normalizePackageId("toString") is string, not Function');
    assert(normalizePackageId('constructor') === 'constructor', 'normalizePackageId("constructor") returns string "constructor"');
    assert(normalizePackageId('__proto__') === '__proto__', 'normalizePackageId("__proto__") returns string "__proto__"');
    assert(normalizePackageId('valueOf') === 'valueOf', 'normalizePackageId("valueOf") returns string "valueOf"');
    assert(normalizePackageId('') === '', 'normalizePackageId("") returns empty string');
    assert(normalizePackageId('   ') === '', 'normalizePackageId("   ") returns empty string');
    assert(normalizePackageId(undefined) === '', 'normalizePackageId(undefined) returns empty string');

    assertThrows(
      () => resolvePackage('toString'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("toString") throws PACKAGE_NOT_FOUND (not Object.prototype.toString)'
    );

    assertThrows(
      () => resolvePackage('constructor'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("constructor") throws PACKAGE_NOT_FOUND (not Object.prototype.constructor)'
    );

    assertThrows(
      () => resolvePackage('__proto__'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("__proto__") throws PACKAGE_NOT_FOUND'
    );

    assertThrows(
      () => resolvePackage('valueOf'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage("valueOf") throws PACKAGE_NOT_FOUND'
    );

    assertThrows(
      () => resolvePackageImplementation('toString'),
      'PACKAGE_NOT_FOUND',
      'resolvePackageImplementation("toString") throws PACKAGE_NOT_FOUND'
    );

    assertThrows(
      () => resolvePackageImplementation('constructor'),
      'PACKAGE_NOT_FOUND',
      'resolvePackageImplementation("constructor") throws PACKAGE_NOT_FOUND'
    );

    assertThrows(
      () => resolvePackageImplementation('__proto__'),
      'PACKAGE_NOT_FOUND',
      'resolvePackageImplementation("__proto__") throws PACKAGE_NOT_FOUND'
    );

    // 3.2 Flow node boundary safety with prototype identifiers
    const protoNode1 = normalizeFlowGraphNode({
      id: 'proto1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'toString' }
    });
    assert((protoNode1.data as any).nodeType === 'toString', 'nodeType="toString" is NOT corrupted into a component node');
    assert((protoNode1.data as any).packageId === undefined, 'nodeType="toString" has undefined packageId');

    const protoNode2 = normalizeFlowGraphNode({
      id: 'proto2',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'constructor' }
    });
    assert((protoNode2.data as any).nodeType === 'constructor', 'nodeType="constructor" is NOT corrupted into a component node');
    assert((protoNode2.data as any).packageId === undefined, 'nodeType="constructor" has undefined packageId');

    const protoNode3 = normalizeFlowGraphNode({
      id: 'proto3',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: '__proto__' }
    });
    assert((protoNode3.data as any).nodeType === '__proto__', 'nodeType="__proto__" is NOT corrupted into a component node');
    assert((protoNode3.data as any).packageId === undefined, 'nodeType="__proto__" has undefined packageId');

    const blankPkgNode = normalizeFlowGraphNode({
      id: 'blank1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: { packageId: '   ' } }
    });
    assert((blankPkgNode.data as any).params.packageId === '', 'Whitespace-only packageId trimmed to empty string');
  }

  // --------------------------------------------------------------------------
  // 4. Target Resolution & Determinism
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Target Resolution & Determinism ---');
  {
    // 4.1 Exact target match
    const unoImpl = resolvePackageImplementation('ldr_light', 'arduino_uno');
    assert(unoImpl.targetId === 'arduino_uno', 'Exact target "arduino_uno" selected');
    assert(unoImpl.strategy === 'graph', 'Strategy for arduino_uno is "graph"');

    const espImpl = resolvePackageImplementation('ldr_light', 'esp32_arduino');
    assert(espImpl.targetId === 'esp32_arduino', 'Exact target "esp32_arduino" selected');
    assert(espImpl.strategy === 'graph', 'Strategy for esp32_arduino is "graph"');

    // 4.2 Deterministic fallback to generic
    const customTargetImpl = resolvePackageImplementation('ldr_light', 'custom_board_xyz');
    assert(customTargetImpl.strategy === 'graph', 'Unknown board target deterministically falls back to generic implementation');
    assert(customTargetImpl.targetId === 'custom_board_xyz', 'Target ID preserved in resolution output');

    // 4.3 Unsupported target failure (package with target implementations but NO generic fallback)
    const targetRestrictedPackage: any = {
      id: 'test_stm32_exclusive',
      version: '1.0.0',
      metadata: { id: 'test_stm32_exclusive', name: 'STM32 Exclusive', category: 'sensor' },
      pins: [],
      outputs: [],
      implementations: {
        stm32: {
          strategy: 'builtin',
          version: 1,
        },
      },
    };

    const stm32Impl = resolvePackageImplementation(targetRestrictedPackage, 'stm32');
    assert(stm32Impl.strategy === 'builtin', 'Supported target stm32 resolves successfully');

    assertThrows(
      () => resolvePackageImplementation(targetRestrictedPackage, 'arduino_uno'),
      'UNSUPPORTED_TARGET',
      'Target without implementation or generic fallback throws UNSUPPORTED_TARGET'
    );

    // 4.4 Independence from object key insertion order
    const pkgOrderA: any = {
      id: 'order_test_a',
      version: '1.0.0',
      metadata: { id: 'order_test_a', name: 'Order A', category: 'sensor' },
      pins: [],
      outputs: [],
      implementations: {
        stm32: { strategy: 'builtin', version: 1, entry: 'stm32_first' },
        esp32: { strategy: 'builtin', version: 1, entry: 'esp32_second' },
        generic: { strategy: 'builtin', version: 1, entry: 'generic_third' },
      },
    };

    const pkgOrderB: any = {
      id: 'order_test_b',
      version: '1.0.0',
      metadata: { id: 'order_test_b', name: 'Order B', category: 'sensor' },
      pins: [],
      outputs: [],
      implementations: {
        generic: { strategy: 'builtin', version: 1, entry: 'generic_third' },
        esp32: { strategy: 'builtin', version: 1, entry: 'esp32_second' },
        stm32: { strategy: 'builtin', version: 1, entry: 'stm32_first' },
      },
    };

    const resA = resolvePackageImplementation(pkgOrderA, 'arduino_uno');
    const resB = resolvePackageImplementation(pkgOrderB, 'arduino_uno');
    assert(resA.entry === 'generic_third', 'pkgOrderA resolves to generic fallback');
    assert(resB.entry === 'generic_third', 'pkgOrderB resolves to generic fallback');
    assert(resA.entry === resB.entry, 'Target resolution produces identical result regardless of key insertion order');

    // 4.5 Invalid implementation strategy rejection
    const invalidStrategyPkg: any = {
      id: 'bad_strategy_pkg',
      version: '1.0.0',
      metadata: { id: 'bad_strategy_pkg', name: 'Bad Strategy', category: 'sensor' },
      pins: [],
      outputs: [],
      implementation: {
        strategy: 'nonexistent_strategy_type',
        version: 1,
      },
    };

    assertThrows(
      () => resolvePackageImplementation(invalidStrategyPkg, 'generic'),
      'INVALID_IMPLEMENTATION',
      'Invalid strategy type throws INVALID_IMPLEMENTATION'
    );

    // Graph strategy missing subflow graph definition
    const missingGraphPkg: any = {
      id: 'missing_graph_pkg',
      version: '1.0.0',
      metadata: { id: 'missing_graph_pkg', name: 'Missing Graph', category: 'sensor' },
      pins: [],
      outputs: [],
      implementation: {
        strategy: 'graph',
        version: 1,
      },
    };

    assertThrows(
      () => resolvePackageImplementation(missingGraphPkg, 'generic'),
      'INVALID_IMPLEMENTATION',
      'Graph strategy without graph definition throws INVALID_IMPLEMENTATION'
    );
  }

  // --------------------------------------------------------------------------
  // 5. Compatibility & API Consumer Contracts
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Compatibility & API Consumer Contracts ---');
  {
    // Direct package object resolution
    const directLdrPkg = getComponentPackage('ldr_light');
    const resolvedFromObj = resolvePackageImplementation(directLdrPkg!);
    assert(resolvedFromObj.packageId === 'ldr_light', 'Passing ComponentPackage object directly resolves packageId');
    assert(resolvedFromObj.strategy === 'graph', 'Passing ComponentPackage object resolves correct strategy');

    // Language primitives bypass (for compiler backend code emission)
    const primRead = resolvePackageImplementation('analog_read');
    assert(primRead.packageId === 'analog_read', 'Primitive "analog_read" resolved for builtin compiler emission');
    assert(primRead.strategy === 'builtin', 'Primitive "analog_read" resolved with strategy="builtin"');

    const primStart = resolvePackageImplementation('start');
    assert(primStart.packageId === 'start', 'Primitive "start" resolved with strategy="builtin"');
    assert(primStart.strategy === 'builtin', 'Primitive "start" resolved with strategy="builtin"');

    // Primitives are NOT component packages (resolvePackage must reject them)
    assertThrows(
      () => resolvePackage('start'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage strictly rejects primitives (start is not a component package)'
    );

    assertThrows(
      () => resolvePackage('analog_read'),
      'PACKAGE_NOT_FOUND',
      'resolvePackage strictly rejects primitives (analog_read is not a component package)'
    );

    // Package dispatcher compatibility
    const dispatchResult = dispatchPackageExecution('ldr_light');
    assert(dispatchResult.handled === true, 'dispatchPackageExecution handles canonical ldr_light');
    assert(dispatchResult.strategy === 'graph', 'dispatchPackageExecution routes to graph strategy');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
