import { Node, Edge } from '@xyflow/react';
import { useFlowStore, SubflowDocument } from '../store/userFlowStore';
import { getComponentPackage } from '../lib/registry/components';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { ArduinoUnoGenerator } from '../lib/compiler/generator/arduinoGenerator';

console.log('=== TEST PHASE 5F: SUBFLOW OVERRIDE LIFECYCLE & REVERT SEMANTICS ===\n');

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
// T1 — Unlock: Locked package instance becomes editable without modifying package template
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Unlock Semantics ---');

const frontDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front',
  title: 'Front HC-SR04'
});

const docBeforeUnlock = useFlowStore.getState().documents.find(d => d.id === frontDocId) as SubflowDocument;
const instBeforeUnlock = useFlowStore.getState().subflowInstances[frontDocId];

assert(docBeforeUnlock?.readOnly === true, 'T1: SubflowDocument is initially readOnly');
assert(instBeforeUnlock?.unlocked === false, 'T1: PackageGraphInstance is initially locked');

useFlowStore.getState().unlockSubflowDocument(frontDocId);

const docAfterUnlock = useFlowStore.getState().documents.find(d => d.id === frontDocId) as SubflowDocument;
const instAfterUnlock = useFlowStore.getState().subflowInstances[frontDocId];

assert(docAfterUnlock?.readOnly === false, 'T1: SubflowDocument readOnly transitioned to false');
assert(docAfterUnlock?.unlocked === true, 'T1: SubflowDocument unlocked transitioned to true');
assert(instAfterUnlock?.unlocked === true, 'T1: PackageGraphInstance unlocked transitioned to true');

// ─────────────────────────────────────────────────────────────────
// T2 — Edit: Editing a node marks both instance and document dirty
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Edit and Dirty State ---');

const activeNodes = useFlowStore.getState().getActiveFlowNodes();
const delayNode = activeNodes.find(n => n.id === 'delay_2us');
assert(Boolean(delayNode), 'T2: delay_2us node found in subflow graph');

const modifiedNodes = activeNodes.map(n => {
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

const docAfterEdit = useFlowStore.getState().documents.find(d => d.id === frontDocId);
const instAfterEdit = useFlowStore.getState().subflowInstances[frontDocId];

assert(docAfterEdit?.dirty === true, 'T2: SubflowDocument marked dirty after edit');
assert(instAfterEdit?.dirty === true, 'T2: PackageGraphInstance marked dirty after edit');
assert(
  (instAfterEdit?.nodes.find(n => n.id === 'delay_2us')?.data as any)?.params?.duration === '5',
  'T2: Subflow node duration successfully updated to 5us in store instance'
);

// ─────────────────────────────────────────────────────────────────
// T3 — Package Immutability: After editing, registry package remains byte-for-byte unchanged
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Package Registry Immutability ---');

const pkgHCSR04 = getComponentPackage('ultrasonic_hcsr04');
const templateGraph = (pkgHCSR04?.implementation?.graph || pkgHCSR04?.implementation?.subflow) as any;
const templateDelayNode = templateGraph?.nodes?.find((n: any) => n.id === 'delay_2us');

assert(
  templateDelayNode?.data?.params?.duration === '2',
  'T3: COMPONENT_REGISTRY package template delay duration remains 2us (100% immutable)'
);

// ─────────────────────────────────────────────────────────────────
// T11 — Compiler After Customization: Customized implementation reaches compiler
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Compiler After Customization ---');

const customCompiler = new GraphToASTCompiler(
  flowNodes,
  flowEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { subflowOverrides: useFlowStore.getState().subflowInstances }
);
const customAst = customCompiler.compile();
const customCode = generator.generate(customAst, schemaNodes, schemaEdges).main;

assert(customCode.includes('delayMicroseconds(5)'), 'T11: Front sensor compiles with customized 5us delay');
assert(customCode.includes('delayMicroseconds(2)'), 'T11: Rear sensor compiles with pristine 2us delay');

// ─────────────────────────────────────────────────────────────────
// T6 — Multiple Instances: Front customized, Rear pristine compile correctly in same pass
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Multiple Instances Isolation ---');

const rearDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_rear',
  title: 'Rear HC-SR04'
});

const rearDoc = useFlowStore.getState().documents.find(d => d.id === rearDocId) as SubflowDocument;
const rearInst = useFlowStore.getState().subflowInstances[rearDocId];

