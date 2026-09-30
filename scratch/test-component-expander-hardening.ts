/**
 * Phase 6A.4.4 — Contract-Enforced Deterministic Component Expansion
 * Test Suite: scratch/test-component-expander-hardening.ts
 *
 * Scenarios:
 * D1:  Same Input Determinism (deep structural equality)
 * D2:  Multi-Instance Isolation (node IDs distinct, internal variables scoped, bindings isolated)
 * D3:  Input Ordering Invariance (semantic equivalence under node/edge array reordering)
 * D4:  Unknown Pin Detection (fails with INSTANCE_UNKNOWN_PIN)
 * D5:  Missing Required Pin Enforcement (fails with INSTANCE_REQUIRED_PIN_UNCONNECTED)
 * D6:  Unresolved Placeholder Detection (fails with EXPANDED_UNRESOLVED_PLACEHOLDER)
 * D7:  Duplicate Pin Detection (fails with INSTANCE_DUPLICATE_PIN_BINDING)
 * D8:  Unknown Output Detection (fails with INSTANCE_UNKNOWN_OUTPUT)
 * D9:  Residual Component Rejection (fails with UNEXPANDED_COMPONENT_REMAINING)
 * D10: Atomic Failure (caller graph unmutated, no partial graph exposed on failure)
 */

import {
  expandComponentGraphs,
  ComponentExpanderError,
  cloneNode,
  cloneEdge,
} from '../lib/compiler/packages/componentExpander';
import { getComponentPackage } from '../lib/registry/components';
import { ComponentPackage } from '../lib/registry/components/types';
import { Node, Edge } from '@xyflow/react';

console.log('=== TEST PHASE 6A.4.4: CONTRACT-ENFORCED DETERMINISTIC COMPONENT EXPANSION ===\n');

let passed = 0;
let failed = 0;

function assert(condition: any, msg: string) {
  if (Boolean(condition)) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// Helper deep equality checker for normalized graphs
function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─────────────────────────────────────────────────────────────────
// D1: Same Input Invariance (Determinism)
// ─────────────────────────────────────────────────────────────────
console.log('--- D1: Same Input Invariance ---');
{
  const flowNodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    {
      id: 'ldr_1',
      type: 'baseNode',
      position: { x: 200, y: 0 },
      data: {
        nodeType: 'component',
        params: { packageId: 'ldr_light', componentInstanceId: 'comp_ldr_hw', target: 'ambientLight' },
      },
    },
    { id: 'end', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'print', params: { message: 'ambientLight' } } },
  ];

  const flowEdges: Edge[] = [
    { id: 'e1', source: 'start', target: 'ldr_1', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'ldr_1', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'comp_ldr_hw', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
  ];

  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'comp_ldr_hw', sourceHandle: 'A0', targetHandle: 'pin1' },
    { id: 'se2', source: 'board', target: 'comp_ldr_hw', sourceHandle: 'GND', targetHandle: 'pin2' },
  ];

  const run1 = expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);
  const run2 = expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);

  assert(run1.hasExpandedComponents === true, 'D1: Expansion succeeds with hasExpandedComponents=true');
  assert(deepEqual(run1, run2), 'D1: Identical input graphs produce deep structural equality across multiple runs');
  assert(run1.nodes.length === 4, 'D1: Correct number of expanded primitive nodes (start + 2 ldr subnodes + end)');
  assert(run1.nodes.some(n => n.id === 'ldr_1_read_analog'), 'D1: Entry node identity is deterministic');
  assert(run1.nodes.some(n => n.id === 'ldr_1_return_light'), 'D1: Exit node identity is deterministic');
}

