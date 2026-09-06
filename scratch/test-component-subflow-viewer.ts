import { resolveCanonicalPackageId } from '../lib/packages/packageGraphInstantiator';
import { useFlowStore, SubflowDocument } from '../store/userFlowStore';
import { getComponentPackage } from '../lib/registry/components';

console.log('=== TEST PHASE 5C: COMPONENT SUBFLOW VIEWER INTEGRATION ===\n');

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
// T1 — Component double-click resolution
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Component Double-Click Resolution ---');
const sampleNode = {
  id: 'sensor_front',
  type: 'baseNode',
  data: {
    label: 'Front Ultrasonic Sensor',
    nodeType: 'ultrasonic',
    params: {
      packageId: 'ultrasonic_hcsr04',
      trigPin: '9',
      echoPin: '10',
    },
  },
};

const resolvedPkgId = resolveCanonicalPackageId(sampleNode);
assert(resolvedPkgId === 'ultrasonic_hcsr04', 'T1: Canonical packageId resolved as "ultrasonic_hcsr04"');

// ─────────────────────────────────────────────────────────────────
// T2 — Subflow document creation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Subflow Document Creation ---');
const docId = useFlowStore.getState().openSubflowDocument({
  packageId: resolvedPkgId!,
  componentInstanceId: sampleNode.id,
  activate: true,
});

const createdDoc = useFlowStore.getState().documents.find(d => d.id === docId) as SubflowDocument | undefined;

assert(createdDoc !== undefined, 'T2: SubflowDocument exists in workspace documents');
assert(createdDoc?.type === 'subflow', 'T2: Document type is "subflow"');
assert(useFlowStore.getState().activeDocumentId === docId, 'T2: Subflow document is active document');

// ─────────────────────────────────────────────────────────────────
// T3 — Instance identity
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Instance Identity ---');
assert(createdDoc?.packageId === 'ultrasonic_hcsr04', 'T3: Document packageId is "ultrasonic_hcsr04"');
assert(createdDoc?.componentInstanceId === 'sensor_front', 'T3: Document componentInstanceId is "sensor_front"');

// ─────────────────────────────────────────────────────────────────
// T4 — Graph instantiation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Graph Instantiation ---');
const graphInstance = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_front');

assert(graphInstance !== undefined, 'T4: PackageGraphInstance obtained from store');
assert(graphInstance?.nodes.length === 9, 'T4: Instantiated graph contains 9 nodes');
assert(graphInstance?.edges.length === 8, 'T4: Instantiated graph contains 8 edges');
assert(graphInstance?.entry === 'trig_low_1', 'T4: Instantiated graph entry is "trig_low_1"');
assert(graphInstance?.exit === 'return_distance', 'T4: Instantiated graph exit is "return_distance"');

// ─────────────────────────────────────────────────────────────────
// T5 — Graph isolation & Main Graph Protection (Section 12 Test)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Graph Isolation & Main Graph Protection ---');
const mainFlowNodesBefore = useFlowStore.getState().flowNodes;
const mainFlowEdgesBefore = useFlowStore.getState().flowEdges;
const activeNodes = useFlowStore.getState().getActiveFlowNodes();
const activeEdges = useFlowStore.getState().getActiveFlowEdges();

assert(
  activeNodes === graphInstance?.nodes,
  'T5: getActiveFlowNodes() resolves to the subflow graph when subflow document is active'
);
assert(
  activeEdges === graphInstance?.edges,
  'T5: getActiveFlowEdges() resolves to the subflow edges when subflow document is active'
);
assert(
  useFlowStore.getState().flowNodes === mainFlowNodesBefore,
  'T5: Opening subflow document did NOT replace or mutate main flow nodes array'
);
assert(
  useFlowStore.getState().flowEdges === mainFlowEdgesBefore,
  'T5: Opening subflow document did NOT replace or mutate main flow edges array'
);
assert(
  activeNodes !== mainFlowNodesBefore,
  'T5: Subflow graph is NOT a clone of main flow graph'
);
assert(
  activeNodes.length !== mainFlowNodesBefore.length || activeNodes[0]?.id !== mainFlowNodesBefore[0]?.id,
  'T5: Subflow graph nodes are distinct from main flow graph nodes'
);

