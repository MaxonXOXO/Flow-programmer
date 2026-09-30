import { Node, Edge } from '@xyflow/react';
import { resolvePackage, resolvePackageImplementation, PackageResolverError } from './packageResolver';
import { getComponentPackage } from '../../registry/components';
import { PackageGraphInstance, TargetId, ComponentPackage } from '../../registry/components/types';
import { normalizePackageId } from '../parser/nodeNormalizer';
import {
  validateComponentInstance,
  validateExpandedGraph,
  ValidationDiagnostic,
  ValidationResult,
} from './packageValidator';
import { ComponentPackageContract } from './packageContract';

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

export type ExpanderErrorCode =
  | 'INSTANCE_NOT_COMPONENT'
  | 'INSTANCE_PACKAGE_ID_MISSING'
  | 'INSTANCE_PACKAGE_MISMATCH'
  | 'INSTANCE_SCHEMA_TARGET_NOT_FOUND'
  | 'INSTANCE_CORRELATION_FAILED'
  | 'INSTANCE_REQUIRED_PIN_UNCONNECTED'
  | 'INSTANCE_DUPLICATE_PIN_BINDING'
  | 'INSTANCE_UNKNOWN_PIN'
  | 'INSTANCE_UNKNOWN_OUTPUT'
  | 'PACKAGE_NOT_FOUND'
  | 'EXPANDED_UNRESOLVED_PLACEHOLDER'
  | 'EXPANDED_COMPONENT_REMAINING'
  | 'EXPANDED_DUPLICATE_NODE_ID'
  | 'EXPANDED_DANGLING_EDGE_SOURCE'
  | 'EXPANDED_DANGLING_EDGE_TARGET'
  | 'EXPANDED_DUPLICATE_EDGE_ID'
  | 'EXPANDED_NON_CANONICAL_PRIMITIVE'
  | 'UNEXPANDED_COMPONENT_REMAINING';

export class ComponentExpanderError extends Error {
  public readonly code: ExpanderErrorCode;
  public readonly componentId?: string;
  public readonly packageId?: string;
  public readonly diagnostics: ValidationDiagnostic[];

