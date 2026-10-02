import type {
  NodeRef,
  RegionRef,
  BranchRef,
  FunctionRef,
  SemanticEndpointRef,
  SemanticEntityRef,
  RelationshipNode,
  ControlRelationship,
  DataRelationship,
  CallRelationship,
  Region,
  SplitRegion,
  ExecutionConstraint,
  ExecutionOrderingMode,
  SemanticFact
} from './relationshipTypes';
import type { RelationshipDiagnostic } from './relationshipDiagnostics';

// ─────────────────────────────────────────────────────────────────
// Helper Endpoint / Entity Serialization for Indexing
// ─────────────────────────────────────────────────────────────────

export function getEndpointKey(ref: SemanticEndpointRef): string {
  switch (ref.kind) {
    case 'node':
      return `node:${ref.id}`;
    case 'region':
      return `region:${ref.id}`;
    case 'branch':
      return `branch:${ref.regionId}:${ref.branchIndex}:${ref.branchId}`;
  }
}

export function getEntityKey(ref: SemanticEntityRef): string {
  switch (ref.kind) {
    case 'node':
      return `node:${ref.id}`;
    case 'region':
      return `region:${ref.id}`;
    case 'branch':
      return `branch:${ref.regionId}:${ref.branchIndex}:${ref.branchId}`;
    case 'variable':
      return `var:${ref.scope}:${ref.name}`;
    case 'function':
      return `fn:${ref.id}`;
  }
}

function normalizeNodeId(node: NodeRef | string): string {
  return typeof node === 'string' ? node : node.id;
}

function normalizeRegionId(region: RegionRef | string): string {
  return typeof region === 'string' ? region : region.id;
}

function normalizeFunctionId(fn: FunctionRef | string): string {
  return typeof fn === 'string' ? fn : fn.id;
}

// ─────────────────────────────────────────────────────────────────
// 11. Central Program Relationship Model Contract
// ─────────────────────────────────────────────────────────────────

/**
 * Foundational typed semantic model for Phase 6A.6.0-H.
 * Single source of truth for:
 * - ControlFlow (directed edges, incoming derived)
 * - DataFlow (scoped variables, producers and consumers)
 * - CallGraph (caller -> callee, reverse derived)
 * - ExecutionConstraints (MUST_PRECEDE, MAY_PRECEDE)
 * - Derived independence (absence of ordering constraint)
 * - Regions, Facts, and Diagnostics.
 */
export interface ProgramRelationshipModel {
  readonly nodes: ReadonlyMap<string, RelationshipNode>;
  readonly controlFlow: readonly ControlRelationship[];
  readonly dataFlow: readonly DataRelationship[];
  readonly callGraph: readonly CallRelationship[];
  readonly regions: ReadonlyMap<string, Region>;
  readonly executionConstraints: readonly ExecutionConstraint[];
  readonly facts: readonly SemanticFact[];
  readonly diagnostics: readonly RelationshipDiagnostic[];
  readonly orderingMode: ExecutionOrderingMode;

  // Query Accessors
  getNode(ref: NodeRef | string): RelationshipNode | undefined;
  getOutgoingControl(source: NodeRef | string): readonly ControlRelationship[];
  getIncomingControl(target: NodeRef | string): readonly ControlRelationship[];
  getCallees(caller: NodeRef | string): readonly CallRelationship[];
  getCallers(callee: FunctionRef | string): readonly CallRelationship[];
  getDataDependencies(consumer: NodeRef | string): readonly DataRelationship[];
  getDefinitionsByNode(producer: NodeRef | string): readonly DataRelationship[];
  getConstraintsForEndpoint(endpoint: SemanticEndpointRef): readonly ExecutionConstraint[];
  areIndependent(a: SemanticEndpointRef, b: SemanticEndpointRef): boolean;
  getFactsForSubject(subject: SemanticEntityRef): readonly SemanticFact[];
  getRegion(ref: RegionRef | string): Region | undefined;
  getLoweringBranchOrder(splitRegionRef: RegionRef | string): readonly BranchRef[];
}

export interface ProgramRelationshipModelInit {
  nodes?: readonly RelationshipNode[] | ReadonlyMap<string, RelationshipNode>;
  controlFlow?: readonly ControlRelationship[];
  dataFlow?: readonly DataRelationship[];
  callGraph?: readonly CallRelationship[];
  regions?: readonly Region[] | ReadonlyMap<string, Region>;
  executionConstraints?: readonly ExecutionConstraint[];
  facts?: readonly SemanticFact[];
  diagnostics?: readonly RelationshipDiagnostic[];
  orderingMode?: ExecutionOrderingMode;
}

/**
 * Standard immutable implementation of ProgramRelationshipModel with precomputed query indexes.
 */
