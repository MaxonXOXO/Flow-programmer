import { useFlowStore, SubflowDocument } from '../store/userFlowStore';
import { getComponentPackage } from '../lib/registry/components';

console.log('=== TEST PHASE 5D: UNLOCK FLOW ===\n');

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
// Setup: Reset store to clean state
// ─────────────────────────────────────────────────────────────────
useFlowStore.setState({
  documents: [
    { id: 'schema', title: 'Schema Designer', type: 'schema', closable: false },
    { id: 'main_flow', title: 'Main Flow', type: 'flow', closable: false },
  ],
  activeDocumentId: 'main_flow',
  subflowInstances: {},
});

const pkgTemplateBefore = getComponentPackage('ultrasonic_hcsr04');
const templateNodesCountBefore = (pkgTemplateBefore?.implementation?.graph as any)?.nodes?.length || 0;

// ─────────────────────────────────────────────────────────────────
// T1 — Locked initial state
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Locked Initial State ---');
const frontDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front',
  activate: true,
});

const frontDocLocked = useFlowStore.getState().documents.find(d => d.id === frontDocId) as SubflowDocument | undefined;
const frontInstanceLocked = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_front');

assert(frontDocLocked !== undefined, 'T1: Front sensor subflow document created');
assert(frontDocLocked?.readOnly === true, 'T1: Document readOnly is true initially');
assert(frontInstanceLocked?.unlocked === false, 'T1: Instance unlocked is false initially');
assert(frontInstanceLocked?.dirty === false, 'T1: Instance dirty is false initially');
assert(frontDocLocked?.dirty === false, 'T1: Document dirty is false initially');

// ─────────────────────────────────────────────────────────────────
// T6 (Part 1) — Locked mutation protection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Locked Mutation Protection ---');
const nodeCountBeforeMutation = frontInstanceLocked?.nodes.length || 0;
useFlowStore.getState().addActiveFlowNode({
  id: 'illegal_node',
  type: 'baseNode',
  position: { x: 0, y: 0 },
  data: { label: 'Illegal Node', nodeType: 'custom' },
});

const frontInstanceAfterAttempt = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_front');
assert(
  frontInstanceAfterAttempt?.nodes.length === nodeCountBeforeMutation,
  'T6: Adding a node to a locked subflow was blocked (node count unchanged)'
);
assert(
  frontInstanceAfterAttempt?.dirty === false,
  'T6: Instance dirty remained false after blocked mutation attempt'
);

// ─────────────────────────────────────────────────────────────────
// T2 — Unlock transition
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Unlock Transition ---');
useFlowStore.getState().unlockSubflowDocument(frontDocId);

const frontDocUnlocked = useFlowStore.getState().documents.find(d => d.id === frontDocId) as SubflowDocument | undefined;
const frontInstanceUnlocked = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_front');

assert(frontDocUnlocked?.readOnly === false, 'T2: Document readOnly transitioned to false');
assert(frontDocUnlocked?.unlocked === true, 'T2: Document unlocked transitioned to true');
assert(frontInstanceUnlocked?.unlocked === true, 'T2: Instance unlocked transitioned to true');

// ─────────────────────────────────────────────────────────────────
// T3 — Graph identity preservation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Graph Identity Preservation ---');
assert(
  frontInstanceUnlocked?.nodes.length === nodeCountBeforeMutation,
  'T3: Unlocking preserved exact node count without resetting'
);
assert(
  frontInstanceUnlocked?.entry === 'trig_low_1',
  'T3: Unlocking preserved entry node identity'
);
assert(
  frontInstanceUnlocked?.exit === 'return_distance',
  'T3: Unlocking preserved exit node identity'
);

// ─────────────────────────────────────────────────────────────────
// T8 (Part 1) — Dirty state on unlock only
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Dirty State Lifecycle ---');
assert(frontInstanceUnlocked?.dirty === false, 'T8: Instance dirty is false immediately after unlock (no graph edit yet)');
assert(frontDocUnlocked?.dirty === false, 'T8: Document dirty is false immediately after unlock');

