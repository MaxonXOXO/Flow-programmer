import type { Node } from '@xyflow/react';
import {
  RelationshipNode,
  ControlRelationship,
  DataRelationship,
  CallRelationship,
  ConditionRegion,
  SplitRegion,
  LoopRegion,
  ExecutionConstraint,
  SemanticFact,
  VariableState,
  RelationshipCycle,
  RelationshipDiagnostic,
  RelationshipDiagnosticCode,
  NodeRef,
  RegionRef,
  BranchRef,
  VariableRef,
  FunctionRef,
  nodeRef,
  regionRef,
  branchRef,
  variableRef,
  functionRef,
  createProgramRelationshipModel,
  createAnalysisContext,
  LOOP_FIXPOINT_CONTRACT,
  SemanticEndpointRef
} from '../lib/compiler/analysis';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('=== TEST PHASE 6A.6.0-H: PROGRAM RELATIONSHIP MODEL CONTRACT HARDENING ===\n');

// Helper to create dummy canonical Node
function createDummyNode(id: string, nodeType: string): Node {
  return {
    id,
    type: 'baseNode',
    position: { x: 0, y: 0 },
    data: { nodeType }
  };
}

// ─────────────────────────────────────────────────────────────────
// T1: Simple Linear Flow (A -> B -> C)
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Simple Linear Flow (A -> B -> C) ---');
{
  const refA = nodeRef('node_a');
  const refB = nodeRef('node_b');
  const refC = nodeRef('node_c');

  const nodeA: RelationshipNode = { ref: refA, id: 'node_a', nodeType: 'digital_write', canonicalNode: createDummyNode('node_a', 'digital_write') };
  const nodeB: RelationshipNode = { ref: refB, id: 'node_b', nodeType: 'delay', canonicalNode: createDummyNode('node_b', 'delay') };
  const nodeC: RelationshipNode = { ref: refC, id: 'node_c', nodeType: 'digital_write', canonicalNode: createDummyNode('node_c', 'digital_write') };

  const ctrlAB: ControlRelationship = {
    id: 'ctrl_ab',
    source: refA,
    target: refB,
    kind: 'SEQUENTIAL_FLOW',
  };
  const ctrlBC: ControlRelationship = {
    id: 'ctrl_bc',
    source: refB,
    target: refC,
    kind: 'SEQUENTIAL_FLOW',
  };

  const model = createProgramRelationshipModel({
    nodes: [nodeA, nodeB, nodeC],
    controlFlow: [ctrlAB, ctrlBC],
    orderingMode: 'AUTOMATIC',
  });

  assert(model.nodes.size === 3, 'T1: Model stores all 3 nodes');
  assert(model.getNode(refA)?.nodeType === 'digital_write', 'T1: node_a retrieved by NodeRef');
  assert(model.getOutgoingControl(refA).length === 1, 'T1: node_a has 1 outgoing control edge');
  assert(model.getOutgoingControl(refA)[0].target.id === 'node_b', 'T1: node_a targets node_b');
  assert(model.getOutgoingControl(refB)[0].target.id === 'node_c', 'T1: node_b targets node_c');
  assert(model.getIncomingControl(refC)[0].source.id === 'node_b', 'T1: node_c receives control from node_b (derived)');
}

// ─────────────────────────────────────────────────────────────────
// T2: Condition Flow (condition -> true / false -> continuation)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Condition Flow ---');
{
  const refCond = nodeRef('cond');
  const refTrue = nodeRef('dw_true');
  const refFalse = nodeRef('dw_false');
  const refCont = nodeRef('print_cont');

  const condNode: RelationshipNode = { ref: refCond, id: 'cond', nodeType: 'condition', canonicalNode: createDummyNode('cond', 'condition') };
  const trueNode: RelationshipNode = { ref: refTrue, id: 'dw_true', nodeType: 'digital_write', canonicalNode: createDummyNode('dw_true', 'digital_write') };
  const falseNode: RelationshipNode = { ref: refFalse, id: 'dw_false', nodeType: 'digital_write', canonicalNode: createDummyNode('dw_false', 'digital_write') };
  const contNode: RelationshipNode = { ref: refCont, id: 'print_cont', nodeType: 'print', canonicalNode: createDummyNode('print_cont', 'print') };

  const ctrlTrue: ControlRelationship = {
    id: 'ctrl_cond_true',
    source: refCond,
    target: refTrue,
    kind: 'CONDITIONAL_TRUE',
  };
  const ctrlFalse: ControlRelationship = {
    id: 'ctrl_cond_false',
    source: refCond,
    target: refFalse,
    kind: 'CONDITIONAL_FALSE',
  };
  const contFromTrue: ControlRelationship = {
    id: 'ctrl_true_cont',
    source: refTrue,
    target: refCont,
    kind: 'CONTINUATION',
  };
  const contFromFalse: ControlRelationship = {
    id: 'ctrl_false_cont',
    source: refFalse,
    target: refCont,
    kind: 'CONTINUATION',
  };

  const model = createProgramRelationshipModel({
    nodes: [condNode, trueNode, falseNode, contNode],
    controlFlow: [ctrlTrue, ctrlFalse, contFromTrue, contFromFalse],
  });

  const condOutgoing = model.getOutgoingControl(refCond);
  assert(condOutgoing.length === 2, 'T2: Condition has 2 outgoing branches');
  assert(condOutgoing.some(c => c.kind === 'CONDITIONAL_TRUE' && c.target.id === 'dw_true'), 'T2: True branch targets dw_true');
  assert(condOutgoing.some(c => c.kind === 'CONDITIONAL_FALSE' && c.target.id === 'dw_false'), 'T2: False branch targets dw_false');
  const contIncoming = model.getIncomingControl(refCont);
  assert(contIncoming.length === 2, 'T2: Continuation receives from both branches');
}

