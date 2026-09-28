import {
  validatePackageDefinition,
  validateComponentInstance,
  validateExpandedGraph,
  ComponentPackageContract,
} from '../lib/compiler/packages';
import { Node, Edge } from '@xyflow/react';

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

function createValidBasePackage(): ComponentPackageContract {
  return {
    id: 'valid_sensor',
    version: '1.0.0',
    metadata: {
      id: 'valid_sensor',
      name: 'Valid Sensor',
      description: 'A fully valid sensor package definition',
      category: 'sensor',
      icon: '🔌',
      tags: ['sensor', 'valid'],
    },
    pins: [
      { id: 'pin1', label: 'Signal', signal: 'analog_output', required: true },
      { id: 'pin2', label: 'Ground', signal: 'ground', required: true },
    ],
    outputs: [
      { id: 'lightLevel', label: 'Light Level', type: 'int', description: 'Measured value' },
    ],
    properties: [
      { id: 'sampleRate', label: 'Sample Rate', type: 'number', defaultValue: 100 },
    ],
    dependencies: {
      includes: ['#include <Wire.h>'],
      globals: ['int sensorState;'],
      setup: ['pinMode($pin1, INPUT);'],
    },
    implementation: {
      strategy: 'graph',
      version: 1,
      entry: 'read_pin',
      exit: 'ret_val',
      subflow: {
        entry: 'read_pin',
        exit: 'ret_val',
        nodes: [
          {
            id: 'read_pin',
            type: 'baseNode',
            position: { x: 0, y: 0 },
            data: {
              nodeType: 'analog_read',
              params: { pin: '$pin1', target: 'lightLevel' },
            },
          },
          {
            id: 'ret_val',
            type: 'baseNode',
            position: { x: 100, y: 0 },
            data: {
              nodeType: 'return',
              params: { value: 'lightLevel' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'read_pin', target: 'ret_val', sourceHandle: 'flow', targetHandle: 'flow' },
        ],
      },
    },
  };
}

async function runValidatorTests() {
  console.log('=== PHASE 6A.4.1: PACKAGE CONTRACT & VALIDATOR TEST SUITE ===\n');

  // --------------------------------------------------------------------------
  // SUITE 1: Valid Package Baseline
  // --------------------------------------------------------------------------
  console.log('--- 1. Valid Package Baseline ---');
  {
    const pkg = createValidBasePackage();
    const result = validatePackageDefinition(pkg);
    assert(result.valid, 'Valid package definition passes validation');
    assert(result.errors.length === 0, 'Valid package has zero error diagnostics');
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Package Identity Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Package Identity Validation ---');
  {
    const missingId: any = createValidBasePackage();
    delete missingId.id;
    const resMissing = validatePackageDefinition(missingId);
    assert(!resMissing.valid, 'Missing package ID fails validation');
    assert(resMissing.diagnostics.some(d => d.code === 'PACKAGE_ID_MISSING'), 'Diagnostic code is PACKAGE_ID_MISSING');

    const emptyId: any = createValidBasePackage();
    emptyId.id = '';
    const resEmpty = validatePackageDefinition(emptyId);
    assert(!resEmpty.valid, 'Empty package ID fails validation');

    const upperId = { ...createValidBasePackage(), id: 'LDR_Sensor', metadata: { ...createValidBasePackage().metadata, id: 'LDR_Sensor' } };
    const resUpper = validatePackageDefinition(upperId);
    assert(!resUpper.valid, 'Uppercase package ID fails validation');
    assert(resUpper.diagnostics.some(d => d.code === 'PACKAGE_ID_INVALID'), 'Diagnostic code is PACKAGE_ID_INVALID for uppercase');

    const spaceId = { ...createValidBasePackage(), id: 'ldr sensor', metadata: { ...createValidBasePackage().metadata, id: 'ldr sensor' } };
    const resSpace = validatePackageDefinition(spaceId);
    assert(!resSpace.valid, 'Package ID with spaces fails validation');

    const hyphenId = { ...createValidBasePackage(), id: 'ldr-sensor', metadata: { ...createValidBasePackage().metadata, id: 'ldr-sensor' } };
    const resHyphen = validatePackageDefinition(hyphenId);
    assert(!resHyphen.valid, 'Package ID with hyphens fails validation (must be snake_case)');
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Package Version (Semver) Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Package Version (Semver) Validation ---');
  {
    const missingVer: any = createValidBasePackage();
    delete missingVer.version;
    const resMissing = validatePackageDefinition(missingVer);
    assert(!resMissing.valid, 'Missing version fails validation');
    assert(resMissing.diagnostics.some(d => d.code === 'PACKAGE_VERSION_MISSING'), 'Diagnostic code is PACKAGE_VERSION_MISSING');

    const malformedVersions = ['1', '1.0', 'v1.0.0', 'beta', '1.0.0.0'];
    malformedVersions.forEach(badVer => {
      const pkg = { ...createValidBasePackage(), version: badVer };
      const res = validatePackageDefinition(pkg);
      assert(!res.valid, `Malformed version "${badVer}" fails validation`);
      assert(res.diagnostics.some(d => d.code === 'PACKAGE_VERSION_INVALID'), `PACKAGE_VERSION_INVALID flagged for "${badVer}"`);
    });

    const validVersions = ['1.0.0', '2.1.3', '0.0.1', '1.0.0-beta.1'];
    validVersions.forEach(goodVer => {
      const pkg = { ...createValidBasePackage(), version: goodVer };
      const res = validatePackageDefinition(pkg);
      assert(res.valid, `Valid semver "${goodVer}" passes validation`);
    });
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Package Metadata Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Package Metadata Validation ---');
  {
    const missingMeta: any = createValidBasePackage();
    delete missingMeta.metadata;
    const resMissing = validatePackageDefinition(missingMeta);
    assert(!resMissing.valid, 'Missing metadata fails validation');
    assert(resMissing.diagnostics.some(d => d.code === 'PACKAGE_METADATA_MISSING'), 'Diagnostic code is PACKAGE_METADATA_MISSING');

    const idMismatch = { ...createValidBasePackage(), metadata: { ...createValidBasePackage().metadata, id: 'different_id' } };
    const resMismatch = validatePackageDefinition(idMismatch);
    assert(!resMismatch.valid, 'metadata.id mismatch fails validation');
    assert(resMismatch.diagnostics.some(d => d.code === 'METADATA_ID_MISMATCH'), 'Diagnostic code is METADATA_ID_MISMATCH');

    const emptyName = { ...createValidBasePackage(), metadata: { ...createValidBasePackage().metadata, name: '' } };
    const resEmptyName = validatePackageDefinition(emptyName);
    assert(!resEmptyName.valid, 'Empty metadata.name fails validation');
    assert(resEmptyName.diagnostics.some(d => d.code === 'METADATA_NAME_MISSING'), 'Diagnostic code is METADATA_NAME_MISSING');

    const badCat: any = { ...createValidBasePackage(), metadata: { ...createValidBasePackage().metadata, category: 'gadget' } };
    const resBadCat = validatePackageDefinition(badCat);
    assert(!resBadCat.valid, 'Invalid metadata.category fails validation');
    assert(resBadCat.diagnostics.some(d => d.code === 'METADATA_CATEGORY_INVALID'), 'Diagnostic code is METADATA_CATEGORY_INVALID');
  }

  // --------------------------------------------------------------------------
  // SUITE 5: Pin Definition Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Pin Definition Validation ---');
  {
    const dupPins = createValidBasePackage();
    dupPins.pins = [
      { id: 'pin1', label: 'Signal A', signal: 'digital_input' },
      { id: 'pin1', label: 'Signal B', signal: 'digital_output' },
    ];
    const resDup = validatePackageDefinition(dupPins);
    assert(!resDup.valid, 'Duplicate pin IDs fail validation');
    assert(resDup.diagnostics.some(d => d.code === 'PACKAGE_DUPLICATE_PIN'), 'Diagnostic code is PACKAGE_DUPLICATE_PIN');

    const badSignal: any = createValidBasePackage();
    badSignal.pins = [
      { id: 'pin1', label: 'Signal', signal: 'super_analog' },
    ];
    const resSignal = validatePackageDefinition(badSignal);
    assert(!resSignal.valid, 'Invalid pin signal type fails validation');
    assert(resSignal.diagnostics.some(d => d.code === 'PIN_SIGNAL_INVALID'), 'Diagnostic code is PIN_SIGNAL_INVALID');

    const badRequired: any = createValidBasePackage();
    badRequired.pins = [
      { id: 'pin1', label: 'Signal', signal: 'analog_input', required: 'yes' },
    ];
    const resReq = validatePackageDefinition(badRequired);
    assert(!resReq.valid, 'Non-boolean required attribute fails validation');
    assert(resReq.diagnostics.some(d => d.code === 'PIN_REQUIRED_INVALID'), 'Diagnostic code is PIN_REQUIRED_INVALID');
  }

  // --------------------------------------------------------------------------
  // SUITE 6: Output Definition Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Output Definition Validation ---');
  {
    const dupOutputs = createValidBasePackage();
    dupOutputs.outputs = [
      { id: 'val', label: 'Val 1', type: 'int' },
      { id: 'val', label: 'Val 2', type: 'float' },
    ];
    const resDup = validatePackageDefinition(dupOutputs);
    assert(!resDup.valid, 'Duplicate output IDs fail validation');
    assert(resDup.diagnostics.some(d => d.code === 'PACKAGE_DUPLICATE_OUTPUT'), 'Diagnostic code is PACKAGE_DUPLICATE_OUTPUT');

    const badType: any = createValidBasePackage();
    badType.outputs = [
      { id: 'result', label: 'Result', type: 'object' },
    ];
    const resType = validatePackageDefinition(badType);
    assert(!resType.valid, 'Invalid output datatype fails validation');
    assert(resType.diagnostics.some(d => d.code === 'OUTPUT_TYPE_INVALID'), 'Diagnostic code is OUTPUT_TYPE_INVALID');
  }

  // --------------------------------------------------------------------------
  // SUITE 7: Graph Implementation & Subflow Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Graph Implementation & Subflow Validation ---');
  {
    const noSubflow: any = createValidBasePackage();
    delete noSubflow.implementation.subflow;
    const resNoSf = validatePackageDefinition(noSubflow);
    assert(!resNoSf.valid, 'Graph implementation without subflow fails validation');
    assert(resNoSf.diagnostics.some(d => d.code === 'SUBFLOW_MISSING'), 'Diagnostic code is SUBFLOW_MISSING');

    const missingEntry = createValidBasePackage();
    missingEntry.implementation!.entry = '';
    missingEntry.implementation!.subflow!.entry = '';
    const resEntry = validatePackageDefinition(missingEntry);
    assert(!resEntry.valid, 'Missing subflow entry fails validation');
    assert(resEntry.diagnostics.some(d => d.code === 'SUBFLOW_ENTRY_MISSING'), 'Diagnostic code is SUBFLOW_ENTRY_MISSING');

    const missingExit = createValidBasePackage();
    missingExit.implementation!.exit = '';
    missingExit.implementation!.subflow!.exit = '';
    const resExit = validatePackageDefinition(missingExit);
    assert(!resExit.valid, 'Missing subflow exit fails validation');
    assert(resExit.diagnostics.some(d => d.code === 'SUBFLOW_EXIT_MISSING'), 'Diagnostic code is SUBFLOW_EXIT_MISSING');

    const nonexistentEntry = createValidBasePackage();
    nonexistentEntry.implementation!.entry = 'ghost_node';
    nonexistentEntry.implementation!.subflow!.entry = 'ghost_node';
    const resGhostEntry = validatePackageDefinition(nonexistentEntry);
    assert(!resGhostEntry.valid, 'Non-existent entry node ID fails validation');
    assert(resGhostEntry.diagnostics.some(d => d.code === 'SUBFLOW_ENTRY_NOT_FOUND'), 'Diagnostic code is SUBFLOW_ENTRY_NOT_FOUND');

    const nonexistentExit = createValidBasePackage();
    nonexistentExit.implementation!.exit = 'ghost_node';
    nonexistentExit.implementation!.subflow!.exit = 'ghost_node';
    const resGhostExit = validatePackageDefinition(nonexistentExit);
    assert(!resGhostExit.valid, 'Non-existent exit node ID fails validation');
    assert(resGhostExit.diagnostics.some(d => d.code === 'SUBFLOW_EXIT_NOT_FOUND'), 'Diagnostic code is SUBFLOW_EXIT_NOT_FOUND');
  }

  // --------------------------------------------------------------------------
  // SUITE 8: Canonical Primitive Enforcement in Subflows
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Canonical Primitive Enforcement in Subflows ---');
  {
    const ldrReadPkg = createValidBasePackage();
    ldrReadPkg.implementation!.subflow!.nodes[0] = {
      id: 'read_pin',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'ldr_read', params: { pin: 'A0' } },
    };
    const resLdr = validatePackageDefinition(ldrReadPkg);
    assert(!resLdr.valid, 'Subflow node with "ldr_read" fails validation');
    assert(resLdr.diagnostics.some(d => d.code === 'SUBFLOW_NON_CANONICAL_PRIMITIVE'), 'Diagnostic code is SUBFLOW_NON_CANONICAL_PRIMITIVE for ldr_read');

    const ultrasonicPkg = createValidBasePackage();
    ultrasonicPkg.implementation!.subflow!.nodes[0] = {
      id: 'read_pin',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'ultrasonic_read', params: { trig: '9', echo: '10' } },
    };
    const resUltra = validatePackageDefinition(ultrasonicPkg);
    assert(!resUltra.valid, 'Subflow node with "ultrasonic_read" fails validation');
    assert(resUltra.diagnostics.some(d => d.code === 'SUBFLOW_NON_CANONICAL_PRIMITIVE'), 'Diagnostic code is SUBFLOW_NON_CANONICAL_PRIMITIVE for ultrasonic_read');

    const nestedCompPkg = createValidBasePackage();
    nestedCompPkg.implementation!.subflow!.nodes[0] = {
      id: 'read_pin',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: { packageId: 'dht11' } },
    };
    const resNested = validatePackageDefinition(nestedCompPkg);
    assert(!resNested.valid, 'Nested component node in subflow fails validation');
    assert(resNested.diagnostics.some(d => d.code === 'SUBFLOW_NESTED_COMPONENT_DISALLOWED'), 'Diagnostic code is SUBFLOW_NESTED_COMPONENT_DISALLOWED');
  }

  // --------------------------------------------------------------------------
  // SUITE 9: Placeholder Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Placeholder Validation ---');
  {
    const badSetupPlaceholder = createValidBasePackage();
    badSetupPlaceholder.dependencies!.setup = ['pinMode($undefinedPin, INPUT);'];
    const resSetup = validatePackageDefinition(badSetupPlaceholder);
    assert(!resSetup.valid, 'Undeclared placeholder in setup fails validation');
    assert(resSetup.diagnostics.some(d => d.code === 'UNDECLARED_PLACEHOLDER'), 'Diagnostic code is UNDECLARED_PLACEHOLDER for $undefinedPin');

    const badParamPlaceholder = createValidBasePackage();
    (badParamPlaceholder.implementation!.subflow!.nodes[0].data as any).params.pin = '$randomThing';
    const resParam = validatePackageDefinition(badParamPlaceholder);
    assert(!resParam.valid, 'Undeclared placeholder in subflow params fails validation');
    assert(resParam.diagnostics.some(d => d.code === 'UNDECLARED_PLACEHOLDER'), 'Diagnostic code is UNDECLARED_PLACEHOLDER for $randomThing');

    const validPropPlaceholder = createValidBasePackage();
    validPropPlaceholder.dependencies!.setup = ['delay($sampleRate);'];
    const resPropPh = validatePackageDefinition(validPropPlaceholder);
    assert(resPropPh.valid, 'Placeholder matching declared property ID passes validation');
  }

  // --------------------------------------------------------------------------
  // SUITE 10: Component Instance Validation (Boundary 2)
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Component Instance Validation (Boundary 2) ---');
  {
    const pkg = createValidBasePackage();

    const notComponentNode: Node = {
      id: 'n1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'analog_read', params: {} },
    };
    const resNotComp = validateComponentInstance(notComponentNode, pkg);
    assert(!resNotComp.valid, 'Non-component node fails validateComponentInstance');
    assert(resNotComp.diagnostics.some(d => d.code === 'INSTANCE_NOT_COMPONENT'), 'Diagnostic code is INSTANCE_NOT_COMPONENT');

    const missingPkgIdNode: Node = {
      id: 'c1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: {} },
    };
    const resMissingPkg = validateComponentInstance(missingPkgIdNode, pkg);
    assert(!resMissingPkg.valid, 'Component missing packageId fails validation');
    assert(resMissingPkg.diagnostics.some(d => d.code === 'INSTANCE_PACKAGE_ID_MISSING'), 'Diagnostic code is INSTANCE_PACKAGE_ID_MISSING');

    const schemaNodes: Node[] = [
      { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'sensor_hw_1', type: 'sensorNode', position: { x: 100, y: 0 }, data: { packageId: 'valid_sensor' } },
    ];
    const schemaEdges: Edge[] = [
      { id: 'e1', source: 'sensor_hw_1', target: 'board', sourceHandle: 'pin1', targetHandle: 'A0' },
      { id: 'e2', source: 'sensor_hw_1', target: 'board', sourceHandle: 'pin2', targetHandle: 'GND' },
    ];

    const validInstanceNode: Node = {
      id: 'flow_c1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'component',
        params: {
          packageId: 'valid_sensor',
          componentInstanceId: 'sensor_hw_1',
          target: 'myVal',
        },
      },
    };
    const resValidInst = validateComponentInstance(validInstanceNode, pkg, { schemaNodes, schemaEdges });
    assert(resValidInst.valid, 'Fully bound component instance passes validation');

    const missingWireEdges: Edge[] = [
      { id: 'e2', source: 'sensor_hw_1', target: 'board', sourceHandle: 'pin2', targetHandle: 'GND' },
    ];
    const resMissingPin = validateComponentInstance(validInstanceNode, pkg, { schemaNodes, schemaEdges: missingWireEdges });
    assert(!resMissingPin.valid, 'Instance with unconnected required pin fails validation');
    assert(resMissingPin.diagnostics.some(d => d.code === 'INSTANCE_REQUIRED_PIN_UNCONNECTED'), 'Diagnostic code is INSTANCE_REQUIRED_PIN_UNCONNECTED');

    const unlinkedNode: Node = {
      id: 'flow_c2',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'component',
        params: {
          packageId: 'valid_sensor',
          componentInstanceId: 'non_existent_hw',
        },
      },
    };
    const resUnlinked = validateComponentInstance(unlinkedNode, pkg, { schemaNodes, schemaEdges });
    assert(!resUnlinked.valid, 'Instance referencing non-existent schema component fails validation');
    assert(resUnlinked.diagnostics.some(d => d.code === 'INSTANCE_SCHEMA_TARGET_NOT_FOUND'), 'Diagnostic code is INSTANCE_SCHEMA_TARGET_NOT_FOUND');
  }

  // --------------------------------------------------------------------------
  // SUITE 11: Expanded Graph Validation (Boundary 3)
  // --------------------------------------------------------------------------
  console.log('\n--- 11. Expanded Graph Validation (Boundary 3) ---');
  {
    const validCanonicalNodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'read1', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'analog_read', params: { pin: 'A0', target: 'val' } } },
      { id: 'assign1', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'assignment', params: { target: 'x', expression: 'val * 2' } } },
      { id: 'end', type: 'baseNode', position: { x: 300, y: 0 }, data: { nodeType: 'end' } },
    ];
    const validCanonicalEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'read1', sourceHandle: 'flow', targetHandle: 'flow' },
      { id: 'e2', source: 'read1', target: 'assign1', sourceHandle: 'flow', targetHandle: 'flow' },
      { id: 'e3', source: 'assign1', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
    ];
    const resGoodExpanded = validateExpandedGraph(validCanonicalNodes, validCanonicalEdges);
    assert(resGoodExpanded.valid, 'Canonical primitive expanded graph passes validation');

    const componentRemainingNodes: Node[] = [
      ...validCanonicalNodes,
      { id: 'c_leftover', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'component', params: { packageId: 'dht11' } } },
    ];
    const resCompRem = validateExpandedGraph(componentRemainingNodes, validCanonicalEdges);
    assert(!resCompRem.valid, 'Remaining component node in expanded graph fails validation');
    assert(resCompRem.diagnostics.some(d => d.code === 'EXPANDED_COMPONENT_REMAINING'), 'Diagnostic code is EXPANDED_COMPONENT_REMAINING');

    const nonCanonicalNodes: Node[] = [
      ...validCanonicalNodes,
      { id: 'nc1', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'custom_sensor' } },
    ];
    const resNonCan = validateExpandedGraph(nonCanonicalNodes, validCanonicalEdges);
    assert(!resNonCan.valid, 'Non-canonical node in expanded graph fails validation');
    assert(resNonCan.diagnostics.some(d => d.code === 'EXPANDED_NON_CANONICAL_PRIMITIVE'), 'Diagnostic code is EXPANDED_NON_CANONICAL_PRIMITIVE');

    const unresolvedPlaceholderNodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'read1', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'analog_read', params: { pin: '$pin1', target: 'val' } } },
    ];
    const resUnresPh = validateExpandedGraph(unresolvedPlaceholderNodes, []);
    assert(!resUnresPh.valid, 'Unresolved placeholder in expanded graph fails validation');
    assert(resUnresPh.diagnostics.some(d => d.code === 'EXPANDED_UNRESOLVED_PLACEHOLDER'), 'Diagnostic code is EXPANDED_UNRESOLVED_PLACEHOLDER');

    const dupNodes: Node[] = [
      { id: 'n1', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'n1', type: 'baseNode', position: { x: 100, y: 0 }, data: { nodeType: 'end' } },
    ];
    const resDup = validateExpandedGraph(dupNodes, []);
    assert(!resDup.valid, 'Duplicate node IDs in expanded graph fail validation');
    assert(resDup.diagnostics.some(d => d.code === 'EXPANDED_DUPLICATE_NODE_ID'), 'Diagnostic code is EXPANDED_DUPLICATE_NODE_ID');

    const danglingEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'ghost_target' },
    ];
    const resDangling = validateExpandedGraph(validCanonicalNodes, danglingEdges);
    assert(!resDangling.valid, 'Dangling edge target in expanded graph fails validation');
    assert(resDangling.diagnostics.some(d => d.code === 'EXPANDED_DANGLING_EDGE_TARGET'), 'Diagnostic code is EXPANDED_DANGLING_EDGE_TARGET');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidatorTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