export class ImmutableProgramRelationshipModel implements ProgramRelationshipModel {
  public readonly nodes: ReadonlyMap<string, RelationshipNode>;
  public readonly controlFlow: readonly ControlRelationship[];
  public readonly dataFlow: readonly DataRelationship[];
  public readonly callGraph: readonly CallRelationship[];
  public readonly regions: ReadonlyMap<string, Region>;
  public readonly executionConstraints: readonly ExecutionConstraint[];
  public readonly facts: readonly SemanticFact[];
  public readonly diagnostics: readonly RelationshipDiagnostic[];
  public readonly orderingMode: ExecutionOrderingMode;

  // Precomputed index caches
  private readonly outgoingControlCache: Map<string, ControlRelationship[]> = new Map();
  private readonly incomingControlCache: Map<string, ControlRelationship[]> = new Map();
  private readonly calleesCache: Map<string, CallRelationship[]> = new Map();
  private readonly callersCache: Map<string, CallRelationship[]> = new Map();
  private readonly dataDepCache: Map<string, DataRelationship[]> = new Map();
  private readonly defsCache: Map<string, DataRelationship[]> = new Map();
  private readonly constraintsCache: Map<string, ExecutionConstraint[]> = new Map();
  private readonly factsCache: Map<string, SemanticFact[]> = new Map();

  constructor(init: ProgramRelationshipModelInit = {}) {
    // 1. Nodes map
    if (init.nodes instanceof Map) {
      this.nodes = new Map(init.nodes);
    } else if (Array.isArray(init.nodes)) {
      const map = new Map<string, RelationshipNode>();
      for (const n of init.nodes) {
        map.set(n.id, n);
      }
      this.nodes = map;
    } else {
      this.nodes = new Map();
    }

    // 2. Control flow (single source of truth: forward directed edges)
    this.controlFlow = Object.freeze([...(init.controlFlow ?? [])]);

    // 3. Data flow (mandatory scope)
    this.dataFlow = Object.freeze([...(init.dataFlow ?? [])]);

    // 4. Call graph (single source of truth: caller -> callee)
    this.callGraph = Object.freeze([...(init.callGraph ?? [])]);

    // 5. Regions map
    if (init.regions instanceof Map) {
      this.regions = new Map(init.regions);
    } else if (Array.isArray(init.regions)) {
      const map = new Map<string, Region>();
      for (const r of init.regions) {
        map.set(r.id, r);
      }
      this.regions = map;
    } else {
      this.regions = new Map();
    }

    // 6. Execution constraints (MUST_PRECEDE, MAY_PRECEDE only - no INDEPENDENT)
    this.executionConstraints = Object.freeze([...(init.executionConstraints ?? [])]);

    // 7. Facts (analytical observations only)
    this.facts = Object.freeze([...(init.facts ?? [])]);

    // 8. Diagnostics
    this.diagnostics = Object.freeze([...(init.diagnostics ?? [])]);

    // 9. Ordering mode
    this.orderingMode = init.orderingMode ?? 'AUTOMATIC';

    // Build index caches for efficient O(1) query lookups
    this.buildIndexCaches();
  }

  private buildIndexCaches(): void {
    // Index forward and derived reverse control flow
    for (const ctrl of this.controlFlow) {
      const srcId = ctrl.source.id;
      const tgtId = ctrl.target.id;

      if (!this.outgoingControlCache.has(srcId)) {
        this.outgoingControlCache.set(srcId, []);
      }
      this.outgoingControlCache.get(srcId)!.push(ctrl);

      // Derived incoming control index
      if (!this.incomingControlCache.has(tgtId)) {
        this.incomingControlCache.set(tgtId, []);
      }
      this.incomingControlCache.get(tgtId)!.push(ctrl);
    }

    // Index caller -> callee and derived callee -> callers
    for (const call of this.callGraph) {
      const callerId = call.caller.id;
      const calleeId = call.callee.id;

      if (!this.calleesCache.has(callerId)) {
        this.calleesCache.set(callerId, []);
      }
      this.calleesCache.get(callerId)!.push(call);

      // Derived callers index
      if (!this.callersCache.has(calleeId)) {
        this.callersCache.set(calleeId, []);
      }
      this.callersCache.get(calleeId)!.push(call);
    }

    // Index data dependencies and definitions
    for (const data of this.dataFlow) {
      if (data.consumer) {
        const consId = data.consumer.id;
        if (!this.dataDepCache.has(consId)) {
          this.dataDepCache.set(consId, []);
        }
        this.dataDepCache.get(consId)!.push(data);
      }
      if (data.producer && (data.kind === 'DEFINES' || data.kind === 'REACHING_DEFINITION')) {
        const prodId = data.producer.id;
        if (!this.defsCache.has(prodId)) {
          this.defsCache.set(prodId, []);
        }
        this.defsCache.get(prodId)!.push(data);
      }
    }

    // Index execution constraints by endpoint keys
    for (const constraint of this.executionConstraints) {
      const beforeKey = getEndpointKey(constraint.before);
      const afterKey = getEndpointKey(constraint.after);

      if (!this.constraintsCache.has(beforeKey)) {
        this.constraintsCache.set(beforeKey, []);
      }
      this.constraintsCache.get(beforeKey)!.push(constraint);

      if (!this.constraintsCache.has(afterKey)) {
        this.constraintsCache.set(afterKey, []);
      }
      this.constraintsCache.get(afterKey)!.push(constraint);
    }

    // Index facts by subject entity key
    for (const fact of this.facts) {
      const subjectKey = getEntityKey(fact.subject);
      if (!this.factsCache.has(subjectKey)) {
        this.factsCache.set(subjectKey, []);
      }
      this.factsCache.get(subjectKey)!.push(fact);
    }
  }