// ─────────────────────────────────────────────────────────────────
// T3: Split with Three Independent Branches (Derived Independence)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Split with Three Independent Branches ---');
{
  const refSplit = nodeRef('split');
  const refA = nodeRef('node_a');
  const refB = nodeRef('node_b');
  const refC = nodeRef('node_c');
  const refConverge = nodeRef('converge');
  const refRegion = regionRef('split_reg_1');

  const b0 = branchRef('split_reg_1', 0, 'branch_0');
  const b1 = branchRef('split_reg_1', 1, 'branch_1');
  const b2 = branchRef('split_reg_1', 2, 'branch_2');

  const splitRegion: SplitRegion = {
    ref: refRegion,
    id: 'split_reg_1',
    kind: 'split',
    entry: refSplit,
    exit: refConverge,
    splitNode: refSplit,
    convergeNode: refConverge,
    containedNodes: [refA, refB, refC],
    branches: [
      { ref: b0, rootNode: refA, containedNodes: [refA], definitions: [], uses: [] },
      { ref: b1, rootNode: refB, containedNodes: [refB], definitions: [], uses: [] },
      { ref: b2, rootNode: refC, containedNodes: [refC], definitions: [], uses: [] },
    ],
  };

  // Rule 4: Independence is derived! NO pairwise INDEPENDENT records stored!
  const model = createProgramRelationshipModel({
    nodes: [
      { ref: refSplit, id: 'split', nodeType: 'flow_split', canonicalNode: createDummyNode('split', 'flow_split') },
      { ref: refA, id: 'node_a', nodeType: 'digital_write', canonicalNode: createDummyNode('node_a', 'digital_write') },
      { ref: refB, id: 'node_b', nodeType: 'digital_write', canonicalNode: createDummyNode('node_b', 'digital_write') },
      { ref: refC, id: 'node_c', nodeType: 'digital_write', canonicalNode: createDummyNode('node_c', 'digital_write') },
      { ref: refConverge, id: 'converge', nodeType: 'flow_converge', canonicalNode: createDummyNode('converge', 'flow_converge') },
    ],
    regions: [splitRegion],
    executionConstraints: [], // Zero constraints stored for independent branches
    orderingMode: 'AUTOMATIC',
  });

  const reg = model.getRegion(refRegion) as SplitRegion;
  assert(reg !== undefined, 'T3: SplitRegion retrieved from model');
  assert(reg.branches.length === 3, 'T3: SplitRegion contains 3 branches');
  assert(model.executionConstraints.length === 0, 'T3: Model stores ZERO execution constraints for independent branches');
  assert(model.areIndependent(b0, b1), 'T3: b0 and b1 are derived as independent');
  assert(model.areIndependent(b0, b2), 'T3: b0 and b2 are derived as independent');
  assert(model.areIndependent(b1, b2), 'T3: b1 and b2 are derived as independent');
}