// ─────────────────────────────────────────────────────────────────
// D2: Multi-Instance Isolation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D2: Multi-Instance Isolation ---');
{
  const flowNodes: Node[] = [
    { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
    {
      id: 'ldr_front',
      type: 'baseNode',
      position: { x: 200, y: 0 },
      data: {
        nodeType: 'component',
        params: { packageId: 'ldr_light', componentInstanceId: 'hw_front', target: 'lux_front' },
      },
    },
    {
      id: 'ldr_rear',
      type: 'baseNode',
      position: { x: 400, y: 0 },
      data: {
        nodeType: 'component',
        params: { packageId: 'ldr_light', componentInstanceId: 'hw_rear', target: 'lux_rear' },
      },
    },
    { id: 'end', type: 'baseNode', position: { x: 600, y: 0 }, data: { nodeType: 'print' } },
  ];

  const flowEdges: Edge[] = [
    { id: 'e1', source: 'start', target: 'ldr_front', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e2', source: 'ldr_front', target: 'ldr_rear', sourceHandle: 'flow', targetHandle: 'flow' },
    { id: 'e3', source: 'ldr_rear', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_front', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
    { id: 'hw_rear', type: 'componentNode', position: { x: 200, y: 0 }, data: { packageId: 'ldr_light' } },
  ];

  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'hw_front', sourceHandle: 'A0', targetHandle: 'pin1' },
    { id: 'se2', source: 'board', target: 'hw_rear', sourceHandle: 'A2', targetHandle: 'pin1' },
  ];

  const res = expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);

  // 1. Verify all node IDs are unique
  const nodeIds = res.nodes.map(n => n.id);
  const uniqueIds = new Set(nodeIds);
  assert(nodeIds.length === uniqueIds.size, 'D2: All expanded node IDs are strictly unique (no collisions)');

  // 2. Verify instance prefixing
  const frontNodes = res.nodes.filter(n => n.id.startsWith('ldr_front_'));
  const rearNodes = res.nodes.filter(n => n.id.startsWith('ldr_rear_'));
  assert(frontNodes.length === 2, 'D2: Front LDR nodes strictly prefixed with "ldr_front_" (read_analog, return_light)');
  assert(rearNodes.length === 2, 'D2: Rear LDR nodes strictly prefixed with "ldr_rear_" (read_analog, return_light)');

  // 3. Verify distinct pin bindings
  const frontAnalog = frontNodes.find(n => n.id === 'ldr_front_read_analog');
  const rearAnalog = rearNodes.find(n => n.id === 'ldr_rear_read_analog');
  const frontParams = (frontAnalog?.data as any)?.params;
  const rearParams = (rearAnalog?.data as any)?.params;
  assert(frontParams?.pin === 'A0', 'D2: Front instance pin bound to A0');
  assert(rearParams?.pin === 'A2', 'D2: Rear instance pin bound to A2');

  // 4. Verify distinct target variables
  assert(frontParams?.target === 'lux_front', 'D2: Front instance target variable is lux_front');
  assert(rearParams?.target === 'lux_rear', 'D2: Rear instance target variable is lux_rear');
}

// ─────────────────────────────────────────────────────────────────
// D3: Input Array Ordering Invariance
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D3: Input Array Ordering Invariance ---');
{
  const nodeStart: Node = { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } };
  const nodeComp: Node = {
    id: 'ldr_comp',
    type: 'baseNode',
    position: { x: 200, y: 0 },
    data: { nodeType: 'component', params: { packageId: 'ldr_light', componentInstanceId: 'hw1', target: 'lux' } },
  };
  const nodeEnd: Node = { id: 'end', type: 'baseNode', position: { x: 400, y: 0 }, data: { nodeType: 'print' } };

  const edge1: Edge = { id: 'e1', source: 'start', target: 'ldr_comp', sourceHandle: 'flow', targetHandle: 'flow' };
  const edge2: Edge = { id: 'e2', source: 'ldr_comp', target: 'end', sourceHandle: 'flow', targetHandle: 'flow' };

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw1', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
  ];
  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'hw1', sourceHandle: 'A0', targetHandle: 'pin1' },
  ];

  // Order A: start, comp, end
  const resA = expandComponentGraphs([nodeStart, nodeComp, nodeEnd], [edge1, edge2], schemaNodes, schemaEdges);

  // Order B: end, comp, start (reversed edges: edge2, edge1)
  const resB = expandComponentGraphs([nodeEnd, nodeComp, nodeStart], [edge2, edge1], schemaNodes, schemaEdges);

  // Normalize by ID sorting
  const sortById = (arr: any[]) => [...arr].sort((a, b) => a.id.localeCompare(b.id));

  const sortedNodesA = sortById(resA.nodes);
  const sortedNodesB = sortById(resB.nodes);
  const sortedEdgesA = sortById(resA.edges);
  const sortedEdgesB = sortById(resB.edges);

  assert(deepEqual(sortedNodesA, sortedNodesB), 'D3: Reordered input node arrays expand to identical node sets');
  assert(deepEqual(sortedEdgesA, sortedEdgesB), 'D3: Reordered input edge arrays expand to identical edge sets');
}

