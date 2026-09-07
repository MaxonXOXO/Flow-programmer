import { useFlowStore } from '../store/userFlowStore';

console.log('=== TEST EXPLORER TREE & SUBFLOW CLEANLINESS ===\n');

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// 1. Verify clean subflow document titles
console.log('--- T1: Clean Subflow Document Titles ---');
const docId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_clean_test',
  activate: true,
});

const doc = useFlowStore.getState().documents.find(d => d.id === docId);
assert(doc !== undefined, 'T1: Subflow doc created');
assert(!doc?.title.startsWith('📦'), `T1: Title does not start with box emoji: "${doc?.title}"`);
assert(!doc?.title.startsWith('🔓'), `T1: Title does not start with lock emoji: "${doc?.title}"`);
assert(Boolean(doc?.title.includes('HC-SR04 Subflow')), `T1: Clean title is "HC-SR04 Subflow", got "${doc?.title}"`);

// 2. Verify subflow unlock preserves clean title
console.log('\n--- T2: Subflow Unlock Preserves Clean Title ---');
useFlowStore.getState().unlockSubflowDocument(docId);
const unlockedDoc = useFlowStore.getState().documents.find(d => d.id === docId);
assert((unlockedDoc as any)?.unlocked === true, 'T2: Subflow unlocked');
assert(!unlockedDoc?.title.startsWith('📦'), `T2: Unlocked title does not start with box emoji: "${unlockedDoc?.title}"`);
assert(!unlockedDoc?.title.startsWith('🔓'), `T2: Unlocked title does not start with lock emoji: "${unlockedDoc?.title}"`);

// 3. Verify focusNodeOnCanvas action
console.log('\n--- T3: focusNodeOnCanvas Action ---');
useFlowStore.getState().focusNodeOnCanvas('node_alpha_123');
const state = useFlowStore.getState();
assert(state.selectedNodeId === 'node_alpha_123', 'T3: selectedNodeId updated to target node');
assert(state.focusTarget?.id === 'node_alpha_123', 'T3: focusTarget updated to target node');
assert(typeof state.focusTarget?.timestamp === 'number', 'T3: focusTarget timestamp is numeric');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