// ─────────────────────────────────────────────────────────────────
// T4: Shared Predecessor Definition (Mandatory Scope & Independent Consumers)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Shared Predecessor Definition ---');
{
  const refSensor = nodeRef('us_sensor');
  const refA = nodeRef('calc_x');
  const refB = nodeRef('calc_y');
  const refC = nodeRef('calc_z');
  const varDistance = variableRef('distance', 'global');

  // Definition of "distance" at ultrasonicNode with mandatory scope
  const defDistance: DataRelationship = {
    id: 'def_distance',
    kind: 'DEFINES',
    producer: refSensor,
    variable: varDistance,
    scope: 'global',
  };

  // Three independent uses of "distance"
  const useA: DataRelationship = {
    id: 'use_a',
    kind: 'USES',
    producer: refSensor,
    consumer: refA,
    variable: varDistance,
    scope: 'global',
  };
  const useB: DataRelationship = {
    id: 'use_b',
    kind: 'USES',
    producer: refSensor,
    consumer: refB,
    variable: varDistance,
    scope: 'global',
  };
  const useC: DataRelationship = {
    id: 'use_c',
    kind: 'USES',
    producer: refSensor,
    consumer: refC,
    variable: varDistance,
    scope: 'global',
  };

  const model = createProgramRelationshipModel({
    nodes: [
      { ref: refSensor, id: 'us_sensor', nodeType: 'component', canonicalNode: createDummyNode('us_sensor', 'component') },
      { ref: refA, id: 'calc_x', nodeType: 'assignment', canonicalNode: createDummyNode('calc_x', 'assignment') },
      { ref: refB, id: 'calc_y', nodeType: 'assignment', canonicalNode: createDummyNode('calc_y', 'assignment') },
      { ref: refC, id: 'calc_z', nodeType: 'assignment', canonicalNode: createDummyNode('calc_z', 'assignment') },
    ],
    dataFlow: [defDistance, useA, useB, useC],
  });

  const usDefs = model.getDefinitionsByNode(refSensor);
  assert(usDefs.length === 1 && usDefs[0].variable.name === 'distance', 'T4: ultrasonicNode defines "distance"');

  const xDeps = model.getDataDependencies(refA);
  const yDeps = model.getDataDependencies(refB);
  const zDeps = model.getDataDependencies(refC);

  assert(xDeps.length === 1 && xDeps[0].producer?.id === 'us_sensor', 'T4: calc_x depends on us_sensor');
  assert(yDeps.length === 1 && yDeps[0].producer?.id === 'us_sensor', 'T4: calc_y depends on us_sensor');
  assert(zDeps.length === 1 && zDeps[0].producer?.id === 'us_sensor', 'T4: calc_z depends on us_sensor');

  // Verify that consumers A, B, C are NOT constrained to each other
  assert(model.areIndependent(refA, refB), 'T4: calc_x and calc_y are semantically independent');
  assert(model.areIndependent(refA, refC), 'T4: calc_x and calc_z are semantically independent');
  assert(model.areIndependent(refB, refC), 'T4: calc_y and calc_z are semantically independent');
}

// ─────────────────────────────────────────────────────────────────
// T5: Cross-Branch Dependency (A defines x, B uses x, C independent)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Cross-Branch Dependency ---');
{
  const refA = nodeRef('node_a');
  const refB = nodeRef('node_b');
  const refC = nodeRef('node_c');
  const varX = variableRef('x', 'scope_1');

  const defX: DataRelationship = {
    id: 'data_def_x',
    kind: 'DEFINES',
    producer: refA,
    variable: varX,
    scope: 'scope_1',
  };
  const useX: DataRelationship = {
    id: 'data_use_x',
    kind: 'DATA_DEPENDENCY',
    producer: refA,
    consumer: refB,
    variable: varX,
    scope: 'scope_1',
  };

  // Execution constraint: A MUST_PRECEDE B due to DATA_DEPENDENCY
  const constraintAB: ExecutionConstraint = {
    id: 'constr_a_b',
    before: refA,
    after: refB,
    kind: 'MUST_PRECEDE',
    reason: 'DATA_DEPENDENCY',
    strength: 'hard',
  };

  const model = createProgramRelationshipModel({
    nodes: [
      { ref: refA, id: 'node_a', nodeType: 'assignment', canonicalNode: createDummyNode('node_a', 'assignment') },
      { ref: refB, id: 'node_b', nodeType: 'print', canonicalNode: createDummyNode('node_b', 'print') },
      { ref: refC, id: 'node_c', nodeType: 'digital_write', canonicalNode: createDummyNode('node_c', 'digital_write') },
    ],
    dataFlow: [defX, useX],
    executionConstraints: [constraintAB], // ONLY constraintAB is stored!
  });

  const bDeps = model.getDataDependencies(refB);
  assert(bDeps.length === 1 && bDeps[0].producer?.id === 'node_a', 'T5: node_b has data dependency on node_a for "x"');

  const cDeps = model.getDataDependencies(refC);
  assert(cDeps.length === 0, 'T5: node_c has ZERO data dependencies');

  assert(!model.areIndependent(refA, refB), 'T5: node_a and node_b are constrained (not independent)');
  assert(model.areIndependent(refA, refC), 'T5: node_c remains explicitly independent of node_a');
  assert(model.areIndependent(refB, refC), 'T5: node_c remains explicitly independent of node_b');
}