// ─────────────────────────────────────────────────────────────────
// D4: Unknown Pin Detection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D4: Unknown Pin Detection ---');
{
  const flowNodes: Node[] = [
    {
      id: 'ldr_unknown_pin',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: { packageId: 'ldr_light', componentInstanceId: 'hw_ldr' } },
    },
  ];

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_ldr', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
  ];

  // Wire to nonexistent pin 'pin99' on ldr_light
  const schemaEdges: Edge[] = [
    { id: 'se_bad', source: 'board', target: 'hw_ldr', sourceHandle: 'A0', targetHandle: 'pin99' },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, [], schemaNodes, schemaEdges);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D4: Unknown pin connection threw ComponentExpanderError');
  assert(caughtError?.code === 'INSTANCE_UNKNOWN_PIN', 'D4: Error code is strictly INSTANCE_UNKNOWN_PIN');
  assert(caughtError?.message.includes('pin99'), 'D4: Error message references offending pin "pin99"');
}

// ─────────────────────────────────────────────────────────────────
// D5: Missing Required Pin Enforcement
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D5: Missing Required Pin Enforcement ---');
{
  const flowNodes: Node[] = [
    {
      id: 'ldr_missing_pin',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: { packageId: 'ldr_light', componentInstanceId: 'hw_unconnected' } },
    },
  ];

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_unconnected', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
  ];

  // Only connect pin2 (ground), leave required pin1 unconnected
  const schemaEdges: Edge[] = [
    { id: 'se_gnd', source: 'board', target: 'hw_unconnected', sourceHandle: 'GND', targetHandle: 'pin2' },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, [], schemaNodes, schemaEdges);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D5: Missing required pin connection threw ComponentExpanderError');
  assert(caughtError?.code === 'INSTANCE_REQUIRED_PIN_UNCONNECTED', 'D5: Error code is strictly INSTANCE_REQUIRED_PIN_UNCONNECTED');
  assert(caughtError?.message.includes('pin1'), 'D5: Error message references missing required pin "pin1"');
}

// ─────────────────────────────────────────────────────────────────
// D6: Unresolved Placeholder Detection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D6: Unresolved Placeholder Detection ---');
{
  const badTemplatePackage: any = {
    id: 'placeholder_bug_pkg',
    version: '1.0.0',
    metadata: {
      id: 'placeholder_bug_pkg',
      name: 'Buggy Placeholder Component',
      category: 'sensor',
    },
    pins: [
      { id: 'sig', label: 'Signal', signal: 'digital_input', required: true },
    ],
    implementations: {
      generic: {
        strategy: 'graph',
        version: 1,
        entry: 'read_sig',
        exit: 'read_sig',
        graph: {
          entry: 'read_sig',
          exit: 'read_sig',
          nodes: [
            {
              id: 'read_sig',
              type: 'baseNode',
              position: { x: 0, y: 0 },
              data: {
                nodeType: 'digital_read',
                params: {
                  pin: '$SIG',
                  // $UNDECLARED_SECRET has no binding
                  target: '$UNDECLARED_SECRET',
                },
              },
            },
          ],
          edges: [],
        },
      },
    },
  };

  const flowNodes: Node[] = [
    {
      id: 'bug_inst',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'component',
        definition: badTemplatePackage,
        params: { sig: '2' },
      },
    },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, []);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D6: Unresolved placeholder threw ComponentExpanderError');
  assert(caughtError?.code === 'EXPANDED_UNRESOLVED_PLACEHOLDER', 'D6: Error code is strictly EXPANDED_UNRESOLVED_PLACEHOLDER');
  assert(caughtError?.message.includes('$UNDECLARED_SECRET'), 'D6: Error message indicates the unreplaced placeholder "$UNDECLARED_SECRET"');
}

// ─────────────────────────────────────────────────────────────────
// D7: Duplicate Pin Detection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D7: Duplicate Pin Detection ---');
{
  const flowNodes: Node[] = [
    {
      id: 'ldr_dup_pin',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', params: { packageId: 'ldr_light', componentInstanceId: 'hw_dup' } },
    },
  ];

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_dup', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
  ];

  // Two wires both connected to 'pin1' on hw_dup
  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'hw_dup', sourceHandle: 'A0', targetHandle: 'pin1' },
    { id: 'se2', source: 'board', target: 'hw_dup', sourceHandle: 'A1', targetHandle: 'pin1' },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, [], schemaNodes, schemaEdges);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D7: Duplicate pin binding threw ComponentExpanderError');
  assert(caughtError?.code === 'INSTANCE_DUPLICATE_PIN_BINDING', 'D7: Error code is strictly INSTANCE_DUPLICATE_PIN_BINDING');
  assert(caughtError?.message.includes('pin1'), 'D7: Error message references duplicate pin "pin1"');
}