  public getNode(ref: NodeRef | string): RelationshipNode | undefined {
    return this.nodes.get(normalizeNodeId(ref));
  }

  public getOutgoingControl(source: NodeRef | string): readonly ControlRelationship[] {
    return this.outgoingControlCache.get(normalizeNodeId(source)) ?? [];
  }

  /**
   * Derived reverse control-flow query (predecessors).
   * Not stored redundantly; computed via index cache.
   */
  public getIncomingControl(target: NodeRef | string): readonly ControlRelationship[] {
    return this.incomingControlCache.get(normalizeNodeId(target)) ?? [];
  }

  public getCallees(caller: NodeRef | string): readonly CallRelationship[] {
    return this.calleesCache.get(normalizeNodeId(caller)) ?? [];
  }

  /**
   * Derived reverse call-graph query (callers).
   * Not stored redundantly; computed via index cache.
   */
  public getCallers(callee: FunctionRef | string): readonly CallRelationship[] {
    return this.callersCache.get(normalizeFunctionId(callee)) ?? [];
  }

  public getDataDependencies(consumer: NodeRef | string): readonly DataRelationship[] {
    return this.dataDepCache.get(normalizeNodeId(consumer)) ?? [];
  }

  public getDefinitionsByNode(producer: NodeRef | string): readonly DataRelationship[] {
    return this.defsCache.get(normalizeNodeId(producer)) ?? [];
  }

  public getConstraintsForEndpoint(endpoint: SemanticEndpointRef): readonly ExecutionConstraint[] {
    const key = getEndpointKey(endpoint);
    return this.constraintsCache.get(key) ?? [];
  }

  /**
   * Derived independence query.
   * Two endpoints are independent if no constraint requires one to precede the other.
   * Does NOT require or store O(n^2) pairwise independence records.
   */
  public areIndependent(a: SemanticEndpointRef, b: SemanticEndpointRef): boolean {
    const keyA = getEndpointKey(a);
    const keyB = getEndpointKey(b);
    if (keyA === keyB) return false;

    const constraints = this.constraintsCache.get(keyA) ?? [];
    for (const c of constraints) {
      const bKey = getEndpointKey(c.before);
      const aKey = getEndpointKey(c.after);
      if ((bKey === keyA && aKey === keyB) || (bKey === keyB && aKey === keyA)) {
        return false;
      }
    }
    return true;
  }

  public getFactsForSubject(subject: SemanticEntityRef): readonly SemanticFact[] {
    const key = getEntityKey(subject);
    return this.factsCache.get(key) ?? [];
  }

  public getRegion(ref: RegionRef | string): Region | undefined {
    return this.regions.get(normalizeRegionId(ref));
  }

  /**
   * Deterministic lowering order for split branches.
   * When branches are semantically independent, lowering uses the canonically declared
   * branch order (branch_0, branch_1, ...) to produce sequential target code.
   * This emission ordering is purely a lowering mechanism and does NOT introduce a semantic dependency.
   */
  public getLoweringBranchOrder(splitRegionRef: RegionRef | string): readonly BranchRef[] {
    const reg = this.getRegion(splitRegionRef);
    if (!reg || reg.kind !== 'split') return [];
    const splitReg = reg as SplitRegion;
    return [...splitReg.branches]
      .sort((a, b) => a.ref.branchIndex - b.ref.branchIndex)
      .map(b => b.ref);
  }
}

/**
 * Factory helper for creating instances of ProgramRelationshipModel.
 */
export function createProgramRelationshipModel(
  init: ProgramRelationshipModelInit = {}
): ProgramRelationshipModel {
  return new ImmutableProgramRelationshipModel(init);
}