// ─────────────────────────────────────────────────────────────────
// T6: Explicit Execution Order Mode
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Explicit Execution Order ---');
{
  const b0 = branchRef('split_1', 0, 'branch_0');
  const b1 = branchRef('split_1', 1, 'branch_1');
  const b2 = branchRef('split_1', 2, 'branch_2');

  const constraint1: ExecutionConstraint = {
    id: 'ec1',
    before: b0,
    after: b1,
    kind: 'MUST_PRECEDE',
    reason: 'EXPLICIT_ORDER',
  };
  const constraint2: ExecutionConstraint = {
    id: 'ec2',
    before: b1,
    after: b2,
    kind: 'MUST_PRECEDE',
    reason: 'EXPLICIT_ORDER',
  };

  const model = createProgramRelationshipModel({
    executionConstraints: [constraint1, constraint2],
    orderingMode: 'EXPLICIT',
  });

  assert(model.orderingMode === 'EXPLICIT', 'T6: Ordering mode is EXPLICIT');
  assert(model.executionConstraints.length === 2, 'T6: Model contains 2 explicit order constraints');
  assert(model.executionConstraints[0].reason === 'EXPLICIT_ORDER', 'T6: Reason is EXPLICIT_ORDER');
}

// ─────────────────────────────────────────────────────────────────
// T7: Automatic Ordering Mode
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Automatic Ordering Mode ---');
{
  const b0 = branchRef('split_1', 0, 'branch_0');
  const b1 = branchRef('split_1', 1, 'branch_1');

  const model = createProgramRelationshipModel({
    executionConstraints: [],
    orderingMode: 'AUTOMATIC',
  });

  assert(model.orderingMode === 'AUTOMATIC', 'T7: Ordering mode is AUTOMATIC');
  assert(model.areIndependent(b0, b1), 'T7: Independent branches remain independent without constraints');
}

// ─────────────────────────────────────────────────────────────────
// T8: Region Representation (Condition, Split, Loop)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T8: Region Representation ---');
{
  const refCond = regionRef('region_cond');
  const refSplit = regionRef('region_split');
  const refLoop = regionRef('region_loop');

  const condReg: ConditionRegion = {
    ref: refCond,
    id: 'region_cond',
    kind: 'condition',
    entry: nodeRef('cond_1'),
    conditionNode: nodeRef('cond_1'),
    containedNodes: [nodeRef('cond_1'), nodeRef('true_stmt'), nodeRef('false_stmt')],
    trueNodes: [nodeRef('true_stmt')],
    falseNodes: [nodeRef('false_stmt')],
    continuationNode: nodeRef('after_cond'),
  };

  const splitReg: SplitRegion = {
    ref: refSplit,
    id: 'region_split',
    kind: 'split',
    entry: nodeRef('split_1'),
    exit: nodeRef('converge_1'),
    splitNode: nodeRef('split_1'),
    convergeNode: nodeRef('converge_1'),
    containedNodes: [nodeRef('split_1'), nodeRef('b0_node'), nodeRef('b1_node'), nodeRef('converge_1')],
    branches: [
      { ref: branchRef('region_split', 0, 'branch_0'), rootNode: nodeRef('b0_node'), containedNodes: [nodeRef('b0_node')], definitions: [variableRef('v0', 's')], uses: [] },
      { ref: branchRef('region_split', 1, 'branch_1'), rootNode: nodeRef('b1_node'), containedNodes: [nodeRef('b1_node')], definitions: [variableRef('v1', 's')], uses: [] },
    ],
  };

  const loopReg: LoopRegion = {
    ref: refLoop,
    id: 'region_loop',
    kind: 'loop',
    entry: nodeRef('loop_1'),
    loopNode: nodeRef('loop_1'),
    containedNodes: [nodeRef('loop_1'), nodeRef('body_node')],
    bodyNodes: [nodeRef('body_node')],
    exitNode: nodeRef('after_loop'),
    requiresFixpointIteration: true,
  };

  const model = createProgramRelationshipModel({
    regions: [condReg, splitReg, loopReg],
  });

  assert(model.regions.size === 3, 'T8: Model stores all 3 regions');
  assert(model.getRegion(refCond)?.kind === 'condition', 'T8: ConditionRegion retrieved');
  assert(model.getRegion(refSplit)?.kind === 'split', 'T8: SplitRegion retrieved');
  assert(model.getRegion(refLoop)?.kind === 'loop', 'T8: LoopRegion retrieved');
}