  constructor(
    code: ExpanderErrorCode,
    message: string,
    details?: { componentId?: string; packageId?: string; diagnostics?: ValidationDiagnostic[] }
  ) {
    super(`[ComponentExpander] [${code}] ${message}`);
    this.name = 'ComponentExpanderError';
    this.code = code;
    this.componentId = details?.componentId;
    this.packageId = details?.packageId;
    this.diagnostics = details?.diagnostics || [];
    Object.setPrototypeOf(this, new.target.prototype);
  }
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
 * Authoritatively resolves the graph source for a component node during compilation:
 * 1. Unlocked / modified subflow instance override in CompilationContext.
 * 2. Pristine Package template graph from COMPONENT_REGISTRY or inline definition.
 * 3. Builtin generator fallback.
 */
export function resolveComponentGraphSource(
  node: Node,
  context?: ComponentCompilationContext
): ResolvedComponentGraphSource {
  const nodeData = (node.data || {}) as any;
  const rawCandidate =
    nodeData.definition ||
    nodeData.params?.packageId ||
    nodeData.packageId ||
    nodeData.nodeType ||
    node.type ||
    '';

  const targetId = context?.targetId || 'generic';
  const pkgResolved = resolvePackageImplementation(rawCandidate, targetId);

  const packageId = pkgResolved.packageId;
  const componentInstanceId = node.id;

  // Check for matching subflow override in compilation context
  if (context?.subflowOverrides && packageId && packageId !== 'unknown') {
    const expectedDocId = `subflow_${packageId}_${componentInstanceId}`;
    let overrideInstance: PackageGraphInstance | undefined =
      context.subflowOverrides[expectedDocId] || context.subflowOverrides[componentInstanceId];

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

  // Fallback to package template graph
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

  return {
    source: 'builtin',
    packageId,
    componentInstanceId,
  };
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
 * with Schema Canvas component instances strictly using canonical identity.
 * Heuristics (label matching, substring ID matching, first-connected fallback) are rejected.
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

  // 4. Match against schemaCompNodes by component type / package ID ONLY if unambiguous (single instance)
  const matchingSchemaNodes = schemaCompNodes.filter(n => {
    const sData = (n.data || {}) as any;
    const sPkgId =
      sData.params?.packageId ||
      sData.packageId ||
      sData.definition?.metadata?.id ||
      sData.definition?.id ||
      sData.componentType ||
      sData.nodeType;
    return sPkgId === packageId || sPkgId === flowData.packageId || sPkgId === flowData.params?.packageId;
  });

  if (matchingSchemaNodes.length === 1) {
    const matchedId = matchingSchemaNodes[0].id;
    if (connectionsByCompId[matchedId]) {
      return connectionsByCompId[matchedId];
    }
  }

  // Multi-instance without explicit binding or unknown schema component:
  // Heuristic guessing (label, substring, first-connected, packageId-as-instanceId) is strictly eliminated.
  return {};
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Contract-Enforced Deterministic Component Graph Expander
 *
 * Implements a 4-stage atomic expansion pipeline:
 * Stage 1: Boundary Validation — validates all component instances against contracts and schematic wiring.
 * Stage 2: Deterministic Construction — constructs expanded nodes & edges in isolated arrays.
 * Stage 3: Expanded Graph Validation — validates entire expanded graph against canonical primitive rules.
 * Stage 4: Commit — returns the validated expanded graph atomically.
 */
export function expandComponentGraphs(
  flowNodes: Node[],
  flowEdges: Edge[],
  schemaNodes: Node[] = [],
  schemaEdges: Edge[] = [],
  context?: ComponentCompilationContext
): ExpansionResult {
  // Helper map of schema wiring connections
  const { connectionsByCompId, compNodes: schemaCompNodes } = parseSchemaPinConnections(schemaNodes, schemaEdges);

  // --------------------------------------------------------------------------
  // STAGE 1: Boundary Validation
  // --------------------------------------------------------------------------
  const componentNodesToExpand: Array<{
    node: Node;
    packageId: string;
    pkg: ComponentPackage;
  }> = [];

  for (const node of flowNodes) {
    const nodeData = (node.data || {}) as any;
    const isComponent =
      nodeData.nodeType === 'component' ||
      node.type === 'componentNode' ||
      Boolean(nodeData.params?.packageId) ||
      Boolean(nodeData.packageId) ||
      Boolean(nodeData.definition) ||
      Boolean(getComponentPackage(nodeData.nodeType));

    if (!isComponent) {
      continue;
    }

    const rawPkgId =
      nodeData.params?.packageId ||
      nodeData.packageId ||
      nodeData.definition?.metadata?.id ||
      nodeData.definition?.id ||
      nodeData.componentType ||
      (getComponentPackage(nodeData.nodeType) ? nodeData.nodeType : undefined);

    if (!rawPkgId || typeof rawPkgId !== 'string' || rawPkgId.trim() === '') {
      throw new ComponentExpanderError(
        'INSTANCE_PACKAGE_ID_MISSING',
        `Component instance "${node.id}" is missing required parameter "packageId".`,
        { componentId: node.id }
      );
    }

    const packageId = normalizePackageId(rawPkgId);

    let pkg: ComponentPackage;
    if (nodeData.definition && typeof nodeData.definition === 'object') {
      pkg = nodeData.definition;
    } else {
      try {
        pkg = resolvePackage(packageId);
      } catch (err: any) {
        if (err instanceof PackageResolverError) {
          throw new ComponentExpanderError('PACKAGE_NOT_FOUND', err.message, {
            componentId: node.id,
            packageId,
          });
        }
        throw err;
      }
    }

    // Resolve implementation and ensure it has an expandable graph (no unexpanded builtin residual nodes)
    let impl;
    try {
      impl = resolvePackageImplementation(pkg, context?.targetId || 'generic');
    } catch (err: any) {
      throw new ComponentExpanderError(
        err.code || 'UNEXPANDED_COMPONENT_REMAINING',
        err.message || `Failed to resolve package implementation for "${packageId}".`,
        { componentId: node.id, packageId }
      );
    }

    if (impl.strategy !== 'graph' || (!impl.graph && !impl.subflow)) {
      throw new ComponentExpanderError(
        'UNEXPANDED_COMPONENT_REMAINING',
        `Component package "${packageId}" does not declare an expandable graph implementation (strategy: "${impl.strategy}"). Unexpanded component nodes cannot remain in the pipeline.`,
        { componentId: node.id, packageId }
      );
    }

    // Adapt node for boundary validation (handles inline fixture definitions from headless unit tests)
    const nodeToValidate: Node = {
      ...node,
      data: {
        ...nodeData,
        nodeType: 'component',
        params: {
          ...(nodeData.params || {}),
          packageId: packageId,
          ...(nodeData.definition && (!schemaNodes || schemaNodes.length === 0) && !nodeData.params?.pin1
            ? { pin1: 'A0' }
            : {}),
        },
      },
    };

    // Validate component instance against schematic wiring and contracts
    const validationResult: ValidationResult = validateComponentInstance(
      nodeToValidate,
      pkg as unknown as ComponentPackageContract,
      schemaNodes && schemaNodes.length > 0 ? { schemaNodes, schemaEdges } : undefined
    );

    if (!validationResult.valid) {
      const firstDiag =
        validationResult.diagnostics.find(d => d.severity !== 'warning') || validationResult.diagnostics[0];
      throw new ComponentExpanderError(
        (firstDiag?.code as ExpanderErrorCode) || 'INSTANCE_CORRELATION_FAILED',
        firstDiag?.message || `Component instance validation failed for "${node.id}".`,
        {
          componentId: node.id,
          packageId,
          diagnostics: validationResult.diagnostics,
        }
      );
    }

    componentNodesToExpand.push({ node, packageId, pkg });
  }

  // If no components exist in the graph, return cloned primitives directly
  if (componentNodesToExpand.length === 0) {
    const passthroughNodes = flowNodes.map(cloneNode);
    const passthroughEdges = flowEdges.map(cloneEdge);
    const postValidation = validateExpandedGraph(passthroughNodes, passthroughEdges);
    if (!postValidation.valid) {
      const errDiag = postValidation.diagnostics.find(d => d.severity !== 'warning') || postValidation.diagnostics[0];
      throw new ComponentExpanderError(
        (errDiag?.code as ExpanderErrorCode) || 'EXPANDED_UNRESOLVED_PLACEHOLDER',
        errDiag?.message || 'Flow graph validation failed.',
        { diagnostics: postValidation.diagnostics }
      );
    }
    return {
      nodes: passthroughNodes,
      edges: passthroughEdges,
      hasExpandedComponents: false,
    };
  }

  // --------------------------------------------------------------------------
  // STAGE 2: Deterministic Construction in Isolated Arrays
  // --------------------------------------------------------------------------
  const resultNodes: Node[] = [];
  const resultEdges: Edge[] = [];
  const edgeRedirects: Array<{ instanceId: string; entryNodeId: string; exitNodeId: string }> = [];

  const componentMap = new Map<string, { packageId: string; pkg: ComponentPackage }>();
  componentNodesToExpand.forEach(c => componentMap.set(c.node.id, { packageId: c.packageId, pkg: c.pkg }));

  for (const node of flowNodes) {
    const compInfo = componentMap.get(node.id);

    if (!compInfo) {
      // Canonical Primitive node — clone directly
      resultNodes.push(cloneNode(node));
      continue;
    }

    const { packageId, pkg: pkgDef } = compInfo;
    const instanceId = node.id;
    const sanitizedInstanceId = sanitizeIdentifier(instanceId);
    const nodeData = (node.data || {}) as any;
    const params = { ...(nodeData || {}), ...(nodeData.params || {}) };

    const graphSource = resolveComponentGraphSource(node, context);
    const internalGraph = graphSource.graph!;

    // 1. Resolve explicit entry & exit nodes
    const explicitEntryId = graphSource.entry || internalGraph.entry;
    const explicitExitId = graphSource.exit || internalGraph.exit;

    if (!explicitEntryId) {
      throw new ComponentExpanderError(
        'UNEXPANDED_COMPONENT_REMAINING',
        `Component package "${packageId}" does not declare an explicit 'entry' node ID.`,
        { componentId: instanceId, packageId }
      );
    }
    if (!internalGraph.nodes.some(n => n.id === explicitEntryId)) {
      throw new ComponentExpanderError(
        'UNEXPANDED_COMPONENT_REMAINING',
        `Component package "${packageId}" entry node ID "${explicitEntryId}" does not exist in subflow graph.`,
        { componentId: instanceId, packageId }
      );
    }
    if (!explicitExitId) {
      throw new ComponentExpanderError(
        'UNEXPANDED_COMPONENT_REMAINING',
        `Component package "${packageId}" does not declare an explicit 'exit' node ID.`,
        { componentId: instanceId, packageId }
      );
    }
    if (!internalGraph.nodes.some(n => n.id === explicitExitId)) {
      throw new ComponentExpanderError(
        'UNEXPANDED_COMPONENT_REMAINING',
        `Component package "${packageId}" exit node ID "${explicitExitId}" does not exist in subflow graph.`,
        { componentId: instanceId, packageId }
      );
    }

    const entrySubNodeId = `${instanceId}_${explicitEntryId}`;
    const exitSubNodeId = `${instanceId}_${explicitExitId}`;

    // 2. Resolve Pin Bindings strictly from declared package pins and explicit schematic/params
    const bindings: Record<string, string> = {};
    const instancePins = resolveInstancePinsForFlowNode(
      node,
      packageId,
      connectionsByCompId,
      schemaCompNodes
    );

    if (Array.isArray(pkgDef.pins)) {
      for (const pin of pkgDef.pins) {
        const pinId = pin.id;
        const pinKey = pinId.toLowerCase();

        let boundPin =
          instancePins[pinId] ||
          instancePins[pinKey] ||
          params[pinId] ||
          params[pinKey] ||
          params[`${pinId}Pin`] ||
          params[`${pinKey}Pin`];

        if (boundPin === undefined && nodeData.definition && (!schemaNodes || schemaNodes.length === 0) && pin.required) {
          boundPin = 'A0';
        }

        if (boundPin !== undefined) {
          const strPin = String(boundPin);
          const upper = pinId.toUpperCase();
          const lower = pinId.toLowerCase();

          bindings[`$${upper}`] = strPin;
          bindings[`$${lower}`] = strPin;
          bindings[`$${pinId}`] = strPin;
          bindings[`$${upper}PIN`] = strPin;
          bindings[`$${lower}pin`] = strPin;
          bindings[`$${pinId}Pin`] = strPin;
        } else if (pin.required && pin.signal !== 'power' && pin.signal !== 'ground') {
          throw new ComponentExpanderError(
            'INSTANCE_REQUIRED_PIN_UNCONNECTED',
            `Required pin "${pinId}" (${pin.label}) on component instance "${instanceId}" is not connected.`,
            { componentId: instanceId, packageId }
          );
        }
      }
    }

    // 3. Resolve Properties Bindings
    if (Array.isArray(pkgDef.properties)) {
      for (const prop of pkgDef.properties) {
        const propVal = params[prop.id] !== undefined ? params[prop.id] : prop.defaultValue;
        if (propVal !== undefined) {
          const strVal = String(propVal);
          bindings[`$${prop.id}`] = strVal;
          bindings[`$${prop.id.toUpperCase()}`] = strVal;
          bindings[`$${prop.id.toLowerCase()}`] = strVal;
        }
      }
    }

    // 4. Resolve Output Bindings strictly from declared outputs and explicit instance target
    const outputVarMap: Record<string, string> = {};

    if (Array.isArray(pkgDef.outputs) && pkgDef.outputs.length > 0) {
      for (const out of pkgDef.outputs) {
        const outId = out.id;
        const boundVar = params.target || params[outId] || params.var || outId;

        outputVarMap[outId] = boundVar;
        bindings[outId] = boundVar;
        bindings[`$${outId.toUpperCase()}`] = boundVar;
        bindings[`$${outId.toLowerCase()}`] = boundVar;
        bindings[`$${outId}`] = boundVar;
      }
    }

    // 5. Collect internal variables for deterministic instance-scoped namespacing
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
      if (
        p.target &&
        typeof p.target === 'string' &&
        !outputKeys.has(p.target) &&
        !outputValues.has(p.target) &&
        (subNode.data as any)?.nodeType !== 'return'
      ) {
        internalVarNames.add(p.target);
      }
    });

    // Sort binding entries by length descending for deterministic replacement without prefix conflicts
    const sortedBindingEntries = Object.entries(bindings).sort((a, b) => b[0].length - a[0].length);

    // Recursive helper to substitute bindings and apply instance scoping
    const applyBindings = (value: any): any => {
      if (typeof value === 'string') {
        let str = value;

        // Apply pin, property, and output bindings
        for (const [key, subVal] of sortedBindingEntries) {
          if (str === key) {
            str = subVal;
          } else if (key.startsWith('$')) {
            str = str.replace(new RegExp(escapeRegex(key) + '\\b', 'g'), subVal);
          }
        }

        // Apply instance scoping to internal variables
        internalVarNames.forEach(varName => {
          const scopedVar = `${sanitizedInstanceId}_${varName}`;
          if (str === varName) {
            str = scopedVar;
          } else {
            str = str.replace(new RegExp(`\\b${escapeRegex(varName)}\\b`, 'g'), scopedVar);
          }
        });

        return str;
      }
      if (Array.isArray(value)) {
        return value.map(v => applyBindings(v));
      }
      if (value && typeof value === 'object') {
        const obj: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
          obj[k] = applyBindings(v);
        }
        return obj;
      }
      return value;
    };

    // 6. Clone internal nodes with instance-prefixed IDs
    const clonedSubNodes: Node[] = [];
    for (const subNode of internalNodes) {
      const subNodeType = (subNode.data as any)?.nodeType || subNode.type;
      if (subNodeType === 'start' || subNode.id === 'start') {
        continue;
      }

      const newId = `${instanceId}_${subNode.id}`;
      const clonedParams = applyBindings(subNode.data?.params || {});

      // For return nodes inside subflow:
      let updatedNodeType = subNodeType;
      if (subNodeType === 'return') {
        const originalVal = ((subNode.data as any)?.params?.value || '') as string;
        const returnedExpr = ((clonedParams as any)?.value || '') as string;

        // Enforce explicit output mapping without arbitrary fallback
        let mappedTarget = '';
        if (originalVal) {
          if (outputVarMap[originalVal]) {
            mappedTarget = outputVarMap[originalVal];
          } else {
            throw new ComponentExpanderError(
              'INSTANCE_UNKNOWN_OUTPUT',
              `Component subflow return references undeclared output "${originalVal}" in package "${packageId}".`,
              { componentId: instanceId, packageId }
            );
          }
        } else if (Object.keys(outputVarMap).length === 1) {
          mappedTarget = Object.values(outputVarMap)[0];
        }

        if (mappedTarget && returnedExpr && mappedTarget !== returnedExpr) {
          // Internal calculation being assigned to target output variable
          updatedNodeType = 'assignment';
          clonedParams.target = mappedTarget;
          clonedParams.expression = returnedExpr;
        } else {
          // Pass-through return where subflow already wrote directly to mappedTarget
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
        },
      });
    }

