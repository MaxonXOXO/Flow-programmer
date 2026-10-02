import type { NodeRef, RegionRef } from './relationshipTypes';

// ─────────────────────────────────────────────────────────────────
// 9. Structured Diagnostic Model for Relationship Analysis
// ─────────────────────────────────────────────────────────────────

export type RelationshipDiagnosticSeverity = 'info' | 'warning' | 'error';

/**
 * Machine-readable relationship analysis diagnostic codes.
 * Note: POTENTIAL_RACE_CONDITION is replaced with ORDER_SENSITIVE_BRANCHES
 * because current Flow-IDE execution is single-threaded on Arduino-class MCUs.
 */
export type RelationshipDiagnosticCode =
  | 'RELATIONSHIP_INFO'
  | 'INDEPENDENT_BRANCHES'
  | 'ORDER_SENSITIVE_BRANCHES'
  | 'REACHING_DEF_AMBIGUITY'
  | 'UNREAD_DEFINITION'
  | 'USE_BEFORE_DEF'
  | 'MAYBE_UNDEFINED_USE'
  | 'CIRCULAR_DEPENDENCY'
  | 'CONTROL_CYCLE_DETECTED'
  | 'DATA_DEPENDENCY_CYCLE'
  | 'CALL_CYCLE_DETECTED'
  | 'UNREACHABLE_REGION'
  | 'CONVERGENCE_MISMATCH';

export interface RelationshipDiagnostic {
  readonly code: RelationshipDiagnosticCode | string;
  readonly severity: RelationshipDiagnosticSeverity;
  readonly message: string;
  readonly nodeRefs?: readonly NodeRef[];
  readonly relationshipIds?: readonly string[];
  readonly regionRef?: RegionRef;
  readonly nodeIds?: readonly string[];
  readonly regionId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class RelationshipAnalysisError extends Error {
  public readonly diagnostic: RelationshipDiagnostic;

  constructor(diagnostic: RelationshipDiagnostic) {
    super(`[RelationshipAnalysis] [${diagnostic.code}] ${diagnostic.message}`);
    this.name = 'RelationshipAnalysisError';
    this.diagnostic = diagnostic;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