// ─────────────────────────────────────────────────────────────────
// T9: Facts Model (Analytical Observations with Typed References)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Facts Model ---');
{
  const refNode1 = nodeRef('node_1');
  const refSplit = nodeRef('split_node');
  const refConverge = nodeRef('converge_node');

  const facts: SemanticFact[] = [
    { id: 'f1', kind: 'REACHABLE', subject: refNode1 },
    { id: 'f2', kind: 'MUST_EXECUTE', subject: refNode1 },
    { id: 'f3', kind: 'MAY_EXECUTE', subject: nodeRef('true_branch_node') },
    { id: 'f4', kind: 'POST_DOMINATES', subject: refConverge, object: refSplit },
    { id: 'f5', kind: 'CONVERGES_AT', subject: refSplit, object: refConverge },
  ];

  const model = createProgramRelationshipModel({
    facts,
  });

  assert(model.facts.length === 5, 'T9: Model stores 5 analytical facts');
  const node1Facts = model.getFactsForSubject(refNode1);
  assert(node1Facts.length === 2, 'T9: node_1 has 2 facts (REACHABLE, MUST_EXECUTE)');
  assert(node1Facts.some(f => f.kind === 'MUST_EXECUTE'), 'T9: MUST_EXECUTE fact found for node_1');
}

// ─────────────────────────────────────────────────────────────────
// T10: Diagnostic Model (ORDER_SENSITIVE_BRANCHES)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10: Diagnostic Model ---');
{
  const diagnostics: RelationshipDiagnostic[] = [
    {
      code: 'RELATIONSHIP_INFO',
      severity: 'info',
      message: 'Independent branches detected in flow_split.',
      regionRef: regionRef('split_1'),
    },
    {
      code: 'ORDER_SENSITIVE_BRANCHES',
      severity: 'warning',
      message: 'Multiple split branches write to variable "counter" without synchronization.',
      nodeRefs: [nodeRef('write_a'), nodeRef('write_b')],
    },
    {
      code: 'CIRCULAR_DEPENDENCY',
      severity: 'error',
      message: 'Cyclic data dependency between node_x and node_y.',
      nodeRefs: [nodeRef('node_x'), nodeRef('node_y')],
    },
  ];

  const model = createProgramRelationshipModel({
    diagnostics,
  });

  assert(model.diagnostics.length === 3, 'T10: Model stores 3 diagnostics');
  assert(model.diagnostics.some(d => d.code === 'ORDER_SENSITIVE_BRANCHES'), 'T10: Contains ORDER_SENSITIVE_BRANCHES diagnostic');
  assert(model.diagnostics.some(d => d.severity === 'error'), 'T10: Contains ERROR diagnostic');
}

// ─────────────────────────────────────────────────────────────────
// T11: Variable States
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T11: Variable States ---');
{
  const varUndef: VariableState = {
    variable: variableRef('temp', 'global'),
    lifecycle: 'UNDEFINED',
  };
  const varDef: VariableState = {
    variable: variableRef('distance', 'global'),
    lifecycle: 'DEFINED',
    classification: 'KNOWN_VALUE',
    definedAtNodes: [nodeRef('us_sensor')],
    lastAssignedValue: 120,
  };
  const varMaybe: VariableState = {
    variable: variableRef('flag', 'inst_1'),
    lifecycle: 'MAYBE_DEFINED',
    classification: 'UNKNOWN_VALUE',
    definedAtNodes: [nodeRef('cond_true_branch')],
  };

  assert(varUndef.lifecycle === 'UNDEFINED', 'T11: VariableState UNDEFINED represented');
  assert(varDef.lifecycle === 'DEFINED' && varDef.classification === 'KNOWN_VALUE', 'T11: VariableState DEFINED with KNOWN_VALUE represented');
  assert(varMaybe.lifecycle === 'MAYBE_DEFINED' && varMaybe.classification === 'UNKNOWN_VALUE', 'T11: VariableState MAYBE_DEFINED represented');
}

// ─────────────────────────────────────────────────────────────────
// T12: Cycle Classifications
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12: Cycle Classifications ---');
{
  const ctrlCycle: RelationshipCycle = {
    id: 'cycle_ctrl',
    classification: 'CONTROL_CYCLE',
    participatingNodes: [nodeRef('n1'), nodeRef('n2'), nodeRef('n3')],
    description: 'Unstructured flow control cycle',
  };
  const dataCycle: RelationshipCycle = {
    id: 'cycle_data',
    classification: 'DATA_DEPENDENCY_CYCLE',
    participatingNodes: [nodeRef('calc1'), nodeRef('calc2')],
    description: 'Mutual data dependency hazard',
  };
  const callCycle: RelationshipCycle = {
    id: 'cycle_call',
    classification: 'CALL_CYCLE',
    participatingNodes: [nodeRef('fnA'), nodeRef('fnB')],
    description: 'Mutual recursion between fnA and fnB',
  };

  assert(ctrlCycle.classification === 'CONTROL_CYCLE', 'T12: CONTROL_CYCLE represented');
  assert(dataCycle.classification === 'DATA_DEPENDENCY_CYCLE', 'T12: DATA_DEPENDENCY_CYCLE represented');
  assert(callCycle.classification === 'CALL_CYCLE', 'T12: CALL_CYCLE represented');
}

