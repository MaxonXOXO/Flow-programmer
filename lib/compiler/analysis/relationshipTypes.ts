import type { Node } from '@xyflow/react';
import type { CanonicalPrimitiveType } from '../packages/packageContract';

// ─────────────────────────────────────────────────────────────────
// 2. Typed Semantic References
// ─────────────────────────────────────────────────────────────────

/**
 * Strongly-typed reference to a graph node.
 */
export interface NodeRef {
  readonly kind: 'node';
  readonly id: string;
}

/**
 * Strongly-typed reference to a control-flow or functional region.
 */
export interface RegionRef {
  readonly kind: 'region';
  readonly id: string;
}

/**
 * Strongly-typed reference to an explicit branch within a region.
 */
export interface BranchRef {
  readonly kind: 'branch';
  readonly regionId: string;
  readonly branchIndex: number;
  readonly branchId: string; // e.g. 'branch_0', 'branch_1'
}

/**
 * Strongly-typed reference to a scoped variable symbol.
 * Data scope is mandatory to prevent accidental collisions across expanded component instances.
 */
export interface VariableRef {
  readonly kind: 'variable';
  readonly name: string;
  readonly scope: string; // MANDATORY: e.g. 'global', 'inst_ultrasonic_1'
}

/**
 * Strongly-typed reference to a declared function.
 */
export interface FunctionRef {
  readonly kind: 'function';
  readonly id: string;
}

/**
 * Union of semantic entities eligible for execution ordering constraints.
 */
export type SemanticEndpointRef = NodeRef | BranchRef | RegionRef;

/**
 * Union of all semantic entities eligible as subjects or objects in analytical facts.
 */
export type SemanticEntityRef = NodeRef | RegionRef | BranchRef | VariableRef | FunctionRef;

// Reference creation factory helpers
export function nodeRef(id: string): NodeRef {
  return { kind: 'node', id };
}

export function regionRef(id: string): RegionRef {
  return { kind: 'region', id };
}

export function branchRef(regionId: string, branchIndex: number, branchId: string): BranchRef {
  return { kind: 'branch', regionId, branchIndex, branchId };
}

export function variableRef(name: string, scope: string): VariableRef {
  return { kind: 'variable', name, scope };
}

export function functionRef(id: string): FunctionRef {
  return { kind: 'function', id };
}

// ─────────────────────────────────────────────────────────────────
// 1. Relationship Node
// ─────────────────────────────────────────────────────────────────

/**
 * Semantic node representation referencing the canonical graph node.
 * Does NOT duplicate the entire graph; links back to the canonical node.
 */
