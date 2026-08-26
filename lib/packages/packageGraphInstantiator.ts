import { Node, Edge } from '@xyflow/react';
import { PackageGraphInstance } from '../registry/components/types';
import { getComponentPackage } from '../registry/components';
import { resolvePackageImplementation } from '../compiler/packages/packageResolver';

export interface InstantiatePackageGraphParams {
  packageId: string;
  componentInstanceId?: string;
  targetId?: string;
}

/**
 * Safely extracts and resolves the canonical package ID for any node object
 * from Flow Canvas or Schema Canvas without using display label heuristics.
 */
export function resolveCanonicalPackageId(node: any): string | undefined {
  if (!node) return undefined;
  const data = node.data || {};
  const candidate = 
    data.params?.packageId || 
    data.definition?.packageId || 
    data.definition?.metadata?.id || 
    data.definition?.id || 
    data.packageId || 
    data.nodeType;

  if (!candidate || typeof candidate !== 'string') return undefined;

  const resolved = resolvePackageImplementation(candidate);
  if (resolved && resolved.packageId && resolved.packageId !== 'unknown') {
    const pkg = getComponentPackage(resolved.packageId);
    if (pkg) {
      return resolved.packageId;
    }
  }
  return undefined;
}

/**
 * Deep clones any JavaScript value (objects, arrays, primitives) recursively.
 * Ensures complete reference isolation for instantiated graph components.
 */
export function deepCloneData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepCloneData(item)) as unknown as T;
  }
  const cloned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepCloneData((obj as Record<string, any>)[key]);
  }
  return cloned as T;
}

/**
 * Instantiates an independent, isolated PackageGraphInstance from a package's internal template graph.
 *
 * Checks explicit entry/exit criteria and performs deep-cloning to ensure that neither
 * the original package graph template nor other instances are mutated when this instance changes.
 */
export function instantiatePackageGraph(
  params: InstantiatePackageGraphParams
): PackageGraphInstance {
  const { packageId, componentInstanceId, targetId = 'generic' } = params;

  // 1. Resolve package
  const pkg = getComponentPackage(packageId);
  if (!pkg) {
    throw new Error(`Package "${packageId}" does not exist`);
  }

  // 2. Verify implementation exists (either implementations map or single implementation)
  if (!pkg.implementation && !pkg.implementations) {
    throw new Error(`Package "${packageId}" has no implementation`);
  }

  // 3. Verify implementation contains a graph for the target
  const resolved = resolvePackageImplementation(pkg, targetId);
  const rawGraph = resolved.graph || resolved.subflow;

  if (!rawGraph || !Array.isArray(rawGraph.nodes) || !Array.isArray(rawGraph.edges)) {
    throw new Error(`Package "${packageId}" implementation has no graph for target "${targetId}"`);
  }

  // 4 & 5. Verify entry & exit declarations
  const entry = resolved.entry;
  const exit = resolved.exit;

  if (!entry) {
    throw new Error(`Package "${packageId}" graph has no entry`);
  }
  if (!exit) {
    throw new Error(`Package "${packageId}" graph has no exit`);
  }

  // 6. Verify entry references an existing node
  const entryNode = rawGraph.nodes.find((n: any) => n.id === entry);
  if (!entryNode) {
    throw new Error(`Package "${packageId}" entry references a nonexistent node "${entry}"`);
  }

  // 7. Verify exit references an existing node
  const exitNode = rawGraph.nodes.find((n: any) => n.id === exit);
  if (!exitNode) {
    throw new Error(`Package "${packageId}" exit references a nonexistent node "${exit}"`);
  }

  // Perform deep cloning of nodes & edges
  const clonedNodes: Node[] = deepCloneData(rawGraph.nodes);
  const clonedEdges: Edge[] = deepCloneData(rawGraph.edges);

  return {
    packageId,
    componentInstanceId,
    nodes: clonedNodes,
    edges: clonedEdges,
    entry,
    exit,
    unlocked: false,
    dirty: false,
    targetId: resolved.targetId,
  };
}