// ─────────────────────────────────────────────────────────────────
// D8: Unknown Output Detection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D8: Unknown Output Detection ---');
{
  const unknownOutputPackage: any = {
    id: 'unknown_output_pkg',
    version: '1.0.0',
    metadata: {
      id: 'unknown_output_pkg',
      name: 'Unknown Output Component',
      category: 'sensor',
    },
    pins: [
      { id: 'sig', label: 'Signal', signal: 'digital_input', required: false },
    ],
    outputs: [
      { id: 'declaredOutput', type: 'int', label: 'Declared Output' },
    ],
    implementations: {
      generic: {
        strategy: 'graph',
        version: 1,
        entry: 'read_node',
        exit: 'ret_node',
        graph: {
          entry: 'read_node',
          exit: 'ret_node',
          nodes: [
            {
              id: 'read_node',
              type: 'baseNode',
              position: { x: 0, y: 0 },
              data: { nodeType: 'digital_read', params: { pin: '2', target: 'tempVar' } },
            },
            {
              id: 'ret_node',
              type: 'baseNode',
              position: { x: 200, y: 0 },
              data: {
                nodeType: 'return',
                // References 'undeclaredOutput' which is NOT in outputs array
                params: { value: 'undeclaredOutput' },
              },
            },
          ],
          edges: [
            { id: 'e1', source: 'read_node', target: 'ret_node', sourceHandle: 'flow', targetHandle: 'flow' },
          ],
        },
      },
    },
  };

  const flowNodes: Node[] = [
    {
      id: 'bad_out_inst',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'component',
        definition: unknownOutputPackage,
        params: { packageId: 'unknown_output_pkg' },
      },
    },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, []);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D8: Return referencing undeclared output threw ComponentExpanderError');
  assert(caughtError?.code === 'INSTANCE_UNKNOWN_OUTPUT', 'D8: Error code is strictly INSTANCE_UNKNOWN_OUTPUT');
  assert(caughtError?.message.includes('undeclaredOutput'), 'D8: Error message indicates undeclared output identifier');
}

// ─────────────────────────────────────────────────────────────────
// D9: Residual Component / Non-expandable Builtin Strategy Rejection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D9: Residual Component Rejection ---');
{
  const builtinPackage: any = {
    id: 'unexpandable_builtin_pkg',
    version: '1.0.0',
    metadata: {
      id: 'unexpandable_builtin_pkg',
      name: 'Unexpandable Builtin Package',
      category: 'actuator',
    },
    pins: [],
    implementations: {
      generic: {
        strategy: 'builtin',
        version: 1,
      },
    },
  };

  const flowNodes: Node[] = [
    {
      id: 'builtin_inst',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: {
        nodeType: 'component',
        definition: builtinPackage,
        params: { packageId: 'unexpandable_builtin_pkg' },
      },
    },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, []);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D9: Non-graph builtin strategy threw ComponentExpanderError');
  assert(caughtError?.code === 'UNEXPANDED_COMPONENT_REMAINING', 'D9: Error code is strictly UNEXPANDED_COMPONENT_REMAINING');
  assert(caughtError?.message.includes('Unexpanded component nodes cannot remain in the pipeline'), 'D9: Error message documents rejection of residual components');
}

// ─────────────────────────────────────────────────────────────────
// D10: Atomic Failure & Caller Immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D10: Atomic Failure & Caller Immutability ---');
{
  const initialValidNode: Node = {
    id: 'valid_ldr',
    type: 'baseNode',
    position: { x: 0, y: 0 },
    data: {
      nodeType: 'component',
      params: { packageId: 'ldr_light', componentInstanceId: 'hw_valid', target: 'lux' },
    },
  };

  const initialInvalidNode: Node = {
    id: 'invalid_ldr',
    type: 'baseNode',
    position: { x: 200, y: 0 },
    data: {
      nodeType: 'component',
      // Missing pin1 connection in schema -> will fail
      params: { packageId: 'ldr_light', componentInstanceId: 'hw_invalid', target: 'lux2' },
    },
  };

  const flowNodes: Node[] = [initialValidNode, initialInvalidNode];
  const flowEdges: Edge[] = [
    { id: 'e1', source: 'valid_ldr', target: 'invalid_ldr', sourceHandle: 'flow', targetHandle: 'flow' },
  ];

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_valid', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
    { id: 'hw_invalid', type: 'componentNode', position: { x: 200, y: 0 }, data: { packageId: 'ldr_light' } },
  ];

  // Only wire hw_valid, leave hw_invalid unrouted
  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'hw_valid', sourceHandle: 'A0', targetHandle: 'pin1' },
  ];

  // Deep snapshot of inputs before call
  const snapshotNodes = JSON.parse(JSON.stringify(flowNodes));
  const snapshotEdges = JSON.parse(JSON.stringify(flowEdges));
  const snapshotSchemaNodes = JSON.parse(JSON.stringify(schemaNodes));
  const snapshotSchemaEdges = JSON.parse(JSON.stringify(schemaEdges));

  let failureOccurred = false;
  try {
    expandComponentGraphs(flowNodes, flowEdges, schemaNodes, schemaEdges);
  } catch (err: any) {
    failureOccurred = true;
    assert(err instanceof ComponentExpanderError, 'D10: Pipeline failed atomically with ComponentExpanderError');
  }

  assert(failureOccurred, 'D10: Execution failed as expected on second invalid component');

  // Verify caller inputs were completely unmutated
  assert(deepEqual(flowNodes, snapshotNodes), 'D10: Caller flowNodes was 100% unmutated');
  assert(deepEqual(flowEdges, snapshotEdges), 'D10: Caller flowEdges was 100% unmutated');
  assert(deepEqual(schemaNodes, snapshotSchemaNodes), 'D10: Caller schemaNodes was 100% unmutated');
  assert(deepEqual(schemaEdges, snapshotSchemaEdges), 'D10: Caller schemaEdges was 100% unmutated');
}

