import { Node, Edge } from '@xyflow/react';
import { useFlowStore } from '../store/userFlowStore';
import { getComponentPackage } from '../lib/registry/components';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';
import { createNewProject, exportProjectFromState, serializeProject, importProject, extractStoreState } from '../lib/project/projectManager';
import { validateProjectSchema } from '../lib/project/projectSchema';

console.log('=== TEST PHASE 5G: PROJECT-LEVEL COMPONENT OVERRIDE PERSISTENCE ===\n');

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
// Schema Setup for Multi-Sensor Tests
// ─────────────────────────────────────────────────────────────────
const schemaNodes: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', data: { label: 'Arduino Uno' }, position: { x: 0, y: 0 } },
  { id: 'sensor_front', type: 'componentNode', data: { label: 'Front Sensor' }, position: { x: 0, y: 0 } },
  { id: 'sensor_rear', type: 'componentNode', data: { label: 'Rear Sensor' }, position: { x: 0, y: 0 } },
];

const schemaEdges: Edge[] = [
  { id: 'se1', source: 'sensor_front', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd9' },
  { id: 'se2', source: 'sensor_front', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd10' },
  { id: 'se3', source: 'sensor_rear', target: 'arduino-uno', sourceHandle: 'trig', targetHandle: 'd7' },
  { id: 'se4', source: 'sensor_rear', target: 'arduino-uno', sourceHandle: 'echo', targetHandle: 'd8' },
];

const flowNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start', label: 'Start' }, position: { x: 0, y: 0 } },
  {
    id: 'sensor_front',
    type: 'componentNode',
    data: {
      label: 'Front Sensor',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_front', trigPin: '9', echoPin: '10' }
    },
    position: { x: 200, y: 0 }
  },
  {
    id: 'sensor_rear',
    type: 'componentNode',
    data: {
      label: 'Rear Sensor',
      nodeType: 'ultrasonic',
      params: { packageId: 'ultrasonic_hcsr04', varDist: 'dist_rear', trigPin: '7', echoPin: '8' }
    },
    position: { x: 400, y: 0 }
  },
  { id: 'print_node', type: 'baseNode', data: { nodeType: 'print', params: { message: 'dist_front' } }, position: { x: 600, y: 0 } }
];

const flowEdges: Edge[] = [
  { id: 'fe1', source: 'start_node', target: 'sensor_front', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe2', source: 'sensor_front', target: 'sensor_rear', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'fe3', source: 'sensor_rear', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

// Initialize store state
useFlowStore.setState({
  project: { name: 'Smart Obstacle Detector', platform: 'arduino_uno', createdAt: 1700000000000 },
  documents: [
    { id: 'schema', title: 'Hardware Schematic', type: 'schema', closable: false, dirty: false },
    { id: 'main_flow', title: 'Main Flow', type: 'flow', closable: false, dirty: false }
  ],
  activeDocumentId: 'main_flow',
  subflowInstances: {},
  flowNodes,
  flowEdges,
  schemaNodes,
  schemaEdges,
});

// ─────────────────────────────────────────────────────────────────
// Setup: Unlock sensor_front and customize delay to 5us
// ─────────────────────────────────────────────────────────────────
console.log('--- Setup: Customizing sensor_front ---');

const frontDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front',
  title: 'Front HC-SR04'
});
useFlowStore.getState().unlockSubflowDocument(frontDocId);

const modifiedNodes = useFlowStore.getState().getActiveFlowNodes().map(n => {
  if (n.id === 'delay_2us') {
    return {
      ...n,
      data: {
        ...n.data,
        params: { ...(n.data as any).params, duration: '5' }
      }
    };
  }
  return n;
});
useFlowStore.getState().setActiveFlowNodes(modifiedNodes);
useFlowStore.getState().saveSubflowOverride(frontDocId);

// ─────────────────────────────────────────────────────────────────
// T1 — Serialize override: Appears in serialized project data
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T1: Serialize Override ---');

const exportedProject = exportProjectFromState({
  project: useFlowStore.getState().project || undefined,
  schemaNodes: useFlowStore.getState().schemaNodes,
  schemaEdges: useFlowStore.getState().schemaEdges,
  flowNodes: useFlowStore.getState().flowNodes,
  flowEdges: useFlowStore.getState().flowEdges,
  subFlows: useFlowStore.getState().subFlows,
  componentPackages: useFlowStore.getState().componentPackages,
  subflowInstances: useFlowStore.getState().subflowInstances,
});

assert(Boolean(exportedProject.componentOverrides), 'T1: componentOverrides section present in exported project');
const frontOverride = exportedProject.componentOverrides?.[frontDocId];
assert(Boolean(frontOverride), 'T1: sensor_front override found in componentOverrides');
assert(frontOverride?.packageId === 'ultrasonic_hcsr04', 'T1: packageId is "ultrasonic_hcsr04"');
assert(frontOverride?.componentInstanceId === 'sensor_front', 'T1: componentInstanceId is "sensor_front"');
assert(
  (frontOverride?.nodes.find((n: any) => n.id === 'delay_2us')?.data as any)?.params?.duration === '5',
  'T1: Serialized override contains modified 5us duration'
);

const serializedJson = serializeProject(exportedProject);
assert(serializedJson.includes('"componentOverrides"'), 'T1: JSON string contains componentOverrides key');
assert(serializedJson.includes('"duration": "5"'), 'T1: JSON string contains modified duration "5"');

// ─────────────────────────────────────────────────────────────────
// T2 — Deserialize override: Reconstructs valid PackageGraphInstance
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Deserialize Override ---');

const importResult = importProject(serializedJson);
assert(importResult.success === true, 'T2: importProject successfully parses serialized .flow file');
assert(Boolean(importResult.project?.componentOverrides), 'T2: Imported project contains componentOverrides');

const extractedState = extractStoreState(importResult.project!);
assert(Boolean(extractedState.subflowInstances), 'T2: extractStoreState produces subflowInstances');
const reconstructedInst = extractedState.subflowInstances[frontDocId];
assert(Boolean(reconstructedInst), 'T2: Reconstructed front sensor instance exists');
assert(reconstructedInst?.unlocked === true, 'T2: Reconstructed instance is unlocked (ready as override)');
assert(reconstructedInst?.dirty === false, 'T2: Reconstructed instance dirty is false after clean load');
assert(
  (reconstructedInst?.nodes.find((n: any) => n.id === 'delay_2us')?.data as any)?.params?.duration === '5',
  'T2: Reconstructed instance preserves 5us duration'
);

// ─────────────────────────────────────────────────────────────────
// T3 — Package Immutability: COMPONENT_REGISTRY untouched
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Package Immutability ---');

const pkgHCSR04 = getComponentPackage('ultrasonic_hcsr04');
const templateGraph = (pkgHCSR04?.implementation?.graph || pkgHCSR04?.implementation?.subflow) as any;
const templateDelayNode = templateGraph?.nodes?.find((n: any) => n.id === 'delay_2us');

assert(
  templateDelayNode?.data?.params?.duration === '2',
  'T3: COMPONENT_REGISTRY package template delay duration remains 2us (100% immutable)'
);

// ─────────────────────────────────────────────────────────────────
// T4 — Instance Isolation: sensor_front vs sensor_rear
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Instance Isolation in Serialization ---');

assert(
  !exportedProject.componentOverrides?.['subflow_ultrasonic_hcsr04_sensor_rear'],
  'T4: sensor_rear (pristine) is NOT serialized in componentOverrides'
);

// ─────────────────────────────────────────────────────────────────
// T5 — Entry/Exit Preservation: Explicit entry/exit survive
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Entry/Exit Preservation ---');

assert(frontOverride?.entry === 'trig_low_1', 'T5: Serialized override preserves entry="trig_low_1"');
assert(frontOverride?.exit === 'return_distance', 'T5: Serialized override preserves exit="return_distance"');
assert(reconstructedInst?.entry === 'trig_low_1', 'T5: Deserialized instance preserves entry="trig_low_1"');
assert(reconstructedInst?.exit === 'return_distance', 'T5: Deserialized instance preserves exit="return_distance"');

// ─────────────────────────────────────────────────────────────────
// T6 — Graph Deep Isolation: No shared references with registry
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Graph Deep Isolation ---');

assert(
  reconstructedInst.nodes !== templateGraph.nodes,
  'T6: Reconstructed nodes array is independent reference'
);
assert(
  reconstructedInst.nodes[0] !== templateGraph.nodes[0],
  'T6: Reconstructed node object is independent reference'
);
assert(
  reconstructedInst.nodes[0].data !== templateGraph.nodes[0].data,
  'T6: Reconstructed node data is independent reference'
);

// ─────────────────────────────────────────────────────────────────
// T7 — Compile After Reload: Reloaded customized sensor compiles using custom graph
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Compile After Reload ---');

// Simulate project reload into store
useFlowStore.getState().loadProjectState(extractedState);

const reloadedCompiler = new GraphToASTCompiler(
  useFlowStore.getState().flowNodes,
  useFlowStore.getState().flowEdges,
  useFlowStore.getState().subFlows,
  {},
  useFlowStore.getState().schemaNodes,
  useFlowStore.getState().schemaEdges,
  { subflowOverrides: useFlowStore.getState().subflowInstances }
);
const reloadedAst = reloadedCompiler.compile();
const reloadedCode = generator.generate(reloadedAst, schemaNodes, schemaEdges).main;

assert(reloadedCode.includes('delayMicroseconds(5)'), 'T7: Front sensor compiles with restored 5us delay');
assert(reloadedCode.includes('delayMicroseconds(2)'), 'T7: Rear sensor compiles with template 2us delay');

// ─────────────────────────────────────────────────────────────────
// T8 — Revert Persistence: Reverting removes override from subsequent saves
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Revert Persistence ---');

useFlowStore.getState().revertSubflowOverride(frontDocId);

const exportedAfterRevert = exportProjectFromState({
  project: useFlowStore.getState().project || undefined,
  schemaNodes: useFlowStore.getState().schemaNodes,
  schemaEdges: useFlowStore.getState().schemaEdges,
  flowNodes: useFlowStore.getState().flowNodes,
  flowEdges: useFlowStore.getState().flowEdges,
  subFlows: useFlowStore.getState().subFlows,
  componentPackages: useFlowStore.getState().componentPackages,
  subflowInstances: useFlowStore.getState().subflowInstances,
});

assert(
  !exportedAfterRevert.componentOverrides || Object.keys(exportedAfterRevert.componentOverrides).length === 0,
  'T8: After revert, exported project has no componentOverrides'
);

// ─────────────────────────────────────────────────────────────────
// T10 — Reopen After Revert: Package implementation (2us) restored
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Reopen After Revert ---');

const reloadedAfterRevertState = extractStoreState(exportedAfterRevert);
useFlowStore.getState().loadProjectState(reloadedAfterRevertState);

const compilerAfterRevertReload = new GraphToASTCompiler(
  useFlowStore.getState().flowNodes,
  useFlowStore.getState().flowEdges,
  useFlowStore.getState().subFlows,
  {},
  useFlowStore.getState().schemaNodes,
  useFlowStore.getState().schemaEdges,
  { subflowOverrides: useFlowStore.getState().subflowInstances }
);
const codeAfterRevertReload = generator.generate(compilerAfterRevertReload.compile(), schemaNodes, schemaEdges).main;

assert(
  !codeAfterRevertReload.includes('delayMicroseconds(5)'),
  'T10: Reloaded reverted project does not contain 5us delay'
);
assert(
  codeAfterRevertReload.includes('delayMicroseconds(2)'),
  'T10: Reloaded reverted project contains standard 2us delay from package template'
);

// ─────────────────────────────────────────────────────────────────
// T11 — Missing Package: Override survives loading when package unavailable
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Missing Package Preservation ---');

const missingPackageProject = {
  format: 'flow',
  version: 1,
  metadata: { name: 'Missing Package Proj', created: new Date().toISOString(), modified: new Date().toISOString() },
  board: { id: 'arduino_uno' },
  schema: { nodes: [], edges: [] },
  flow: { nodes: [], edges: [] },
  functions: { subFlows: {} },
  componentOverrides: {
    'subflow_custom_sensor_3d_inst1': {
      id: 'subflow_custom_sensor_3d_inst1',
      packageId: 'custom_sensor_3d',
      componentInstanceId: 'inst1',
      entry: 'start_node',
      exit: 'end_node',
      nodes: [
        { id: 'start_node', type: 'baseNode', data: { label: 'Start' } },
        { id: 'end_node', type: 'baseNode', data: { label: 'End' } },
      ],
      edges: [
        { id: 'e1', source: 'start_node', target: 'end_node' }
      ]
    }
  },
  settings: { componentPackages: {} }
};

const missingPkgValidation = validateProjectSchema(missingPackageProject);
assert(missingPkgValidation.valid === true, 'T11: Project with uninstalled package override passes validation');

const missingPkgState = extractStoreState(missingPackageProject as any);
assert(
  Boolean(missingPkgState.subflowInstances['subflow_custom_sensor_3d_inst1']),
  'T11: Missing package override preserved in subflowInstances without being discarded'
);

// ─────────────────────────────────────────────────────────────────
// T12 — Malformed Override Validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Malformed Override Validation ---');

const malformedProjectMissingEntry = {
  format: 'flow',
  version: 1,
  metadata: { name: 'Bad Proj', created: new Date().toISOString(), modified: new Date().toISOString() },
  board: { id: 'arduino_uno' },
  schema: { nodes: [], edges: [] },
  flow: { nodes: [], edges: [] },
  functions: { subFlows: {} },
  componentOverrides: {
    'bad_ov': {
      id: 'bad_ov',
      packageId: 'ultrasonic_hcsr04',
      componentInstanceId: 'sensor_front',
      entry: 'nonexistent_entry_id',
      exit: 'return_distance',
      nodes: [{ id: 'return_distance', type: 'baseNode' }],
      edges: []
    }
  },
  settings: { componentPackages: {} }
};

const malformedValidation = validateProjectSchema(malformedProjectMissingEntry);
assert(malformedValidation.valid === false, 'T12: Malformed override missing valid entry node is rejected');
assert(
  malformedValidation.errors.some(e => e.includes('entry node "nonexistent_entry_id" does not exist')),
  'T12: Validation reports clear error identifying invalid entry node'
);

// ─────────────────────────────────────────────────────────────────
// T13 — Multiple Instances: Front customized + rear pristine round-trip
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T13: Multiple Instances Round-Trip ---');

const multiInstProject = exportProjectFromState({
  project: { name: 'Multi Inst', platform: 'arduino_uno' },
  schemaNodes,
  schemaEdges,
  flowNodes,
  flowEdges,
  subflowInstances: {
    'subflow_ultrasonic_hcsr04_sensor_front': {
      packageId: 'ultrasonic_hcsr04',
      componentInstanceId: 'sensor_front',
      unlocked: true,
      dirty: false,
      entry: 'trig_low_1',
      exit: 'return_distance',
      nodes: modifiedNodes,
      edges: templateGraph.edges,
    }
  }
});

const multiInstState = extractStoreState(importProject(serializeProject(multiInstProject)).project!);
assert(
  Boolean(multiInstState.subflowInstances['subflow_ultrasonic_hcsr04_sensor_front']),
  'T13: Front sensor override preserved after round-trip'
);
assert(
  !multiInstState.subflowInstances['subflow_ultrasonic_hcsr04_sensor_rear'],
  'T13: Rear sensor remains template-backed (no override created)'
);

// ─────────────────────────────────────────────────────────────────
// T14 — Deterministic Serialization
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14: Deterministic Serialization ---');

const json1 = serializeProject(multiInstProject);
const json2 = serializeProject(multiInstProject);
assert(json1 === json2, 'T14: Repeated serialization produces identical JSON output');

// ─────────────────────────────────────────────────────────────────
// T15 — Dirty State: Clean locked instances are not persisted as overrides
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T15: Locked Instances Not Persisted ---');

const lockedState = exportProjectFromState({
  project: { name: 'Locked Test', platform: 'arduino_uno' },
  subflowInstances: {
    'subflow_ultrasonic_hcsr04_sensor_front': {
      packageId: 'ultrasonic_hcsr04',
      componentInstanceId: 'sensor_front',
      unlocked: false, // Locked viewer instance
      dirty: false,
      entry: 'trig_low_1',
      exit: 'return_distance',
      nodes: templateGraph.nodes,
      edges: templateGraph.edges,
    }
  }
});

assert(
  !lockedState.componentOverrides,
  'T15: Locked viewer instances (unlocked = false) are not persisted as overrides'
);

// ─────────────────────────────────────────────────────────────────
// T16 — Builtin Regression: Builtin-only projects load and compile
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T16: Builtin Packages Regression ---');

const builtinProject = createNewProject('Builtin Project', 'arduino_uno');
const builtinExtracted = extractStoreState(builtinProject);
assert(Object.keys(builtinExtracted.subflowInstances).length === 0, 'T16: Builtin project extracts empty subflowInstances');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
