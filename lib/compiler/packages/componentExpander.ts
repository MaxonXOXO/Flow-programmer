import { Node, Edge } from '@xyflow/react';
import { resolvePackageImplementation } from './packageResolver';
import { getComponentPackage } from '../../registry/components';

export interface ExpansionResult {
  nodes: Node[];
  edges: Edge[];
  hasExpandedComponents: boolean;
}

/**
 * Component Graph Expander
 *
 * Scans a visual flow graph for component package nodes.
 * If a package declares an internal subflow graph (e.g., HC-SR04), this stage:
 * 1. Clones the internal graph nodes & edges with instance-prefixed IDs.
 * 2. Performs generic Pin & Variable Binding (maps $TRIG, $ECHO, output variables).
 * 3. Splices the internal subflow nodes/edges directly into the flow graph.
 *
 * If a package does not have an internal graph, it is left intact for builtin generator fallback.
 */
export function expandComponentGraphs(
  flowNodes: Node[],
  flowEdges: Edge[],
  schemaNodes: Node[] = [],
  schemaEdges: Edge[] = []
): ExpansionResult {
  const resultNodes: Node[] = [];
  const resultEdges: Edge[] = [...flowEdges];
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
    const label = nodeData?.label || '';

    // Determine package ID candidate
    let packageId = nodeData?.params?.packageId || nodeType;
    let pkgResolved = resolvePackageImplementation(packageId);

    if ((!pkgResolved.graph && !pkgResolved.subflow) || pkgResolved.packageId === 'unknown') {
      // Try resolving by label
      if (label.toLowerCase().includes('ultrasonic')) {
        pkgResolved = resolvePackageImplementation('ultrasonic_hcsr04');
      }
    }

    const internalGraph = pkgResolved.graph || pkgResolved.subflow;

    // Fallback: If no internal subflow graph exists, keep original node for builtin generator
    if (!internalGraph || !Array.isArray(internalGraph.nodes) || internalGraph.nodes.length === 0) {
      resultNodes.push(node);
      return;
    }

    // Found package with internal subflow graph -> expand it!
    hasExpandedComponents = true;
    const instanceId = node.id;
    const params = nodeData?.params || {};
    const pkgDef = getComponentPackage(pkgResolved.packageId);

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
      pkgDef.pins.forEach(pin => {
        const boundPin = instancePins[pin.id.toLowerCase()] || params[`${pin.id}Pin`] || params[pin.id];
        if (boundPin) {
          bindings[`$${pin.id.toUpperCase()}`] = boundPin;
        }
      });
    }

    // 2. Resolve Variable Bindings (e.g. target output distance variable)
    const varDist = params.varDist || params.var || params.target || 'distance';
    bindings['distance'] = varDist;

    // Helper to recursively substitute bindings in params and expressions
    const applyBindings = (value: any): any => {
      if (typeof value === 'string') {
        let str = value;
        Object.entries(bindings).forEach(([key, subVal]) => {
          if (str === key) {
            str = subVal;
          } else if (key.startsWith('$')) {
            str = str.replace(new RegExp(`\\${key}\\b`, 'g'), subVal);
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

    // Locate internal subflow entry node (after 'start') and return/exit node
    const internalNodes: Node[] = internalGraph.nodes;
    const internalEdges: Edge[] = internalGraph.edges;

    const startNode = internalNodes.find(n => (n.data as any)?.nodeType === 'start' || n.type === 'start' || n.id === 'start');
    const firstEdgeAfterStart = internalEdges.find(e => e.source === startNode?.id);
    const entrySubNodeId = firstEdgeAfterStart ? `${instanceId}_${firstEdgeAfterStart.target}` : undefined;

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
      if (subEdge.source === startNode?.id) return;

      resultEdges.push({
        ...subEdge,
        id: `${instanceId}_${subEdge.id}`,
        source: `${instanceId}_${subEdge.source}`,
        target: `${instanceId}_${subEdge.target}`,
      });
    });

    // Find exit node of subflow to connect to downstream flow
    const returnNode = internalNodes.find(n => (n.data as any)?.nodeType === 'return');
    const calcNode = internalNodes.find(n => subNodeIdIsExit(n, internalEdges));
    const exitSubNodeId = `${instanceId}_${returnNode?.id || calcNode?.id || internalNodes[internalNodes.length - 1].id}`;

    // Splice main graph edges:
    // 1. Incoming edges targeting instanceId -> redirect to entrySubNodeId
    if (entrySubNodeId) {
      for (let i = 0; i < resultEdges.length; i++) {
        if (resultEdges[i].target === instanceId) {
          resultEdges[i] = {
            ...resultEdges[i],
            target: entrySubNodeId,
          };
        }
      }
    }

    // 2. Outgoing edges originating from instanceId -> redirect from exitSubNodeId
    if (exitSubNodeId) {
      for (let i = 0; i < resultEdges.length; i++) {
        if (resultEdges[i].source === instanceId) {
          resultEdges[i] = {
            ...resultEdges[i],
            source: exitSubNodeId,
          };
        }
      }
    }
  });

  return {
    nodes: resultNodes,
    edges: resultEdges,
    hasExpandedComponents,
  };
}

function subNodeIdIsExit(node: Node, edges: Edge[]): boolean {
  const isSource = edges.some(e => e.source === node.id);
  return !isSource;
}
