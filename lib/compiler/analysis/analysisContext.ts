import type {
  NodeRef,
  RegionRef,
  VariableRef,
  VariableState,
  CallRelationship,
  SideEffectInfo,
  ExecutionConstraint,
  ControlRelationship,
  LoopFixpointContract
} from './relationshipTypes';
import { LOOP_FIXPOINT_CONTRACT } from './relationshipTypes';

// ─────────────────────────────────────────────────────────────────
// 10. Analysis Context Abstraction (Past, Present, Future)
// ─────────────────────────────────────────────────────────────────

/**
 * Semantic context preceding the region under analysis.
 */
export interface PastAnalysisContext {
  /** Predecessor nodes in topological/flow order */
  readonly predecessorNodes: readonly NodeRef[];
  /** Variable definitions available before this region (keyed by scoped variable identifier) */
  readonly availableDefinitions: ReadonlyMap<string, VariableState>;
  /** Active control context stack (enclosing region references) */
  readonly activeControlRegions?: readonly RegionRef[];
  // String compatibility
  readonly predecessorNodeIds?: readonly string[];
}

/**
 * Semantic context local to the region or branch currently being analyzed.
 */
export interface PresentAnalysisContext {
  /** Identifier of the region currently under analysis */
  readonly currentRegion?: RegionRef;
  /** Variable definitions made locally in this region/branch (variable key -> defining nodes) */
  readonly localDefinitions: ReadonlyMap<string, readonly NodeRef[]>;
  /** Variables read or consumed locally in this region/branch */
  readonly localUses: readonly VariableRef[];
  /** Function call relationships invoked within this region/branch */
  readonly calls: readonly CallRelationship[];
  /** Hardware or external side effects produced within this region/branch */
  readonly sideEffects: readonly SideEffectInfo[];
  /** Execution constraints established within this region/branch */
  readonly dependencies: readonly ExecutionConstraint[];
  // String compatibility
  readonly currentRegionId?: string;
}

/**
 * Semantic context succeeding the region under analysis.
 */
export interface FutureAnalysisContext {
  /** Node where control converges or continues after this region */
  readonly continuationNode?: NodeRef;
  /** Downstream consumer nodes or variables */
  readonly downstreamConsumers: readonly (NodeRef | VariableRef)[];
  /** Definitions produced in this region that reach future nodes */
  readonly reachingDefinitionsToFuture: ReadonlyMap<string, readonly NodeRef[]>;
  /** Post-region control relationships */
  readonly postRegionRelationships: readonly ControlRelationship[];
  // String compatibility
  readonly continuationNodeId?: string;
}

/**
 * Three-tier analysis context providing clear separation of Past, Present, and Future.
 */
export interface AnalysisContext {
  readonly past: PastAnalysisContext;
  readonly present: PresentAnalysisContext;
  readonly future: FutureAnalysisContext;
  /** Fixpoint contract governing iterative data-flow analysis */
  readonly fixpointContract: Readonly<LoopFixpointContract>;
}

/**
 * Helper factory to instantiate an immutable AnalysisContext.
 */
export function createAnalysisContext(init: {
  past?: Partial<PastAnalysisContext>;
  present?: Partial<PresentAnalysisContext>;
  future?: Partial<FutureAnalysisContext>;
}): AnalysisContext {
  return {
    past: {
      predecessorNodes: init.past?.predecessorNodes ?? [],
      availableDefinitions: init.past?.availableDefinitions ?? new Map(),
      activeControlRegions: init.past?.activeControlRegions ?? [],
      predecessorNodeIds: init.past?.predecessorNodeIds ?? (init.past?.predecessorNodes?.map(n => n.id) ?? []),
    },
    present: {
      currentRegion: init.present?.currentRegion,
      localDefinitions: init.present?.localDefinitions ?? new Map(),
      localUses: init.present?.localUses ?? [],
      calls: init.present?.calls ?? [],
      sideEffects: init.present?.sideEffects ?? [],
      dependencies: init.present?.dependencies ?? [],
      currentRegionId: init.present?.currentRegionId ?? init.present?.currentRegion?.id,
    },
    future: {
      continuationNode: init.future?.continuationNode,
      downstreamConsumers: init.future?.downstreamConsumers ?? [],
      reachingDefinitionsToFuture: init.future?.reachingDefinitionsToFuture ?? new Map(),
      postRegionRelationships: init.future?.postRegionRelationships ?? [],
      continuationNodeId: init.future?.continuationNodeId ?? init.future?.continuationNode?.id,
    },
    fixpointContract: LOOP_FIXPOINT_CONTRACT,
  };
}