// ─────────────────────────────────────────────────────────────────
// T7 — Unlocked mutation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Unlocked Mutation ---');
useFlowStore.getState().addActiveFlowNode({
  id: 'custom_filter_node',
  type: 'baseNode',
  position: { x: 500, y: 300 },
  data: { label: 'Median Filter', nodeType: 'custom_calc' },
});

const frontInstanceAfterEdit = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_front');
const frontDocAfterEdit = useFlowStore.getState().documents.find(d => d.id === frontDocId) as SubflowDocument | undefined;

assert(
  frontInstanceAfterEdit?.nodes.length === nodeCountBeforeMutation + 1,
  'T7: Successfully added node to unlocked subflow graph'
);
assert(frontInstanceAfterEdit?.dirty === true, 'T8: Instance dirty became true after mutation');
assert(frontDocAfterEdit?.dirty === true, 'T8: Document dirty became true after mutation');

// ─────────────────────────────────────────────────────────────────
// T4 — Package immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Package Immutability ---');
const pkgTemplateAfter = getComponentPackage('ultrasonic_hcsr04');
const templateGraphAfter = pkgTemplateAfter?.implementation?.graph as any;
assert(
  templateGraphAfter?.nodes?.length === templateNodesCountBefore,
  'T4: Package template in registry remains completely unmodified'
);
assert(
  !templateGraphAfter?.nodes?.some((n: any) => n.id === 'custom_filter_node'),
  'T4: Package template does not contain custom_filter_node'
);

// ─────────────────────────────────────────────────────────────────
// T5 — Instance isolation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Instance Isolation (Front vs Rear) ---');
const rearDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_rear',
  activate: false,
});

const rearDoc = useFlowStore.getState().documents.find(d => d.id === rearDocId) as SubflowDocument | undefined;
const rearInstance = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_rear');

assert(rearDoc?.readOnly === true, 'T5: Rear sensor subflow document remains locked (readOnly = true)');
assert(rearInstance?.unlocked === false, 'T5: Rear sensor instance remains locked (unlocked = false)');
assert(rearInstance?.dirty === false, 'T5: Rear sensor instance is clean (dirty = false)');
assert(
  rearInstance?.nodes.length === nodeCountBeforeMutation,
  'T5: Rear sensor graph was NOT modified by edits to front sensor'
);
assert(
  !rearInstance?.nodes.some(n => n.id === 'custom_filter_node'),
  'T5: Rear sensor does not have front sensor\'s custom node'
);

// ─────────────────────────────────────────────────────────────────
// T9 — Package identity preservation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Package Identity Preservation ---');
assert(frontDocAfterEdit?.packageId === 'ultrasonic_hcsr04', 'T9: Document packageId is preserved as "ultrasonic_hcsr04"');
assert(frontInstanceAfterEdit?.packageId === 'ultrasonic_hcsr04', 'T9: Instance packageId is preserved as "ultrasonic_hcsr04"');

// ─────────────────────────────────────────────────────────────────
// T10 — Component instance preservation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Component Instance Preservation ---');
assert(
  frontDocAfterEdit?.componentInstanceId === 'sensor_front',
  'T10: Document componentInstanceId is preserved as "sensor_front"'
);
assert(
  frontInstanceAfterEdit?.componentInstanceId === 'sensor_front',
  'T10: Instance componentInstanceId is preserved as "sensor_front"'
);

// ─────────────────────────────────────────────────────────────────
// T11 — Existing Flow regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Main Flow Non-Regression ---');
useFlowStore.getState().setActiveDocument('main_flow');
const mainNodesBefore = useFlowStore.getState().flowNodes.length;

useFlowStore.getState().addActiveFlowNode({
  id: 'main_flow_test_node',
  type: 'baseNode',
  position: { x: 100, y: 100 },
  data: { label: 'Main Test Node', nodeType: 'input' },
});

assert(
  useFlowStore.getState().flowNodes.length === mainNodesBefore + 1,
  'T11: Main flow continues to accept edits normally when active'
);

// ─────────────────────────────────────────────────────────────────
// T12 — Existing Schema regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Schema Non-Regression ---');
useFlowStore.getState().setActiveDocument('schema');
assert(useFlowStore.getState().activeCanvas === 'schema', 'T12: Schema document activates successfully');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