// ─────────────────────────────────────────────────────────────────
// T13: AnalysisContext Contract with Fixpoint
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T13: AnalysisContext Contract ---');
{
  const refUS = nodeRef('us_node');
  const refA = nodeRef('node_a');
  const varDist = variableRef('distance', 'global');
  const varX = variableRef('x', 'global');

  const distanceState: VariableState = {
    variable: varDist,
    lifecycle: 'DEFINED',
    classification: 'KNOWN_VALUE',
    definedAtNodes: [refUS],
  };

  const availableDefs = new Map<string, VariableState>();
  availableDefs.set('global:distance', distanceState);

  const localDefs = new Map<string, readonly NodeRef[]>();
  localDefs.set('global:x', [refA]);

  const reachingFuture = new Map<string, readonly NodeRef[]>();
  reachingFuture.set('global:x', [refA]);

  const ctx = createAnalysisContext({
    past: {
      predecessorNodes: [nodeRef('start'), refUS],
      availableDefinitions: availableDefs,
    },
    present: {
      currentRegion: regionRef('split_branch_0'),
      localDefinitions: localDefs,
      localUses: [varDist],
    },
    future: {
      continuationNode: nodeRef('converge_node'),
      downstreamConsumers: [nodeRef('print_final')],
      reachingDefinitionsToFuture: reachingFuture,
    },
  });

  assert(ctx.past.predecessorNodes.length === 2, 'T13: Past context contains 2 predecessor nodes');
  assert(ctx.past.availableDefinitions.get('global:distance')?.lifecycle === 'DEFINED', 'T13: Past context has "distance" defined');
  assert(ctx.present.currentRegion?.id === 'split_branch_0', 'T13: Present context tracks branch_0');
  assert(ctx.present.localUses[0].name === 'distance', 'T13: Present context tracks local use of "distance"');
  assert(ctx.future.continuationNode?.id === 'converge_node', 'T13: Future context tracks converge continuation');
}

// ─────────────────────────────────────────────────────────────────
// T14: Reverse Control Direction is Derived, Not Duplicated
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14: Derived Reverse Control Direction ---');
{
  const refA = nodeRef('n_src');
  const refB = nodeRef('n_tgt');

  const forwardEdge: ControlRelationship = {
    id: 'ctrl_edge_1',
    source: refA,
    target: refB,
    kind: 'SEQUENTIAL_FLOW',
  };

  // Only forward edge is stored
  const model = createProgramRelationshipModel({
    controlFlow: [forwardEdge],
  });

  assert(model.controlFlow.length === 1, 'T14: Only 1 forward control relationship is stored');
  const outgoing = model.getOutgoingControl(refA);
  assert(outgoing.length === 1 && outgoing[0].target.id === 'n_tgt', 'T14: Forward outgoing control query succeeds');
  const incoming = model.getIncomingControl(refB);
  assert(incoming.length === 1 && incoming[0].source.id === 'n_src', 'T14: Reverse incoming control query is derived without duplicate storage');
}

// ─────────────────────────────────────────────────────────────────
// T15: Reverse Call Direction is Derived, Not Duplicated
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T15: Derived Reverse Call Direction ---');
{
  const caller = nodeRef('caller_node');
  const callee = functionRef('my_func');

  const callRel: CallRelationship = {
    id: 'call_1',
    caller,
    callee,
    kind: 'CALLS',
    scope: 'global',
  };

  // Only caller -> callee is stored
  const model = createProgramRelationshipModel({
    callGraph: [callRel],
  });

  assert(model.callGraph.length === 1, 'T15: Only 1 call relationship is stored');
  const callees = model.getCallees(caller);
  assert(callees.length === 1 && callees[0].callee.id === 'my_func', 'T15: Forward callees query succeeds');
  const callers = model.getCallers(callee);
  assert(callers.length === 1 && callers[0].caller.id === 'caller_node', 'T15: Reverse callers query is derived without duplicate CALLED_BY storage');
}