// Verify displayed subflow graph is derived from package template, but is not the template reference
const templatePkg = getComponentPackage('ultrasonic_hcsr04')!;
const templateGraph = (templatePkg.implementation.graph || templatePkg.implementation.subflow) as any;

assert(
  activeNodes !== templateGraph.nodes,
  'T5: Subflow active nodes array is an isolated instance, not the package template reference'
);
assert(
  activeNodes[0] !== templateGraph.nodes[0],
  'T5: Subflow individual node is a deep clone, not the package template node reference'
);

// ─────────────────────────────────────────────────────────────────
// T6 — Duplicate prevention
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Duplicate Prevention ---');
const countBefore = useFlowStore.getState().documents.length;
const docIdReopen = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_front',
  activate: true,
});
const countAfter = useFlowStore.getState().documents.length;

assert(docIdReopen === docId, 'T6: Reopening same component instance returns existing document ID');
assert(countBefore === countAfter, 'T6: Document list length remains identical (zero duplicate tabs)');

// ─────────────────────────────────────────────────────────────────
// T7 — Different instances
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Different Component Instances ---');
const rearDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_rear',
  activate: false,
});

const rearDoc = useFlowStore.getState().documents.find(d => d.id === rearDocId) as SubflowDocument | undefined;
const rearInstance = useFlowStore.getState().getSubflowInstance('ultrasonic_hcsr04', 'sensor_rear');

assert(rearDocId !== docId, 'T7: sensor_front and sensor_rear create distinct document IDs');
assert(rearDoc?.componentInstanceId === 'sensor_rear', 'T7: Rear document componentInstanceId is "sensor_rear"');
assert(rearInstance !== graphInstance, 'T7: Rear sensor has a distinct PackageGraphInstance reference');

// ─────────────────────────────────────────────────────────────────
// T8 — Read-only behavior
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Read-Only Behavior ---');
assert(createdDoc?.readOnly === true, 'T8: Subflow document is configured as readOnly = true');

// ─────────────────────────────────────────────────────────────────
// T9 — Existing Flow regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Main Flow Regression ---');
useFlowStore.getState().setActiveDocument('main_flow');

assert(useFlowStore.getState().activeDocumentId === 'main_flow', 'T9: main_flow can be activated');
assert(
  useFlowStore.getState().getActiveFlowNodes() === useFlowStore.getState().flowNodes,
  'T9: getActiveFlowNodes() resolves to main flowNodes when main_flow is active'
);

// ─────────────────────────────────────────────────────────────────
// T10 — Existing Schema regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Schema Canvas Regression ---');
useFlowStore.getState().setActiveDocument('schema');

assert(useFlowStore.getState().activeDocumentId === 'schema', 'T10: schema document can be activated');
assert(useFlowStore.getState().activeCanvas === 'schema', 'T10: activeCanvas resolved to "schema"');

// ─────────────────────────────────────────────────────────────────
// T11 — Navigation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Navigation ---');
useFlowStore.getState().setActiveDocument(docId);
assert(useFlowStore.getState().activeDocumentId === docId, 'T11: Navigated into Subflow document');

useFlowStore.getState().setActiveDocument('main_flow');
assert(useFlowStore.getState().activeDocumentId === 'main_flow', 'T11: Navigated back into Main Flow');

// ─────────────────────────────────────────────────────────────────
// T12 — Invalid package error handling
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Invalid Package Error Handling ---');
const invalidNode = {
  id: 'node_invalid',
  type: 'baseNode',
  data: {
    label: 'Bogus Node',
    nodeType: 'nonexistent_package_xyz',
  },
};

const resolvedInvalid = resolveCanonicalPackageId(invalidNode);
assert(resolvedInvalid === undefined, 'T12: Canonical package resolution returned undefined for invalid package');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) process.exit(1);