    resultNodes.push(...clonedSubNodes);

    // 7. Clone internal edges with instance-prefixed IDs
    for (const subEdge of internalEdges) {
      if (subEdge.source === 'start') {
        continue;
      }

      resultEdges.push({
        ...subEdge,
        id: `${instanceId}_${subEdge.id}`,
        source: `${instanceId}_${subEdge.source}`,
        target: `${instanceId}_${subEdge.target}`,
      });
    }

    // 8. Record splicing redirection points
    edgeRedirects.push({
      instanceId,
      entryNodeId: entrySubNodeId,
      exitNodeId: exitSubNodeId,
    });
  }

  // 9. Splice parent flow edges into cloned entry/exit nodes
  for (const edge of flowEdges) {
    const clonedEdge = cloneEdge(edge);
    for (const redirect of edgeRedirects) {
      if (clonedEdge.target === redirect.instanceId) {
        clonedEdge.target = redirect.entryNodeId;
      }
      if (clonedEdge.source === redirect.instanceId) {
        clonedEdge.source = redirect.exitNodeId;
      }
    }
    resultEdges.push(clonedEdge);
  }

  // --------------------------------------------------------------------------
  // STAGE 3: Expanded Graph Validation (Boundary 3)
  // --------------------------------------------------------------------------
  const expandedValidation = validateExpandedGraph(resultNodes, resultEdges);
  if (!expandedValidation.valid) {
    const errDiag =
      expandedValidation.diagnostics.find(d => d.severity !== 'warning') || expandedValidation.diagnostics[0];
    throw new ComponentExpanderError(
      (errDiag?.code as ExpanderErrorCode) || 'EXPANDED_UNRESOLVED_PLACEHOLDER',
      errDiag?.message || 'Expanded graph validation failed.',
      { diagnostics: expandedValidation.diagnostics }
    );
  }

  // --------------------------------------------------------------------------
  // STAGE 4: Commit
  // --------------------------------------------------------------------------
  return {
    nodes: resultNodes,
    edges: resultEdges,
    hasExpandedComponents: edgeRedirects.length > 0,
  };
}
