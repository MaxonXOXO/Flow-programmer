import { Node, Edge } from '@xyflow/react';
import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';

console.log('=== TEST B5: CANONICAL PACKAGE IDENTITY RESOLUTION ===\n');

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
// T1 — Canonical Package Resolution across arbitrary display labels
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Canonical Package Resolution (Arbitrary Labels) ---');

const testLabels = [
  'Distance Sensor',
  'My Sensor',
  'Banana',
  'Ultrasonic LED'
];

testLabels.forEach((label) => {
  const nodes: Node[] = [
    {
      id: 'start_node',
      type: 'baseNode',
      data: { nodeType: 'start', label: 'Start' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'sensor_inst',
      type: 'componentNode',
      data: {
        label,
        nodeType: 'custom_sensor',
        params: {
          packageId: 'ultrasonic_hcsr04',
          varDist: 'distance_val'
        }
      },
      position: { x: 200, y: 0 }
    }
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start_node', target: 'sensor_inst', sourceHandle: 'flow', targetHandle: 'flow' }
  ];

  const expanded = expandComponentGraphs(nodes, edges);
  const containsExpandedSubflow = expanded.nodes.some(
    (n: Node) => n.id.startsWith('sensor_inst_') || (n.data as any)?.params?.varDist === 'distance_val'
  );

  assert(
    containsExpandedSubflow,
    `Node with label "${label}" and packageId="ultrasonic_hcsr04" resolved to HC-SR04 package`
  );
});

// ─────────────────────────────────────────────────────────────────
// T2 — Incorrect Package ID does NOT guess package from display label
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Incorrect Package ID (No Label Guessing) ---');

const badPackageNode: Node[] = [
  {
    id: 'start_node',
    type: 'baseNode',
    data: { nodeType: 'start', label: 'Start' },
    position: { x: 0, y: 0 }
  },
  {
    id: 'bad_pkg_inst',
    type: 'componentNode',
    data: {
      label: 'Ultrasonic HC-SR04 Distance Sensor',
      nodeType: 'ultrasonic',
      params: {
        packageId: 'some_nonexistent_package',
        varDist: 'dist'
      }
    },
    position: { x: 200, y: 0 }
  }
];

const badPackageEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'bad_pkg_inst', sourceHandle: 'flow', targetHandle: 'flow' }
];

const resolvedBadPkg = resolvePackageImplementation('some_nonexistent_package');
assert(
  !resolvedBadPkg.graph && !resolvedBadPkg.subflow && resolvedBadPkg.packageId === 'some_nonexistent_package',
  'resolvePackageImplementation("some_nonexistent_package") returns unresolved package'
);

const expandedBadPkg = expandComponentGraphs(badPackageNode, badPackageEdges);
const guessedHcSr04 = expandedBadPkg.nodes.some(
  (n: Node) => n.id.includes('bad_pkg_inst_') && (n.data as any)?.label?.includes('HC-SR04')
);
assert(
  !guessedHcSr04,
  'Expansion with nonexistent packageId did NOT guess HC-SR04 from label "Ultrasonic HC-SR04 Distance Sensor"'
);

// ─────────────────────────────────────────────────────────────────
// T3 — Label Independence (Completely Custom Name)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Label Independence ---');

const customLabelNodes: Node[] = [
  {
    id: 'start_node',
    type: 'baseNode',
    data: { nodeType: 'start', label: 'Start' },
    position: { x: 0, y: 0 }
  },
  {
    id: 'custom_inst',
    type: 'componentNode',
    data: {
      label: 'Completely Custom Name',
      nodeType: 'some_sensor_node',
      params: {
        packageId: 'ultrasonic_hcsr04',
        varDist: 'my_dist'
      }
    },
    position: { x: 200, y: 0 }
  }
];

const customLabelEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'custom_inst', sourceHandle: 'flow', targetHandle: 'flow' }
];

const expandedCustom = expandComponentGraphs(customLabelNodes, customLabelEdges);
assert(
  expandedCustom.hasExpandedComponents && expandedCustom.nodes.length > customLabelNodes.length,
  'Node with label "Completely Custom Name" and packageId="ultrasonic_hcsr04" expanded successfully'
);

// ─────────────────────────────────────────────────────────────────
// T4 — Existing HC-SR04 Full Compilation Regression
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Existing HC-SR04 Compilation Regression ---');

const fullFlowNodes: Node[] = [
  {
    id: 'start_node',
    type: 'baseNode',
    data: { nodeType: 'start', label: 'Start' },
    position: { x: 0, y: 0 }
  },
  {
    id: 'ultrasonic_node',
    type: 'componentNode',
    data: {
      label: 'Ultrasonic Read',
      nodeType: 'ultrasonic',
      params: {
        packageId: 'ultrasonic_hcsr04',
        trigPin: '9',
        echoPin: '10',
        varDist: 'distance_cm'
      }
    },
    position: { x: 200, y: 0 }
  },
  {
    id: 'print_node',
    type: 'baseNode',
    data: {
      nodeType: 'print',
      params: { message: 'distance_cm' }
    },
    position: { x: 400, y: 0 }
  }
];

const fullFlowEdges: Edge[] = [
  { id: 'e1', source: 'start_node', target: 'ultrasonic_node', sourceHandle: 'flow', targetHandle: 'flow' },
  { id: 'e2', source: 'ultrasonic_node', target: 'print_node', sourceHandle: 'flow', targetHandle: 'flow' }
];

const compiler = new GraphToASTCompiler(fullFlowNodes, fullFlowEdges);
const ast = compiler.compile();

assert(ast !== null, 'Compiler produces valid AST for HC-SR04 node');
assert(ast.kind === 'Program', 'AST root is Program');
assert(Array.isArray(ast.body) && ast.body.length > 0, 'AST body is non-empty');

console.log('\n==================================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}