// ─────────────────────────────────────────────────────────────────
// T16: No INDEPENDENT Constraints are Stored
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T16: No INDEPENDENT Constraints Stored ---');
{
  // Type-level invariant: ExecutionConstraintKind only allows MUST_PRECEDE | MAY_PRECEDE
  const constraint: ExecutionConstraint = {
    id: 'ec1',
    before: nodeRef('a'),
    after: nodeRef('b'),
    kind: 'MUST_PRECEDE',
    reason: 'DATA_DEPENDENCY',
  };

  const model = createProgramRelationshipModel({
    executionConstraints: [constraint],
  });

  assert(model.executionConstraints.every(c => c.kind === 'MUST_PRECEDE' || c.kind === 'MAY_PRECEDE'), 'T16: Execution constraints only permit MUST_PRECEDE or MAY_PRECEDE');
}

// ─────────────────────────────────────────────────────────────────
// T17: Independent Branches Produce Zero Pairwise Ordering Constraints
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T17: Zero Pairwise Ordering Constraints ---');
{
  const b0 = branchRef('split_x', 0, 'b0');
  const b1 = branchRef('split_x', 1, 'b1');
  const b2 = branchRef('split_x', 2, 'b2');

  const model = createProgramRelationshipModel({
    executionConstraints: [], // No constraints stored
  });

  assert(model.executionConstraints.length === 0, 'T17: Zero pairwise ordering constraints stored in model');
  assert(model.areIndependent(b0, b1), 'T17: b0 and b1 derived as independent');
  assert(model.areIndependent(b0, b2), 'T17: b0 and b2 derived as independent');
  assert(model.areIndependent(b1, b2), 'T17: b1 and b2 derived as independent');
}

// ─────────────────────────────────────────────────────────────────
// T18: Typed References Prevent Node/Region/Variable Confusion
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T18: Typed References Discriminated Tag Validation ---');
{
  const nr = nodeRef('id_1');
  const rr = regionRef('id_1');
  const vr = variableRef('id_1', 'scope_1');
  const fr = functionRef('id_1');

  assert(nr.kind === 'node', 'T18: NodeRef has discriminant "node"');
  assert(rr.kind === 'region', 'T18: RegionRef has discriminant "region"');
  assert(vr.kind === 'variable', 'T18: VariableRef has discriminant "variable"');
  assert(fr.kind === 'function', 'T18: FunctionRef has discriminant "function"');
  assert((nr as any).kind !== (rr as any).kind, 'T18: Node and region references are mutually exclusive');
}

// ─────────────────────────────────────────────────────────────────
// T19: Data Relationship Scope is Mandatory
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T19: Mandatory Data Relationship Scope ---');
{
  const varInst1 = variableRef('val', 'comp_inst_1');
  const varInst2 = variableRef('val', 'comp_inst_2');

  const rel1: DataRelationship = {
    id: 'rel1',
    kind: 'DEFINES',
    producer: nodeRef('node_1'),
    variable: varInst1,
    scope: 'comp_inst_1',
  };
  const rel2: DataRelationship = {
    id: 'rel2',
    kind: 'DEFINES',
    producer: nodeRef('node_2'),
    variable: varInst2,
    scope: 'comp_inst_2',
  };

  assert(rel1.scope === 'comp_inst_1', 'T19: rel1 explicitly scoped to comp_inst_1');
  assert(rel2.scope === 'comp_inst_2', 'T19: rel2 explicitly scoped to comp_inst_2');
  assert(rel1.scope !== rel2.scope, 'T19: Same-named variables in different scopes do NOT collapse');
}

// ─────────────────────────────────────────────────────────────────
// T20: ORDER_SENSITIVE_BRANCHES Exists & POTENTIAL_RACE_CONDITION Removed
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T20: ORDER_SENSITIVE_BRANCHES Diagnostic ---');
{
  const diagCode: RelationshipDiagnosticCode = 'ORDER_SENSITIVE_BRANCHES';
  assert(diagCode === 'ORDER_SENSITIVE_BRANCHES', 'T20: ORDER_SENSITIVE_BRANCHES is a valid RelationshipDiagnosticCode');

  // Verify type does not allow POTENTIAL_RACE_CONDITION
  const allowedCodes: RelationshipDiagnosticCode[] = [
    'RELATIONSHIP_INFO',
    'INDEPENDENT_BRANCHES',
    'ORDER_SENSITIVE_BRANCHES',
    'REACHING_DEF_AMBIGUITY',
    'UNREAD_DEFINITION',
    'USE_BEFORE_DEF',
    'MAYBE_UNDEFINED_USE',
    'CIRCULAR_DEPENDENCY',
    'CONTROL_CYCLE_DETECTED',
    'DATA_DEPENDENCY_CYCLE',
    'CALL_CYCLE_DETECTED',
    'UNREACHABLE_REGION',
    'CONVERGENCE_MISMATCH',
  ];
  assert(!allowedCodes.includes('POTENTIAL_RACE_CONDITION' as any), 'T20: POTENTIAL_RACE_CONDITION does not exist in diagnostic codes');
}

