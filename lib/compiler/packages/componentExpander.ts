import { Node, Edge } from '@xyflow/react';
import { resolvePackageImplementation } from './packageResolver';
import { getComponentPackage } from '../../registry/components';
import { PackageGraphInstance, TargetId } from '../../registry/components/types';

export interface ExpansionResult {
  nodes: Node[];
  edges: Edge[];
  hasExpandedComponents: boolean;
}

export interface ComponentCompilationContext {
  subflowOverrides?: Record<string, PackageGraphInstance>;
  targetId?: TargetId;
}

export interface ResolvedComponentGraphSource {
  source: 'instance' | 'package' | 'builtin';
  packageId: string;
  componentInstanceId?: string;
  graph?: {
    nodes: Node[];
    edges: Edge[];
    entry?: string;
    exit?: string;
  };
  entry?: string;
  exit?: string;
}

/**
 * Deep clone helper to ensure complete immutability.
 */
export function cloneData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cloneData(item)) as unknown as T;
  }
  const cloned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = cloneData((obj as Record<string, any>)[key]);
  }
  return cloned as T;
}

export function cloneNode(node: Node): Node {
  return {
    ...node,
    position: node.position ? { ...node.position } : node.position,
    data: node.data ? cloneData(node.data) : node.data,
  };
}

export function cloneEdge(edge: Edge): Edge {
  return {
    ...edge,
    data: edge.data ? cloneData(edge.data) : edge.data,
  };
}

export function sanitizeIdentifier(id: string): string {
  let s = id.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(s)) {
    s = '_' + s;
  }
  return s;
}

/**
 * Authoritatively resolves the graph source for a component node during compilation:
 * 1. Unlocked / modified subflow instance override in CompilationContext.
 * 2. Pristine Package template graph from COMPONENT_REGISTRY or inline definition.
 * 3. Builtin generator fallback.
 */
export function resolveComponentGraphSource(
  node: Node,
  context?: ComponentCompilationContext
): ResolvedComponentGraphSource {
  const nodeData = node.data as any;
  const nodeType = nodeData?.nodeType || node.type || '';
  const candidate = 
    nodeData?.definition ||
    nodeData?.params?.packageId || 
    nodeData?.packageId || 
    nodeType;

  const targetId = context?.targetId || 'generic';

  // 1. Resolve canonical package implementation
  let pkgResolved = resolvePackageImplementation(candidate, targetId);
  if ((!pkgResolved.graph && !pkgResolved.subflow) || pkgResolved.packageId === 'unknown') {
    const label = nodeData?.label || '';
    if (label.toLowerCase().includes('ultrasonic')) {
      pkgResolved = resolvePackageImplementation('ultrasonic_hcsr04', targetId);
    }
  }

  const packageId = pkgResolved.packageId;
  const componentInstanceId = node.id;

  // 2. Check for matching subflow override in compilation context
  if (context?.subflowOverrides && packageId && packageId !== 'unknown') {
    const expectedDocId = `subflow_${packageId}_${componentInstanceId}`;
    let overrideInstance: PackageGraphInstance | undefined = context.subflowOverrides[expectedDocId] || context.subflowOverrides[componentInstanceId];

    if (!overrideInstance) {
      overrideInstance = Object.values(context.subflowOverrides).find(
        inst => inst.packageId === packageId && inst.componentInstanceId === componentInstanceId
      );
    }

    if (overrideInstance && (overrideInstance.unlocked || overrideInstance.dirty)) {
      if (Array.isArray(overrideInstance.nodes) && overrideInstance.nodes.length > 0) {
        return {
          source: 'instance',
          packageId,
          componentInstanceId,
          graph: {
            nodes: overrideInstance.nodes,
            edges: overrideInstance.edges,
            entry: overrideInstance.entry,
            exit: overrideInstance.exit,
          },
          entry: overrideInstance.entry,
          exit: overrideInstance.exit,
        };
      }
    }
  }

  // 3. Fallback to package template graph
  const packageGraph = pkgResolved.graph || pkgResolved.subflow;
  if (packageGraph && Array.isArray(packageGraph.nodes) && packageGraph.nodes.length > 0) {
    return {
      source: 'package',
      packageId,
      componentInstanceId,
      graph: packageGraph,
      entry: pkgResolved.entry || packageGraph.entry,
      exit: pkgResolved.exit || packageGraph.exit,
    };
  }

  // 4. Fallback to builtin generator
  return {
    source: 'builtin',
    packageId,
    componentInstanceId,
  };
}