export interface RelationshipNode {
  readonly ref: NodeRef;
  readonly id: string;
  readonly nodeType: CanonicalPrimitiveType | string;
  readonly canonicalNode: Readonly<Node>;
  readonly scope?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────
// 2. Control Relationships (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────

/**
 * Canonical directed control-flow relationship kinds.
 * Only single forward relationships are stored; reverse predecessors are derived via indexes.
 */
export type ControlRelationshipKind =
  | 'SEQUENTIAL_FLOW'
  | 'CONDITIONAL_TRUE'
  | 'CONDITIONAL_FALSE'
  | 'SPLIT_BRANCH'
  | 'CONVERGE_INPUT'
  | 'LOOP_BODY'
  | 'LOOP_EXIT'
  | 'RETURN_FLOW'
  | 'CALL_FLOW'
  | 'CONTINUATION';

export interface ControlRelationship {
  readonly id: string;
  readonly source: NodeRef;
  readonly target: NodeRef;
  readonly kind: ControlRelationshipKind;
  readonly branch?: BranchRef;
  readonly region?: RegionRef;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────
// 3. Data Relationships (Scope is Required)
// ─────────────────────────────────────────────────────────────────

export type DataRelationshipKind =
  | 'DEFINES'
  | 'USES'
  | 'REACHING_DEFINITION'
  | 'DATA_DEPENDENCY';

export interface DataRelationship {
  readonly id: string;
  readonly kind: DataRelationshipKind;
  readonly producer?: NodeRef;
  readonly consumer?: NodeRef;
  readonly variable: VariableRef;
  /** Mandatory scope to ensure expanded component variable namespacing */
  readonly scope: string;
  /** Whether this reaching definition is carried across loop iterations (fixpoint analysis) */
  readonly isLoopCarried?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────
// 4. Call Relationships (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────

/**
 * Canonical call graph relationship kinds.
 * Stored caller -> callee; reverse callees/callers are derived via queries.
 */
export type CallRelationshipKind =
  | 'CALLS'
  | 'RETURNS_TO';

export interface CallRelationship {
  readonly id: string;
  readonly kind: CallRelationshipKind;
  readonly caller: NodeRef;
  readonly callee: FunctionRef;
  readonly calleeNode?: NodeRef;
  readonly scope: string;
  readonly returnContinuation?: NodeRef;
  readonly isRecursive?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────
// 5. Regions
// ─────────────────────────────────────────────────────────────────

export type RegionKind = 'condition' | 'split' | 'loop' | 'block' | 'function';

export interface BaseRegion {
  readonly ref: RegionRef;
  readonly id: string;
  readonly kind: RegionKind;
  readonly entry: NodeRef;
  readonly exit?: NodeRef;
  readonly containedNodes: readonly NodeRef[];
  readonly controlRelationships?: readonly ControlRelationship[];
  readonly externalInputs?: readonly VariableRef[];
  readonly externalOutputs?: readonly VariableRef[];
  readonly definitions?: readonly VariableRef[];
  readonly uses?: readonly VariableRef[];
  readonly dependencies?: readonly ExecutionConstraint[];
}

export interface ConditionRegion extends BaseRegion {
  readonly kind: 'condition';
  readonly conditionNode: NodeRef;
  readonly trueNodes: readonly NodeRef[];
  readonly falseNodes?: readonly NodeRef[];
  readonly continuationNode?: NodeRef;
}

export interface SplitBranchRegion {
  readonly ref: BranchRef;
  readonly rootNode: NodeRef;
  readonly containedNodes: readonly NodeRef[];
  readonly definitions: readonly VariableRef[];
  readonly uses: readonly VariableRef[];
}

export interface SplitRegion extends BaseRegion {
  readonly kind: 'split';
  readonly splitNode: NodeRef;
  readonly branches: readonly SplitBranchRegion[];
  readonly convergeNode?: NodeRef;
}

export interface LoopRegion extends BaseRegion {
  readonly kind: 'loop';
  readonly loopNode: NodeRef;
  readonly bodyNodes: readonly NodeRef[];
  readonly exitNode?: NodeRef;
  /** Flags that data-flow within this loop requires fixpoint iteration */
  readonly requiresFixpointIteration?: boolean;
}

export type Region = ConditionRegion | SplitRegion | LoopRegion | BaseRegion;

// ─────────────────────────────────────────────────────────────────
// 6. Execution Constraints (Independence is Derived, Not Stored)
// ─────────────────────────────────────────────────────────────────

/**
 * Execution constraint kinds.
 * Notice: 'INDEPENDENT' is NOT a constraint kind. Independence is represented by the
 * absence of any ordering constraint between two endpoints.
 */
export type ExecutionConstraintKind =
  | 'MUST_PRECEDE'
  | 'MAY_PRECEDE';

export type ExecutionConstraintReason =
  | 'DATA_DEPENDENCY'
  | 'CONTROL_DEPENDENCY'
  | 'SIDE_EFFECT_DEPENDENCY'
  | 'CALL_DEPENDENCY'
  | 'LOOP_DEPENDENCY'
  | 'EXPLICIT_ORDER';

export interface ExecutionConstraint {
  readonly id: string;
  readonly before: SemanticEndpointRef;
  readonly after: SemanticEndpointRef;
  readonly kind: ExecutionConstraintKind;
  readonly reason: ExecutionConstraintReason;
  readonly scope?: string;
  readonly strength?: 'hard' | 'soft';
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────
// 7. Execution Ordering Mode & Semantic vs. Emission Ordering
// ─────────────────────────────────────────────────────────────────

/**
 * Execution ordering configuration.
 *
 * ARCHITECTURAL RULE: SEMANTIC ORDER VS. EMISSION ORDER
 * - Semantic Independence: If two branches A and B have no semantic constraint between them,
 *   they are semantically independent.
 * - Target Lowering: Target generation (e.g. Arduino C++) may still emit them sequentially
 *   (A then B) because hardware execution is single-threaded.
 * - Deterministic Lowering: When no semantic ordering constraint exists, deterministic lowering
 *   uses the canonical declared branch order (branch_0, branch_1, ...).
 * - Canvas geometry (X, Y), object insertion order, and edge-array order NEVER possess semantic authority.
 */
export type ExecutionOrderingMode = 'AUTOMATIC' | 'EXPLICIT';

// ─────────────────────────────────────────────────────────────────
// 8. Fact Model (Analytical Observations Only, No Duplication)
// ─────────────────────────────────────────────────────────────────

/**
 * Analytical fact kinds.
 * Does NOT duplicate canonical relationships (DEFINES and USES belong strictly to DataRelationship).
 */
export type SemanticFactKind =
  | 'REACHABLE'
  | 'UNREACHABLE'
  | 'DOMINATES'
  | 'POST_DOMINATES'
  | 'MUST_EXECUTE'
  | 'MAY_EXECUTE'
  | 'NEVER_EXECUTES'
  | 'TRUE_BRANCH'
  | 'FALSE_BRANCH'
  | 'SPLIT_BRANCH'
  | 'CONVERGES_AT';

export interface SemanticFact {
  readonly id: string;
  readonly kind: SemanticFactKind;
  readonly subject: SemanticEntityRef;
  readonly object?: SemanticEntityRef;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────
// 9. Loop / Fixpoint Analysis Contract
// ─────────────────────────────────────────────────────────────────

/**
 * Formal contract for loop data-flow analysis (Phase 6A.6.3 preparation).
 *
 * Iterative/Fixpoint Rule:
 * Reaching-definition and data-flow analysis on loops must be iterative:
 *   IN[n]  = merge(OUT[pred])
 *   OUT[n] = transfer(n, IN[n])
 * iterated until the analysis reaches a stable fixpoint.
 *
 * Loop-Carried Definition Rule:
 * Definitions produced inside a loop body that reach uses on subsequent iterations
 * must be supported and must NOT be flagged as USE_BEFORE_DEF merely because
 * the definition node occurs downstream of the use node in textual order.
 */
export interface LoopFixpointContract {
  readonly requiresFixpointIteration: true;
  readonly supportsLoopCarriedDefinitions: true;
}

export const LOOP_FIXPOINT_CONTRACT: Readonly<LoopFixpointContract> = Object.freeze({
  requiresFixpointIteration: true,
  supportsLoopCarriedDefinitions: true,
});

// ─────────────────────────────────────────────────────────────────
// 13. Side Effect Model
// ─────────────────────────────────────────────────────────────────

export type SideEffectType =
  | 'DIGITAL_WRITE'
  | 'ANALOG_WRITE'
  | 'DELAY'
  | 'FUNCTION_CALL'
  | 'SERIAL_PRINT'
  | 'HARDWARE_IO'
  | 'CUSTOM';

export interface SideEffectInfo {
  readonly node: NodeRef;
  readonly type: SideEffectType;
  readonly targetResource?: string; // Pin, port, peripheral
  readonly description?: string;
}

// ─────────────────────────────────────────────────────────────────
// 14. Variable State Contract
// ─────────────────────────────────────────────────────────────────

export type VariableLifecycleState =
  | 'UNDEFINED'
  | 'DEFINED'
  | 'MAYBE_DEFINED';

export type VariableValueClassification =
  | 'KNOWN_VALUE'
  | 'UNKNOWN_VALUE'
  | 'CONSTANT';

export interface VariableState {
  readonly variable: VariableRef;
  readonly lifecycle: VariableLifecycleState;
  readonly classification?: VariableValueClassification;
  readonly definedAtNodes?: readonly NodeRef[];
  readonly lastAssignedValue?: unknown;
}

// ─────────────────────────────────────────────────────────────────
// 15. Execution State Classification
// ─────────────────────────────────────────────────────────────────

export type ExecutionClassification =
  | 'MUST_EXECUTE'
  | 'MAY_EXECUTE'
  | 'NEVER_EXECUTES';

// ─────────────────────────────────────────────────────────────────
// 16. Cycle Model
// ─────────────────────────────────────────────────────────────────

export type RelationshipCycleClassification =
  | 'CONTROL_CYCLE'
  | 'DATA_DEPENDENCY_CYCLE'
  | 'CALL_CYCLE';

export interface RelationshipCycle {
  readonly id: string;
  readonly classification: RelationshipCycleClassification;
  readonly participatingNodes: readonly NodeRef[];
  readonly description?: string;
}
