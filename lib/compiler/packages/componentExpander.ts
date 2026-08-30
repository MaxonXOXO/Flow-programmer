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
    const label = (nodeData?.label || '').toLowerCase();
    if (label.includes('ultrasonic')) {
      pkgResolved = resolvePackageImplementation('ultrasonic_hcsr04', targetId);
    } else if (label.includes('ldr') || label.includes('light')) {
      pkgResolved = resolvePackageImplementation('ldr_light', targetId);
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
 * 2. Performs generic Pin & Variable Binding (maps $TRIG, $ECHO, $PIN1, output variables, and scopes internal variables).
 * 3. Splices the internal subflow nodes/edges directly into the flow graph using explicit B4 entry/exit declarations.
 *
 * If a package does not have an internal graph, it is left intact for builtin generator fallback.
 */
/**
 * Normalizes board pin identifiers.
 * Converts 'D9' -> '9', while preserving 'A0', 'A2', 'GPIO34', etc.
 */
export function normalizePin(p: string | undefined): string {
  if (!p) return '';
  const trimmed = p.trim();
  if (/^d\d+$/i.test(trimmed)) {
    return trimmed.slice(1);
  }
  return trimmed;
}

/**
 * Parses all physical wire connections between the MCU Board and Peripherals in the Schema graph.
 */
export function parseSchemaPinConnections(
  schemaNodes: Node[] = [],
  schemaEdges: Edge[] = []
): {
  connectionsByCompId: Record<string, Record<string, string>>;
  compNodes: Node[];
} {
  const isBoardNode = (n?: Node, edgeEndId?: string): boolean => {
    if (edgeEndId === 'arduino-uno' || edgeEndId === 'board' || edgeEndId === 'uno') return true;
    if (!n) return false;
    return (
      n.type === 'boardNode' ||
      n.type === 'unoNode' ||
      n.id === 'arduino-uno' ||
      n.id === 'board' ||
      n.id === 'uno'
    );
  };

  const connectionsByCompId: Record<string, Record<string, string>> = {};
  const compNodes: Node[] = [];

  schemaNodes.forEach(n => {
    if (!isBoardNode(n, n.id)) {
      compNodes.push(n);
    }
  });

  schemaEdges.forEach(edge => {
    const sourceNode = schemaNodes.find(n => n.id === edge.source);
    const targetNode = schemaNodes.find(n => n.id === edge.target);

    const isSourceBoard = isBoardNode(sourceNode, edge.source);
    const isTargetBoard = isBoardNode(targetNode, edge.target);

    if (isSourceBoard === isTargetBoard) {
      // Both are board nodes or neither is board
      return;
    }

    const boardPin = isSourceBoard ? edge.sourceHandle : edge.targetHandle;
    const compNode = isSourceBoard ? targetNode : sourceNode;
    const compPin = isSourceBoard ? edge.targetHandle : edge.sourceHandle;
    const compId = compNode ? compNode.id : (isSourceBoard ? edge.target : edge.source);

    if (boardPin && compPin && compId) {
      if (!connectionsByCompId[compId]) {
        connectionsByCompId[compId] = {};
      }
      const normalizedCompPin = compPin.trim().toLowerCase();
      const normalizedBoardPin = normalizePin(boardPin);
      connectionsByCompId[compId][normalizedCompPin] = normalizedBoardPin;
      connectionsByCompId[compId][compPin.trim()] = normalizedBoardPin;
    }
  });

  return { connectionsByCompId, compNodes };
}

/**
 * Resolves the physical pin connections for a specific Flow Node by correlating
 * with Schema Canvas component instances.
 */
export function resolveInstancePinsForFlowNode(
  flowNode: Node,
  packageId: string,
  connectionsByCompId: Record<string, Record<string, string>>,
  schemaCompNodes: Node[]
): Record<string, string> {
  const flowData = (flowNode.data || {}) as any;
  const flowNodeId = flowNode.id;
  const explicitCompId = flowData.params?.componentId || flowData.componentId || flowData.params?.componentInstanceId;

  // 1. Direct match on flowNode.id
  if (connectionsByCompId[flowNodeId]) {
    return connectionsByCompId[flowNodeId];
  }

  // 2. Explicit componentId reference
  if (explicitCompId && connectionsByCompId[explicitCompId]) {
    return connectionsByCompId[explicitCompId];
  }

  // 3. Match against schemaCompNodes by schemaNode.id === flowNodeId
  const directSchemaNode = schemaCompNodes.find(n => n.id === flowNodeId);
  if (directSchemaNode && connectionsByCompId[directSchemaNode.id]) {
    return connectionsByCompId[directSchemaNode.id];
  }

  // 4. Match against schemaCompNodes by component type / package ID / label
  const matchingSchemaNodes = schemaCompNodes.filter(n => {
    const sData = (n.data || {}) as any;
    const sType = sData.componentType || sData.nodeType || sData.params?.packageId || sData.packageId || sData.definition?.metadata?.id;
    const sLabel = (sData.label || '').toLowerCase();
    const fLabel = (flowData.label || '').toLowerCase();

    return (
      sType === packageId || 
      sType === flowData.nodeType ||
      (packageId === 'ldr_light' && (sType === 'ldr' || sType === 'ldr_light' || sLabel.includes('ldr') || sLabel.includes('light'))) ||
      (packageId === 'ultrasonic_hcsr04' && (sType === 'ultrasonic' || sType === 'ultrasonic_hcsr04' || sType === 'hcsr04' || sLabel.includes('ultrasonic')))
    );
  });

  if (matchingSchemaNodes.length === 1) {
    const matchedId = matchingSchemaNodes[0].id;
    if (connectionsByCompId[matchedId]) {
      return connectionsByCompId[matchedId];
    }
  } else if (matchingSchemaNodes.length > 1) {
    // Try to match by label first
    const fLabel = (flowData.label || '').toLowerCase();
    const exactLabelMatch = matchingSchemaNodes.find(n => ((n.data as any)?.label || '').toLowerCase() === fLabel);
    if (exactLabelMatch && connectionsByCompId[exactLabelMatch.id]) {
      return connectionsByCompId[exactLabelMatch.id];
    }
    // Try to match by instance ID substring
    const idSubstringMatch = matchingSchemaNodes.find(n => flowNodeId.includes(n.id) || n.id.includes(flowNodeId));
    if (idSubstringMatch && connectionsByCompId[idSubstringMatch.id]) {
      return connectionsByCompId[idSubstringMatch.id];
    }
    // Fallback to first connected matching schema node
    const firstConnected = matchingSchemaNodes.find(n => connectionsByCompId[n.id]);
    if (firstConnected) {
      return connectionsByCompId[firstConnected.id];
    }
  }

  // 5. Fallback to nodeType key
  if (connectionsByCompId[flowData.nodeType]) {
    return connectionsByCompId[flowData.nodeType];
  }

  return {};
}

/**
 * Component Graph Expander
 *
 * Scans a visual flow graph for component package nodes.
 * If a component resolves to an internal subflow graph (from an instance override or package template),
 * this stage:
 * 1. Clones the internal graph nodes & edges with instance-prefixed IDs.
 * 2. Performs generic Pin & Variable Binding (maps $TRIG, $ECHO, $PIN1, output variables, and scopes internal variables).
 * 3. Splices the internal subflow nodes/edges directly into the flow graph using explicit entry/exit declarations.
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

  // Build helper map of schema wiring connections
  const { connectionsByCompId, compNodes: schemaCompNodes } = parseSchemaPinConnections(schemaNodes, schemaEdges);

  flowNodes.forEach(node => {
    const nodeData = node.data as any;
    const instanceId = node.id;
    const sanitizedInstanceId = sanitizeIdentifier(instanceId);
    const params = { ...(nodeData || {}), ...(nodeData?.params || {}) };

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

    // 1. Resolve Pin Bindings ($TRIG, $ECHO, $PIN1, etc.)
    const instancePins = resolveInstancePinsForFlowNode(
      node,
      graphSource.packageId,
      connectionsByCompId,
      schemaCompNodes
    );

    // Dynamic resolution from declared package pins
    if (pkgDef?.pins && Array.isArray(pkgDef.pins)) {
      pkgDef.pins.forEach((pin: any) => {
        const pinId = pin.id; // e.g. 'pin1', 'pin2', 'TRIG', 'ECHO'
        const pinKey = pinId.toLowerCase();

        const boundPin = 
          instancePins[pinKey] ||
          instancePins[pinId] ||
          (pinKey === 'pin1' ? (instancePins['ao'] || instancePins['signal'] || instancePins['pin'] || instancePins['analog']) : undefined) ||
          (pinKey === 'trig' ? (instancePins['trigpin'] || instancePins['trig_pin']) : undefined) ||
          (pinKey === 'echo' ? (instancePins['echopin'] || instancePins['echo_pin']) : undefined) ||
          params[`${pinId}Pin`] ||
          params[`${pinKey}Pin`] ||
          params[pinId] ||
          params[pinKey] ||
          (pinKey === 'pin1' ? (params.pin || params.sensorPin) : undefined) ||
          (pinKey === 'trig' ? (params.trigPin || params.trig) : undefined) ||
          (pinKey === 'echo' ? (params.echoPin || params.echo) : undefined);

        if (boundPin) {
          const upper = pinId.toUpperCase();
          const lower = pinId.toLowerCase();
          const strPin = String(boundPin);
          bindings[`$${upper}`] = strPin;
          bindings[`$${lower}`] = strPin;
          bindings[`$${pinId}`] = strPin;

          // Standard placeholder aliases
          if (pinKey === 'pin1') {
            bindings['$PIN'] = strPin;
            bindings['$pin'] = strPin;
            bindings['$AO'] = strPin;
            bindings['$ao'] = strPin;
            bindings['$SIGNAL'] = strPin;
            bindings['$signal'] = strPin;
          } else if (pinKey === 'trig') {
            bindings['$TRIGPIN'] = strPin;
            bindings['$trigPin'] = strPin;
          } else if (pinKey === 'echo') {
            bindings['$ECHOPIN'] = strPin;
            bindings['$echoPin'] = strPin;
          }
        }
      });
    }

    // Generic fallback for common placeholders if not declared in pkgDef.pins or un-wired
    if (!bindings['$TRIG']) {
      const p = instancePins['trig'] || params.trigPin || params.trig || '9';
      bindings['$TRIG'] = String(p);
      bindings['$trig'] = String(p);
    }
    if (!bindings['$ECHO']) {
      const p = instancePins['echo'] || params.echoPin || params.echo || '10';
      bindings['$ECHO'] = String(p);
      bindings['$echo'] = String(p);
    }
    if (!bindings['$PIN1']) {
      const p = instancePins['pin1'] || params.pin1 || params.pin || params.sensorPin || 'A0';
      bindings['$PIN1'] = String(p);
      bindings['$pin1'] = String(p);
      bindings['$PIN'] = String(p);
      bindings['$pin'] = String(p);
    }

    // 2. Resolve Variable Bindings from declared package outputs
    const outputVarMap: Record<string, string> = {};

    if (pkgDef?.outputs && Array.isArray(pkgDef.outputs) && pkgDef.outputs.length > 0) {
      pkgDef.outputs.forEach((out: any) => {
        const outId = out.id; // e.g. 'lightLevel' or 'distance'
        const capitalized = outId.charAt(0).toUpperCase() + outId.slice(1);
        
        const boundVar = 
          params[`var${capitalized}`] ||
          (outId === 'distance' ? params.varDist : undefined) ||
          (outId === 'lightLevel' ? (params.varLight || params.varLightLevel) : undefined) ||
          params[outId] ||
          params.var ||
          params.target ||
          params.assignTo ||
          outId;

        outputVarMap[outId] = boundVar;
        bindings[outId] = boundVar;
        bindings[`$${outId.toUpperCase()}`] = boundVar;
        bindings[`$${outId}`] = boundVar;
      });
    } else {
      // Fallback for legacy components without outputs array
      const legacyOut = params.varDist || params.varLight || params.var || params.target || 'val';
      outputVarMap['val'] = legacyOut;
      bindings['val'] = legacyOut;
    }

    // 3. Collect internal variables for instance-scoped namespacing
    const internalNodes: Node[] = internalGraph.nodes;
    const internalEdges: Edge[] = internalGraph.edges;

    const outputKeys = new Set(Object.keys(outputVarMap));
    const outputValues = new Set(Object.values(outputVarMap));

    const internalVarNames = new Set<string>();
    internalNodes.forEach(subNode => {
      const p = subNode.data?.params as any;
      if (!p) return;
      if (p.var && typeof p.var === 'string' && !outputKeys.has(p.var) && !outputValues.has(p.var)) {
        internalVarNames.add(p.var);
      }
      if (p.target && typeof p.target === 'string' && !outputKeys.has(p.target) && !outputValues.has(p.target) && (subNode.data as any)?.nodeType !== 'return') {
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
        // Next apply instance scoping to internal variables
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

    // 4. Validate and resolve explicit entry / exit declarations
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

      // For return nodes inside subflow:
      let updatedNodeType = subNodeType;
      if (subNodeType === 'return') {
        const originalVal = ((subNode.data as any)?.params?.value || '') as string;
        const returnedExpr = ((clonedParams as any)?.value || '') as string;

        // Find which output contract variable this return corresponds to
        let mappedTarget = '';
        if (originalVal && outputVarMap[originalVal]) {
          mappedTarget = outputVarMap[originalVal];
        } else if (Object.keys(outputVarMap).length > 0) {
          mappedTarget = Object.values(outputVarMap)[0];
        }

        if (mappedTarget && returnedExpr && mappedTarget !== returnedExpr) {
          // Internal calculation being assigned to target output variable
          updatedNodeType = 'assignment';
          clonedParams.target = mappedTarget;
          clonedParams.expression = returnedExpr;
        } else {
          // If the subflow node already read/assigned directly to mappedTarget (e.g. lightVal = analogRead(A0)),
          // the return node becomes a pass-through start/marker that does not generate redundant assignments.
          updatedNodeType = 'start';
        }
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