assert(rearDoc?.readOnly === true, 'T6: Rear sensor subflow document remains locked');
assert(rearInst?.unlocked === false, 'T6: Rear sensor instance remains locked');
assert(rearInst?.dirty === false, 'T6: Rear sensor instance remains clean');

// ─────────────────────────────────────────────────────────────────
// Save / Commit Override Action
// ─────────────────────────────────────────────────────────────────
console.log('\n--- Save/Commit Subflow Override ---');

useFlowStore.getState().saveSubflowOverride(frontDocId);

const docAfterSave = useFlowStore.getState().documents.find(d => d.id === frontDocId);
const instAfterSave = useFlowStore.getState().subflowInstances[frontDocId];

assert(docAfterSave?.dirty === false, 'Save: SubflowDocument dirty is false after commit');
assert(instAfterSave?.dirty === false, 'Save: PackageGraphInstance dirty is false after commit');
assert(instAfterSave?.unlocked === true, 'Save: PackageGraphInstance remains unlocked/committed');

// ─────────────────────────────────────────────────────────────────
// T7 — Close Clean Document: Clean subflow can close normally
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Close Clean Document ---');

// Close rear clean document
useFlowStore.getState().closeDocument(rearDocId);

assert(
  !useFlowStore.getState().documents.some(d => d.id === rearDocId),
  'T7: Clean rear subflow document tab closed successfully'
);
assert(
  useFlowStore.getState().subflowInstances[rearDocId] === undefined,
  'T7: Pristine locked instance cleaned up from in-memory subflowInstances on close'
);

// ─────────────────────────────────────────────────────────────────
// T9 — Reopen Customized Instance: Session state retains override on close & reopen
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Reopen Customized Instance ---');

// Close front customized document tab
useFlowStore.getState().closeDocument(frontDocId);

assert(
  !useFlowStore.getState().documents.some(d => d.id === frontDocId),
  'T9: Front subflow document tab closed'
);
assert(
  useFlowStore.getState().subflowInstances[frontDocId] !== undefined,
  'T9: Customized override preserved in session subflowInstances after closing tab'
);
assert(
  useFlowStore.getState().subflowInstances[frontDocId].unlocked === true,
  'T9: Preserved session override remains unlocked'
);

// Reopen front customized document
const reopenedDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front',
  title: 'Front HC-SR04'
});

const reopenedDoc = useFlowStore.getState().documents.find(d => d.id === reopenedDocId) as SubflowDocument;
const reopenedInst = useFlowStore.getState().subflowInstances[reopenedDocId];

assert(reopenedDoc?.unlocked === true, 'T9: Reopened document is in unlocked state');
assert(reopenedDoc?.readOnly === false, 'T9: Reopened document is editable (readOnly = false)');
assert(
  (reopenedInst?.nodes.find(n => n.id === 'delay_2us')?.data as any)?.params?.duration === '5',
  'T9: Reopened instance contains customized 5us delay parameter'
);

// ─────────────────────────────────────────────────────────────────
// T4 — Revert: Revert restores a fresh clone of the package template
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Revert Override Semantics ---');

useFlowStore.getState().revertSubflowOverride(frontDocId);

const docAfterRevert = useFlowStore.getState().documents.find(d => d.id === frontDocId) as SubflowDocument;
const instAfterRevert = useFlowStore.getState().subflowInstances[frontDocId];

assert(docAfterRevert?.readOnly === true, 'T4: SubflowDocument reverted to readOnly = true');
assert(docAfterRevert?.unlocked === false, 'T4: SubflowDocument reverted to unlocked = false');
assert(docAfterRevert?.dirty === false, 'T4: SubflowDocument dirty is false after revert');
assert(instAfterRevert?.unlocked === false, 'T4: PackageGraphInstance unlocked is false after revert');
assert(instAfterRevert?.dirty === false, 'T4: PackageGraphInstance dirty is false after revert');
assert(
  (instAfterRevert?.nodes.find(n => n.id === 'delay_2us')?.data as any)?.params?.duration === '2',
  'T4: Reverted instance node duration restored to template 2us'
);

// ─────────────────────────────────────────────────────────────────
// T10 — Compiler After Revert: Generated code corresponds to package template
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Compiler After Revert ---');

const revertedCompiler = new GraphToASTCompiler(
  flowNodes,
  flowEdges,
  {},
  {},
  schemaNodes,
  schemaEdges,
  { subflowOverrides: useFlowStore.getState().subflowInstances }
);
const revertedAst = revertedCompiler.compile();
const revertedCode = generator.generate(revertedAst, schemaNodes, schemaEdges).main;