// ─────────────────────────────────────────────────────────────────
// D11: Deterministic Collision Detection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D11: Deterministic Collision Detection ---');
{
  // An outer flow node whose ID collides with the generated ID "ldr_inst_read_analog"
  const collidingNode: Node = {
    id: 'ldr_inst_read_analog',
    type: 'baseNode',
    position: { x: 500, y: 0 },
    data: { nodeType: 'print', params: { message: 'collision' } },
  };

  const compNode: Node = {
    id: 'ldr_inst',
    type: 'baseNode',
    position: { x: 200, y: 0 },
    data: { nodeType: 'component', params: { packageId: 'ldr_light', componentInstanceId: 'hw_col', target: 'val' } },
  };

  const schemaNodes: Node[] = [
    { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
    { id: 'hw_col', type: 'componentNode', position: { x: 100, y: 0 }, data: { packageId: 'ldr_light' } },
  ];
  const schemaEdges: Edge[] = [
    { id: 'se1', source: 'board', target: 'hw_col', sourceHandle: 'A0', targetHandle: 'pin1' },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs([compNode, collidingNode], [], schemaNodes, schemaEdges);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D11: Colliding node ID threw ComponentExpanderError');
  assert(
    caughtError?.code === 'EXPANDED_DUPLICATE_NODE_ID',
    'D11: Detected ID collision and threw EXPANDED_DUPLICATE_NODE_ID'
  );
  assert(caughtError?.message.includes('ldr_inst_read_analog'), 'D11: Error message references the colliding ID');
}

// ─────────────────────────────────────────────────────────────────
// D12: Edge Integrity & Dangling Edge Detection
// ─────────────────────────────────────────────────────────────────
console.log('\n--- D12: Edge Integrity & Dangling Edge Detection ---');
{
  const danglingEdgePackage: any = {
    id: 'dangling_edge_pkg',
    version: '1.0.0',
    metadata: {
      id: 'dangling_edge_pkg',
      name: 'Dangling Edge Component',
      category: 'actuator',
    },
    pins: [],
    implementations: {
      generic: {
        strategy: 'graph',
        version: 1,
        entry: 'n1',
        exit: 'n1',
        graph: {
          entry: 'n1',
          exit: 'n1',
          nodes: [
            { id: 'n1', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'digital_write', params: { pin: '13', value: 'HIGH' } } },
          ],
          edges: [
            // Target 'ghost_node' does not exist in graph!
            { id: 'bad_e', source: 'n1', target: 'ghost_node', sourceHandle: 'flow', targetHandle: 'flow' },
          ],
        },
      },
    },
  };

  const flowNodes: Node[] = [
    {
      id: 'dangling_inst',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'component', definition: danglingEdgePackage, params: { packageId: 'dangling_edge_pkg' } },
    },
  ];

  let caughtError: ComponentExpanderError | null = null;
  try {
    expandComponentGraphs(flowNodes, []);
  } catch (err: any) {
    if (err instanceof ComponentExpanderError) {
      caughtError = err;
    }
  }

  assert(caughtError !== null, 'D12: Dangling edge in subflow threw ComponentExpanderError');
  assert(
    caughtError?.code === 'EXPANDED_DANGLING_EDGE_TARGET',
    'D12: Detected dangling edge and threw EXPANDED_DANGLING_EDGE_TARGET'
  );
  assert(caughtError?.message.includes('ghost_node'), 'D12: Error message references missing target node "ghost_node"');
}

// ─────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────
console.log(`\n==================================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
}
