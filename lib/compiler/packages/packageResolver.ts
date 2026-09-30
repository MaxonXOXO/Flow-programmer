import { 
  ComponentPackage, 
  PackageDefinition, 
  PackageImplementation, 
  ImplementationStrategy,
  TargetId,
  TargetImplementation,
  CanonicalComponentDefinition,
  ComponentDependencies
} from '../../registry/components/types';
import { getComponentPackage } from '../../registry/components';
import { CANONICAL_PRIMITIVE_TYPES } from './packageContract';

const CANONICAL_PRIMITIVES_SET: ReadonlySet<string> = new Set(CANONICAL_PRIMITIVE_TYPES);

// ─────────────────────────────────────────────────────────────────
// Resolver Error Definitions
// ─────────────────────────────────────────────────────────────────

export type ResolverErrorCode =
  | 'PACKAGE_NOT_FOUND'
  | 'INVALID_PACKAGE_REFERENCE'
  | 'UNSUPPORTED_TARGET'
  | 'INVALID_IMPLEMENTATION';

export class PackageResolverError extends Error {
  public readonly code: ResolverErrorCode;
  public readonly packageId: string;
  public readonly targetId?: TargetId;

  constructor(code: ResolverErrorCode, packageId: string, message: string, targetId?: TargetId) {
    super(`[PackageResolver] [${code}] Unexpanded component node encountered: ${message}`);
    this.name = 'PackageResolverError';
    this.code = code;
    this.packageId = packageId;
    this.targetId = targetId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─────────────────────────────────────────────────────────────────
// Resolved Package Implementation Interface
// ─────────────────────────────────────────────────────────────────

export interface ResolvedPackageImplementation {
  /** Resolved execution strategy */
  strategy: ImplementationStrategy;
  /** Version of the implementation schema */
  version: number;
  /** Entry point if applicable */
  entry?: string;
  /** Exit point if applicable */
  exit?: string;
  /** Subflow graph data (nodes & edges) if applicable */
  subflow?: {
    nodes: any[];
    edges: any[];
    entry?: string;
    exit?: string;
  };
  /** Alias for subflow graph */
  graph?: {
    nodes: any[];
    edges: any[];
    entry?: string;
    exit?: string;
  };
  /** Target-specific compilation dependencies if resolved */
  dependencies?: ComponentDependencies;
  /** Native template or generator metadata if available */
  native?: Record<string, unknown>;
  /** Package unique identifier */
  packageId: string;
  /** Target identifier used for resolution */
  targetId: TargetId;
}

// ─────────────────────────────────────────────────────────────────
// Canonical Package Resolver
// ─────────────────────────────────────────────────────────────────

/**
 * Resolves a canonical ComponentPackage by exact package ID from the registry.
 * Does NOT perform fuzzy matching, substring matching, or alias guessing.
 * Throws PackageResolverError if packageId is invalid or not registered.
 */
export function resolvePackage(packageId: string): ComponentPackage {
  if (!packageId || typeof packageId !== 'string' || packageId.trim() === '') {
    throw new PackageResolverError(
      'INVALID_PACKAGE_REFERENCE',
      packageId || 'unknown',
      'Package ID must be a non-empty string.'
    );
  }

  const trimmedId = packageId.trim();
  const pkg = getComponentPackage(trimmedId);

  if (!pkg) {
    throw new PackageResolverError(
      'PACKAGE_NOT_FOUND',
      trimmedId,
      `Component package "${trimmedId}" is not registered.`
    );
  }

  return pkg;
}

/**
 * Resolves the implementation strategy and configuration for a Component Package or Package ID
 * against a specific target MCU architecture (defaults to 'generic').
 *
 * Deterministic target selection order:
 * 1. pkg.implementations[targetId]
 * 2. pkg.implementations['generic']
 * 3. pkg.implementations['default']
 * 4. pkg.implementation
 *
 * Throws PackageResolverError on resolution failures:
 * - INVALID_PACKAGE_REFERENCE: invalid input reference or missing package id
 * - PACKAGE_NOT_FOUND: package ID not found in canonical registry
 * - UNSUPPORTED_TARGET: package does not support requested target and has no generic fallback
 * - INVALID_IMPLEMENTATION: target implementation missing required strategy/subflow
 */
export function resolvePackageImplementation(
  pkgOrId: ComponentPackage | PackageDefinition | CanonicalComponentDefinition | string,
  targetId: TargetId = 'generic'
): ResolvedPackageImplementation {
  if (!pkgOrId) {
    throw new PackageResolverError(
      'INVALID_PACKAGE_REFERENCE',
      'unknown',
      'Cannot resolve package implementation from null or undefined reference.'
    );
  }

  let pkg: ComponentPackage | PackageDefinition | CanonicalComponentDefinition;
  let packageId: string;

  if (typeof pkgOrId === 'string') {
    // If a canonical language primitive was passed (e.g. from expander scanning flow nodes),
    // primitives are handled directly by the compiler backend generator (strategy: 'builtin').
    if (CANONICAL_PRIMITIVES_SET.has(pkgOrId)) {
      return {
        strategy: 'builtin',
        version: 1,
        packageId: pkgOrId,
        targetId,
      };
    }

    pkg = resolvePackage(pkgOrId);
    packageId = pkg.id || (pkg as any).metadata?.id || pkgOrId;
  } else if (typeof pkgOrId === 'object') {
    pkg = pkgOrId;
    packageId = (pkg as any).id || (pkg as any).metadata?.id;
    if (!packageId || typeof packageId !== 'string' || packageId.trim() === '') {
      throw new PackageResolverError(
        'INVALID_PACKAGE_REFERENCE',
        'unknown',
        'Package definition object is missing a valid id or metadata.id.'
      );
    }
  } else {
    throw new PackageResolverError(
      'INVALID_PACKAGE_REFERENCE',
      'unknown',
      `Expected package ID string or package definition object, received: ${typeof pkgOrId}`
    );
  }

  // Deterministic target-aware implementation resolution
  let impl: TargetImplementation | PackageImplementation | undefined;

  if (pkg.implementations && typeof pkg.implementations === 'object') {
    impl = pkg.implementations[targetId] ||
           pkg.implementations['generic'] ||
           pkg.implementations['default'];
  }

  if (!impl && pkg.implementation && typeof pkg.implementation === 'object') {
    impl = pkg.implementation;
  }

  if (!impl) {
    throw new PackageResolverError(
      'UNSUPPORTED_TARGET',
      packageId,
      `Component package "${packageId}" does not support target "${targetId}" and provides no generic implementation.`,
      targetId
    );
  }

  // Normalize strategy: prefer impl.strategy, fallback to impl.type mapping
  const VALID_STRATEGIES: ReadonlySet<string> = new Set(['builtin', 'subflow', 'graph', 'native']);
  let strategy: ImplementationStrategy;
  const rawType = (impl as any).type;
  if (impl.strategy && VALID_STRATEGIES.has(impl.strategy)) {
    strategy = impl.strategy;
  } else if (rawType === 'subflow' || rawType === 'graph') {
    strategy = 'graph';
  } else if (rawType === 'native') {
    strategy = 'native';
  } else if (rawType === 'builtin') {
    strategy = 'builtin';
  } else {
    throw new PackageResolverError(
      'INVALID_IMPLEMENTATION',
      packageId,
      `Implementation for package "${packageId}" (target: "${targetId}") has an invalid strategy: "${impl.strategy || rawType}".`,
      targetId
    );
  }

  // Parse and validate subflow graph if strategy is 'graph'
  let parsedSubflow: { nodes: any[]; edges: any[]; entry?: string; exit?: string } | undefined = undefined;
  const rawGraph = impl.graph || impl.subflow;

  if (strategy === 'graph') {
    if (!rawGraph || typeof rawGraph !== 'object') {
      throw new PackageResolverError(
        'INVALID_IMPLEMENTATION',
        packageId,
        `Graph implementation for package "${packageId}" (target: "${targetId}") is missing required graph or subflow definition.`,
        targetId
      );
    }
    const s = rawGraph as any;
    if (!Array.isArray(s.nodes) || !Array.isArray(s.edges)) {
      throw new PackageResolverError(
        'INVALID_IMPLEMENTATION',
        packageId,
        `Graph implementation for package "${packageId}" (target: "${targetId}") has invalid nodes or edges (must be arrays).`,
        targetId
      );
    }
    parsedSubflow = {
      nodes: s.nodes,
      edges: s.edges,
      entry: s.entry || impl.entry,
      exit: s.exit || impl.exit,
    };
  } else if (rawGraph && typeof rawGraph === 'object') {
    const s = rawGraph as any;
    if (Array.isArray(s.nodes) && Array.isArray(s.edges)) {
      parsedSubflow = {
        nodes: s.nodes,
        edges: s.edges,
        entry: s.entry || impl.entry,
        exit: s.exit || impl.exit,
      };
    }
  }

  const entry = impl.entry || parsedSubflow?.entry;
  const exit = impl.exit || parsedSubflow?.exit;

  return {
    strategy,
    version: impl.version || 1,
    entry,
    exit,
    subflow: parsedSubflow,
    graph: parsedSubflow,
    dependencies: impl.dependencies || (pkg as any)?.dependencies,
    native: impl.native,
    packageId,
    targetId,
  };
}
