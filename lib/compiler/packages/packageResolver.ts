import { ComponentPackage, PackageDefinition, PackageImplementation, ImplementationStrategy } from '../../registry/components/types';
import { getComponentPackage } from '../../registry/components';

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
  /** Package unique identifier */
  packageId: string;
}

/**
 * Resolves the implementation strategy and configuration for a Component Package or Package ID.
 *
 * The compiler should query this resolver instead of inspecting component IDs or labels directly.
 */
export function resolvePackageImplementation(
  pkgOrId: ComponentPackage | PackageDefinition | string
): ResolvedPackageImplementation {
  let pkg: ComponentPackage | PackageDefinition | undefined;
  let packageId = 'unknown';

  if (typeof pkgOrId === 'string') {
    packageId = pkgOrId;
    pkg = getComponentPackage(pkgOrId);
    
    // Also support matching by common sensor key aliases if needed
    if (!pkg) {
      if (pkgOrId.includes('ultrasonic') || pkgOrId === 'hcsr04') {
        pkg = getComponentPackage('ultrasonic_hcsr04');
      }
    }
  } else {
    pkg = pkgOrId;
    packageId = (pkg as any).id || pkg.metadata?.id || 'unknown';
  }

  const impl: PackageImplementation = pkg?.implementation || { strategy: 'builtin', version: 1 };

  // Normalize strategy: prefer impl.strategy, fallback to impl.type mapping, default to 'builtin'
  let strategy: ImplementationStrategy = 'builtin';
  if (impl.strategy) {
    strategy = impl.strategy;
  } else if (impl.type === 'subflow') {
    strategy = 'subflow';
  } else if (impl.type === 'native') {
    strategy = 'native';
  } else {
    strategy = 'builtin';
  }

  let parsedSubflow: { nodes: any[]; edges: any[]; entry?: string; exit?: string } | undefined = undefined;
  const rawGraph = impl.graph || impl.subflow;
  if (rawGraph && typeof rawGraph === 'object') {
    const s = rawGraph as any;
    if (Array.isArray(s.nodes) && Array.isArray(s.edges)) {
      parsedSubflow = {
        nodes: s.nodes,
        edges: s.edges,
        entry: s.entry,
        exit: s.exit,
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
    packageId,
  };
}