/**
 * Component Graph Expander
 *
 * Scans a visual flow graph for component package nodes.
 * If a component resolves to an internal subflow graph (from an instance override or package template),
 * this stage:
 * 1. Clones the internal graph nodes & edges with instance-prefixed IDs.
 * 2. Performs generic Pin & Variable Binding (maps $TRIG, $ECHO, output variables, and scopes internal variables).
 * 3. Splices the internal subflow nodes/edges directly into the flow graph using explicit B4 entry/exit declarations.
 *
 * If a package does not have an internal graph, it is left intact for builtin generator fallback.
 */
export function expandComponentGraphs(
  flowNodes: Node[],
  flowEdges: Edge[],
  schemaNodes: Node[] = [],
  schemaEdges: Edge[] = [],
  context?: ComponentCompilationContext
): ExpansionResult {
  const resultNodes: Node[] = [];
  const resultEdges: Edge[] = flowEdges.map(cloneEdge);
  let hasExpandedComponents = false;

  const normalizePin = (p: string | undefined): string => {
    if (!p) return '';
    return p.trim().replace(/^d/i, '');
  };

  // Build helper map of schema wiring connections
  const pinConnections: Record<string, Record<string, string>> = {};
  schemaEdges.forEach(edge => {
    const isSourceUno = edge.source === 'arduino-uno';
    const compNodeId = isSourceUno ? edge.target : edge.source;
    const compPin = isSourceUno ? edge.targetHandle : edge.sourceHandle;
    const unoPin = isSourceUno ? edge.sourceHandle : edge.targetHandle;

    if (compNodeId && compPin && unoPin) {
      if (!pinConnections[compNodeId]) {
        pinConnections[compNodeId] = {};
      }
      pinConnections[compNodeId][compPin.toLowerCase()] = normalizePin(unoPin);
    }
  });

  flowNodes.forEach(node => {
    const nodeData = node.data as any;
    const nodeType = nodeData?.nodeType || node.type || '';
    const instanceId = node.id;
    const sanitizedInstanceId = sanitizeIdentifier(instanceId);
    const params = nodeData?.params || {};

    // Authoritative source resolution
    const graphSource = resolveComponentGraphSource(node, context);
    const internalGraph = graphSource.graph;

    // Fallback: If no internal subflow graph exists, keep original node for builtin generator
    if (graphSource.source === 'builtin' || !internalGraph || !Array.isArray(internalGraph.nodes) || internalGraph.nodes.length === 0) {
      resultNodes.push(cloneNode(node));
      return;
    }

    // Found package / instance with internal subflow graph -> expand it!
    hasExpandedComponents = true;
    const pkgDef = getComponentPackage(graphSource.packageId) || (nodeData?.definition);

    // Build Generic Variable & Pin Bindings
    const bindings: Record<string, string> = {};

    // 1. Resolve Pin Bindings ($TRIG, $ECHO, etc.)
    const instancePins = pinConnections[instanceId] || pinConnections[nodeType] || {};
    
    // Default fallback mappings for HC-SR04
    const trigPin = instancePins['trig'] || params.trigPin || '9';
    const echoPin = instancePins['echo'] || params.echoPin || '10';
    bindings['$TRIG'] = trigPin;
    bindings['$ECHO'] = echoPin;

    // Generic pin resolution from package pins definition
    if (pkgDef?.pins) {
      pkgDef.pins.forEach((pin: any) => {
        const boundPin = instancePins[pin.id.toLowerCase()] || params[`${pin.id}Pin`] || params[pin.id];
        if (boundPin) {
          bindings[`$${pin.id.toUpperCase()}`] = boundPin;
        }
      });
    }

    // 2. Resolve Variable Bindings (e.g. target output distance variable)
    const varDist = params.varDist || params.var || params.target || 'distance';
    bindings['distance'] = varDist;

    // 3. Collect internal variables for instance-scoped namespacing (B3)
    const internalNodes: Node[] = internalGraph.nodes;
    const internalEdges: Edge[] = internalGraph.edges;

    const internalVarNames = new Set<string>();
    internalNodes.forEach(subNode => {
      const p = subNode.data?.params as any;
      if (!p) return;
      if (p.var && typeof p.var === 'string' && p.var !== varDist && p.var !== 'distance') {
        internalVarNames.add(p.var);
      }
      if (p.target && typeof p.target === 'string' && p.target !== varDist && p.target !== 'distance' && (subNode.data as any)?.nodeType !== 'return') {
        internalVarNames.add(p.target);
      }
    });

    // Helper to recursively substitute bindings in params and expressions
    const applyBindings = (value: any): any => {
      if (typeof value === 'string') {
        let str = value;
        // First apply pin and output bindings
        Object.entries(bindings).forEach(([key, subVal]) => {
          if (str === key) {
            str = subVal;
          } else if (key.startsWith('$')) {
            str = str.replace(new RegExp(`\\${key}\\b`, 'g'), subVal);
          }
        });
        // Next apply instance scoping to internal variables (e.g. duration -> sensor_front_duration)
        internalVarNames.forEach(varName => {
          const scopedVar = `${sanitizedInstanceId}_${varName}`;
          if (str === varName) {
            str = scopedVar;
          } else {
            str = str.replace(new RegExp(`\\b${varName}\\b`, 'g'), scopedVar);
          }
        });
        return str;
      }
      if (Array.isArray(value)) {
        return value.map(v => applyBindings(v));
      }
      if (value && typeof value === 'object') {
        const obj: Record<string, any> = {};
        Object.entries(value).forEach(([k, v]) => {
          obj[k] = applyBindings(v);
        });
        return obj;
      }
      return value;
    };

    // 4. Validate and resolve explicit entry / exit declarations (B4)
    const explicitEntryId = graphSource.entry || internalGraph.entry;
    const explicitExitId = graphSource.exit || internalGraph.exit;

    if (!explicitEntryId) {
      throw new Error(`Component package "${graphSource.packageId}" does not declare an explicit 'entry' node ID.`);
    }
    const entryExists = internalNodes.some(n => n.id === explicitEntryId);
    if (!entryExists) {
      throw new Error(`Component package "${graphSource.packageId}" declares entry node ID "${explicitEntryId}", which does not exist in graph.`);
    }

    if (!explicitExitId) {
      throw new Error(`Component package "${graphSource.packageId}" does not declare an explicit 'exit' node ID.`);
    }
    const exitExists = internalNodes.some(n => n.id === explicitExitId);
    if (!exitExists) {
      throw new Error(`Component package "${graphSource.packageId}" declares exit node ID "${explicitExitId}", which does not exist in graph.`);
    }

    const entrySubNodeId = `${instanceId}_${explicitEntryId}`;
    const exitSubNodeId = `${instanceId}_${explicitExitId}`;

    // Clone internal nodes (excluding 'start')
    const clonedSubNodes: Node[] = [];
    internalNodes.forEach(subNode => {
      const subNodeType = (subNode.data as any)?.nodeType || subNode.type;
      if (subNodeType === 'start' || subNode.id === 'start') return;

      const newId = `${instanceId}_${subNode.id}`;
      const clonedParams = applyBindings(subNode.data?.params || {});

      // For return nodes inside subflow: convert to assignment if output variable mapped
      let updatedNodeType = subNodeType;
      if (subNodeType === 'return') {
        updatedNodeType = 'assignment';
        clonedParams.target = varDist;
        clonedParams.expression = clonedParams.value || varDist;
      }

      clonedSubNodes.push({
        ...subNode,
        id: newId,
        data: {
          ...subNode.data,
          nodeType: updatedNodeType,
          params: clonedParams,
          packageInstanceId: instanceId,
        }
      });
    });

    resultNodes.push(...clonedSubNodes);

    // Clone internal edges
    internalEdges.forEach(subEdge => {
      if (subEdge.source === 'start') return;

      resultEdges.push({
        ...subEdge,
        id: `${instanceId}_${subEdge.id}`,
        source: `${instanceId}_${subEdge.source}`,
        target: `${instanceId}_${subEdge.target}`,
      });
    });

    // Splice main graph edges:
    // 1. Incoming edges targeting instanceId -> redirect to entrySubNodeId
    for (let i = 0; i < resultEdges.length; i++) {
      if (resultEdges[i].target === instanceId) {
        resultEdges[i] = {
          ...resultEdges[i],
          target: entrySubNodeId,
        };
      }
    }

    // 2. Outgoing edges originating from instanceId -> redirect from exitSubNodeId
    for (let i = 0; i < resultEdges.length; i++) {
      if (resultEdges[i].source === instanceId) {
        resultEdges[i] = {
          ...resultEdges[i],
          source: exitSubNodeId,
        };
      }
    }
  });

  return {
    nodes: resultNodes,
    edges: resultEdges,
    hasExpandedComponents,
  };
}