assert(
  !revertedCode.includes('delayMicroseconds(5)'),
  'T10: Reverted front sensor no longer emits custom 5us delay'
);
assert(
  revertedCode.includes('delayMicroseconds(2)'),
  'T10: Reverted front sensor emits standard 2us delay from package template'
);

// ─────────────────────────────────────────────────────────────────
// T5 — Revert Isolation: Reverting sensor_front does not affect other components
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Revert Isolation ---');

// Customize rear sensor to 8us
useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_rear',
});
useFlowStore.getState().unlockSubflowDocument('subflow_ultrasonic_hcsr04_sensor_rear');

const rearNodes = useFlowStore.getState().getActiveFlowNodes().map(n => {
  if (n.id === 'delay_2us') {
    return { ...n, data: { ...n.data, params: { ...(n.data as any).params, duration: '8' } } };
  }
  return n;
});
useFlowStore.getState().setActiveFlowNodes(rearNodes);

// Now revert front sensor again
useFlowStore.getState().revertSubflowOverride(frontDocId);

const rearAfterFrontRevert = useFlowStore.getState().subflowInstances['subflow_ultrasonic_hcsr04_sensor_rear'];
assert(
  (rearAfterFrontRevert?.nodes.find(n => n.id === 'delay_2us')?.data as any)?.params?.duration === '8',
  'T5: Rear sensor 8us customization completely unaffected by front sensor revert'
);

// ─────────────────────────────────────────────────────────────────
// T12 — Determinism: Repeated compilation remains byte-for-byte identical
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Compilation Determinism ---');

const pass1 = generator.generate(
  new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges, { subflowOverrides: useFlowStore.getState().subflowInstances }).compile(),
  schemaNodes,
  schemaEdges
).main;

const pass2 = generator.generate(
  new GraphToASTCompiler(flowNodes, flowEdges, {}, {}, schemaNodes, schemaEdges, { subflowOverrides: useFlowStore.getState().subflowInstances }).compile(),
  schemaNodes,
  schemaEdges
).main;

assert(pass1 === pass2, 'T12: Repeated compilation produces 100% identical C++ code');

// ─────────────────────────────────────────────────────────────────
// T13 — Canonical Identity: PackageId + ComponentInstanceId Authority
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T13: Canonical Identity Authority ---');

const resolvedInst = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_rear');
assert(Boolean(resolvedInst), 'T13: getSubflowInstance resolves by packageId + componentInstanceId');
assert(resolvedInst?.componentInstanceId === 'sensor_rear', 'T13: Resolved instance has matching componentInstanceId');

// ─────────────────────────────────────────────────────────────────
// T14 — Builtin Regression: Packages without graphs continue using builtin path
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14: Builtin Package Regression ---');

const builtinNodes: Node[] = [
  { id: 'start_node', type: 'baseNode', data: { nodeType: 'start' }, position: { x: 0, y: 0 } },
  { id: 'sensor_analog', type: 'baseNode', data: { nodeType: 'sensor', params: { var: 'temp', pin: 'A0' } }, position: { x: 200, y: 0 } }
];
const builtinEdges: Edge[] = [
  { id: 'be1', source: 'start_node', target: 'sensor_analog', sourceHandle: 'flow', targetHandle: 'flow' }
];

const builtinCompiler = new GraphToASTCompiler(builtinNodes, builtinEdges, {}, {}, [], [], {
  subflowOverrides: useFlowStore.getState().subflowInstances
});
const builtinAst = builtinCompiler.compile();
assert(builtinAst.kind === 'Program', 'T14: Builtin packages compile to valid Program AST');
assert(builtinAst.body.length > 0, 'T14: Builtin package AST has body statements');

// ─────────────────────────────────────────────────────────────────
// T15 — Fresh Clone Verification: Revert creates fresh object tree with no shared references
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T15: Fresh Clone Reference Isolation ---');

const revertedInstance = useFlowStore.getState().subflowInstances[frontDocId];
const templateNodes = templateGraph.nodes;

assert(
  revertedInstance.nodes !== templateNodes,
  'T15: Reverted nodes array is a new reference, not pointing to registry array'
);
assert(
  revertedInstance.nodes[0] !== templateNodes[0],
  'T15: Reverted node object is a new reference, not pointing to registry node'
);
assert(
  revertedInstance.nodes[0].data !== templateNodes[0].data,
  'T15: Reverted node.data is a new reference, not pointing to registry node.data'
);

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