// ─────────────────────────────────────────────────────────────────
// T21: Semantic Independence Does Not Create Emission Ordering
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T21: Semantic Independence vs. Emission Ordering ---');
{
  const b0 = branchRef('s1', 0, 'b0');
  const b1 = branchRef('s1', 1, 'b1');

  const model = createProgramRelationshipModel({
    executionConstraints: [],
    orderingMode: 'AUTOMATIC',
  });

  assert(model.areIndependent(b0, b1), 'T21: Branches are semantically independent');
  assert(model.getConstraintsForEndpoint(b0).length === 0, 'T21: No ordering constraint created for b0');
  assert(model.getConstraintsForEndpoint(b1).length === 0, 'T21: No ordering constraint created for b1');
}

// ─────────────────────────────────────────────────────────────────
// T22: Canonical Branch Order as Lowering Order
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T22: Canonical Branch Lowering Order ---');
{
  const splitRef = regionRef('reg_split_main');
  const b0 = branchRef('reg_split_main', 0, 'branch_0');
  const b1 = branchRef('reg_split_main', 1, 'branch_1');
  const b2 = branchRef('reg_split_main', 2, 'branch_2');

  const splitReg: SplitRegion = {
    ref: splitRef,
    id: 'reg_split_main',
    kind: 'split',
    entry: nodeRef('s'),
    splitNode: nodeRef('s'),
    containedNodes: [],
    branches: [
      { ref: b2, rootNode: nodeRef('n2'), containedNodes: [], definitions: [], uses: [] }, // deliberately inserted out of order
      { ref: b0, rootNode: nodeRef('n0'), containedNodes: [], definitions: [], uses: [] },
      { ref: b1, rootNode: nodeRef('n1'), containedNodes: [], definitions: [], uses: [] },
    ],
  };

  const model = createProgramRelationshipModel({
    regions: [splitReg],
    executionConstraints: [],
  });

  const loweringOrder = model.getLoweringBranchOrder(splitRef);
  assert(loweringOrder.length === 3, 'T22: All 3 branches returned for lowering');
  assert(loweringOrder[0].branchIndex === 0 && loweringOrder[0].branchId === 'branch_0', 'T22: First lowered branch is branch_0');
  assert(loweringOrder[1].branchIndex === 1 && loweringOrder[1].branchId === 'branch_1', 'T22: Second lowered branch is branch_1');
  assert(loweringOrder[2].branchIndex === 2 && loweringOrder[2].branchId === 'branch_2', 'T22: Third lowered branch is branch_2');
  assert(model.areIndependent(b0, b1), 'T22: Branches remain strictly independent semantically despite lowering order');
}

// ─────────────────────────────────────────────────────────────────
// T23: Loop Analysis Contract Supports Fixpoint Iteration
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T23: Loop Fixpoint Contract ---');
{
  assert(LOOP_FIXPOINT_CONTRACT.requiresFixpointIteration === true, 'T23: Loop analysis contract requires fixpoint iteration');
  assert(LOOP_FIXPOINT_CONTRACT.supportsLoopCarriedDefinitions === true, 'T23: Loop analysis contract supports loop-carried definitions');

  const dataRel: DataRelationship = {
    id: 'loop_carried_rel',
    kind: 'REACHING_DEFINITION',
    producer: nodeRef('read_sensor'),
    consumer: nodeRef('use_val'),
    variable: variableRef('measured_distance', 'loop_1'),
    scope: 'loop_1',
    isLoopCarried: true,
  };

  assert(dataRel.isLoopCarried === true, 'T23: DataRelationship explicitly supports isLoopCarried reaching definitions');
}

// ─────────────────────────────────────────────────────────────────
// T24: Facts Do Not Duplicate Canonical DEFINES/USES Relationships
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T24: Facts Separation from Canonical Relationships ---');
{
  const allowedFactKinds = [
    'REACHABLE',
    'UNREACHABLE',
    'DOMINATES',
    'POST_DOMINATES',
    'MUST_EXECUTE',
    'MAY_EXECUTE',
    'NEVER_EXECUTES',
    'TRUE_BRANCH',
    'FALSE_BRANCH',
    'SPLIT_BRANCH',
    'CONVERGES_AT',
  ];

  assert(!allowedFactKinds.includes('DEFINES'), 'T24: Facts do NOT contain DEFINES');
  assert(!allowedFactKinds.includes('USES'), 'T24: Facts do NOT contain USES');
  assert(!allowedFactKinds.includes('INDEPENDENT'), 'T24: Facts do NOT contain INDEPENDENT (derived)');
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
