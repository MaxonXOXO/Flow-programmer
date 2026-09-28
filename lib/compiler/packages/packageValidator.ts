import type { Node, Edge } from '@xyflow/react';
import {
  CANONICAL_PRIMITIVE_TYPES,
  CanonicalPrimitiveType,
  ComponentPackageContract,
  ComponentPinContract,
  ComponentOutputContract,
  ComponentPropertyContract,
  ComponentDependenciesContract,
  ComponentImplementationContract,
  ValidationDiagnostic,
  ValidationResult,
  DiagnosticSeverity,
} from './packageContract';

// ─────────────────────────────────────────────────────────────────
//  Validation Constants & Regular Expressions
// ─────────────────────────────────────────────────────────────────

const CANONICAL_ID_REGEX = /^[a-z0-9_]+$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const PLACEHOLDER_REGEX = /\$([a-zA-Z0-9_]+)/g;

const VALID_SIGNAL_TYPES: ReadonlySet<string> = new Set([
  'digital_input',
  'digital_output',
  'analog_input',
  'analog_output',
  'pwm_input',
  'pwm_output',
  'i2c',
  'spi',
  'uart',
  'power',
  'ground',
]);

const VALID_DATA_TYPES: ReadonlySet<string> = new Set([
  'int',
  'float',
  'bool',
  'string',
]);

const VALID_PROPERTY_TYPES: ReadonlySet<string> = new Set([
  'number',
  'string',
  'select',
  'pin',
  'boolean',
]);

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'sensor',
  'actuator',
  'communication',
  'display',
  'motor_driver',
]);

const VALID_STRATEGIES: ReadonlySet<string> = new Set([
  'graph',
  'builtin',
  'native',
]);

const CANONICAL_PRIMITIVES_SET: ReadonlySet<string> = new Set(CANONICAL_PRIMITIVE_TYPES);

// ─────────────────────────────────────────────────────────────────
//  Helper Functions
// ─────────────────────────────────────────────────────────────────

function createValidationResult(diagnostics: ValidationDiagnostic[]): ValidationResult {
  const errors = diagnostics.filter(d => d.severity !== 'warning').map(d => d.message);
  const warnings = diagnostics.filter(d => d.severity === 'warning').map(d => d.message);
  return {
    valid: errors.length === 0,
    diagnostics,
    errors,
    warnings,
  };
}

function extractPlaceholders(text: string): string[] {
  const matches: string[] = [];
  const regex = new RegExp(PLACEHOLDER_REGEX);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function scanObjectForPlaceholders(
  obj: any,
  collected: { token: string; path: string }[],
  currentPath: string
): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'string') {
    const phs = extractPlaceholders(obj);
    phs.forEach(p => collected.push({ token: p, path: currentPath }));
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => scanObjectForPlaceholders(item, collected, `${currentPath}[${idx}]`));
    return;
  }
  if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, val]) => scanObjectForPlaceholders(val, collected, `${currentPath}.${key}`));
  }
}

// ─────────────────────────────────────────────────────────────────
//  Boundary 1: Package Definition Validation
// ─────────────────────────────────────────────────────────────────

/**
 * Validates a component package definition against the canonical contract.
 * Pure validation utility.
 */
export function validatePackageDefinition(pkg: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  if (!pkg || typeof pkg !== 'object') {
    return createValidationResult([
      {
        code: 'PACKAGE_NOT_OBJECT',
        message: 'Package definition must be a valid non-null object.',
      },
    ]);
  }

  const p = pkg as Record<string, any>;

  // 1. Validate Identity
  if (!p.id || typeof p.id !== 'string') {
    diagnostics.push({
      code: 'PACKAGE_ID_MISSING',
      path: 'id',
      message: 'Package id is required and must be a string.',
    });
  } else if (!CANONICAL_ID_REGEX.test(p.id)) {
    diagnostics.push({
      code: 'PACKAGE_ID_INVALID',
      path: 'id',
      message: `Package id "${p.id}" must be non-empty and in canonical snake_case format (/^[a-z0-9_]+$/).`,
    });
  }

  // 2. Validate Version
  if (!p.version || typeof p.version !== 'string') {
    diagnostics.push({
      code: 'PACKAGE_VERSION_MISSING',
      path: 'version',
      message: 'Package version is required and must be a semver string (e.g. "1.0.0").',
    });
  } else if (!SEMVER_REGEX.test(p.version)) {
    diagnostics.push({
      code: 'PACKAGE_VERSION_INVALID',
      path: 'version',
      message: `Package version "${p.version}" must follow semver format MAJOR.MINOR.PATCH (e.g. "1.0.0").`,
    });
  }

  // 3. Validate Metadata
  if (!p.metadata || typeof p.metadata !== 'object') {
    diagnostics.push({
      code: 'PACKAGE_METADATA_MISSING',
      path: 'metadata',
      message: 'Package metadata section is required.',
    });
  } else {
    if (p.id && p.metadata.id !== p.id) {
      diagnostics.push({
        code: 'METADATA_ID_MISMATCH',
        path: 'metadata.id',
        message: `Package metadata.id "${p.metadata.id}" does not match package id "${p.id}".`,
      });
    }
    if (!p.metadata.name || typeof p.metadata.name !== 'string' || p.metadata.name.trim() === '') {
      diagnostics.push({
        code: 'METADATA_NAME_MISSING',
        path: 'metadata.name',
        message: 'Package metadata.name is required and must be a non-empty string.',
      });
    }
    if (!p.metadata.category || !VALID_CATEGORIES.has(p.metadata.category)) {
      diagnostics.push({
        code: 'METADATA_CATEGORY_INVALID',
        path: 'metadata.category',
        message: `Package metadata.category "${p.metadata.category}" is invalid. Expected one of: ${Array.from(VALID_CATEGORIES).join(', ')}.`,
      });
    }
  }

  // Declared identifiers for placeholder resolution
  const declaredPinIds = new Set<string>();
  const declaredPropertyIds = new Set<string>();

  // 4. Validate Pins
  if (!p.pins || !Array.isArray(p.pins)) {
    diagnostics.push({
      code: 'PACKAGE_PINS_NOT_ARRAY',
      path: 'pins',
      message: 'Package pins must be an array.',
    });
  } else {
    const seenPinIds = new Set<string>();
    p.pins.forEach((pin: any, idx: number) => {
      const pinPath = `pins[${idx}]`;
      if (!pin || typeof pin !== 'object') {
        diagnostics.push({
          code: 'PIN_NOT_OBJECT',
          path: pinPath,
          message: `Pin at index ${idx} must be an object.`,
        });
        return;
      }
      if (!pin.id || typeof pin.id !== 'string' || pin.id.trim() === '') {
        diagnostics.push({
          code: 'PIN_ID_MISSING',
          path: `${pinPath}.id`,
          message: `Pin at index ${idx} is missing a valid id.`,
        });
      } else {
        if (seenPinIds.has(pin.id)) {
          diagnostics.push({
            code: 'PACKAGE_DUPLICATE_PIN',
            path: `${pinPath}.id`,
            message: `Duplicate pin id "${pin.id}" found in pins array.`,
          });
        }
        seenPinIds.add(pin.id);
        declaredPinIds.add(pin.id.toLowerCase());
      }

      if (!pin.signal || typeof pin.signal !== 'string' || !VALID_SIGNAL_TYPES.has(pin.signal)) {
        diagnostics.push({
          code: 'PIN_SIGNAL_INVALID',
          path: `${pinPath}.signal`,
          message: `Pin "${pin.id || idx}" has invalid signal "${pin.signal}". Expected one of: ${Array.from(VALID_SIGNAL_TYPES).join(', ')}.`,
        });
      }

      if (pin.required !== undefined && typeof pin.required !== 'boolean') {
        diagnostics.push({
          code: 'PIN_REQUIRED_INVALID',
          path: `${pinPath}.required`,
          message: `Pin "${pin.id || idx}" required attribute must be a boolean when supplied.`,
        });
      }
    });
  }

  // 5. Validate Outputs
  if (p.outputs !== undefined) {
    if (!Array.isArray(p.outputs)) {
      diagnostics.push({
        code: 'PACKAGE_OUTPUTS_NOT_ARRAY',
        path: 'outputs',
        message: 'Package outputs must be an array when supplied.',
      });
    } else {
      const seenOutputIds = new Set<string>();
      p.outputs.forEach((out: any, idx: number) => {
        const outPath = `outputs[${idx}]`;
        if (!out || typeof out !== 'object') {
          diagnostics.push({
            code: 'OUTPUT_NOT_OBJECT',
            path: outPath,
            message: `Output at index ${idx} must be an object.`,
          });
          return;
        }
        if (!out.id || typeof out.id !== 'string' || out.id.trim() === '') {
          diagnostics.push({
            code: 'OUTPUT_ID_MISSING',
            path: `${outPath}.id`,
            message: `Output at index ${idx} is missing a valid id.`,
          });
        } else {
          if (seenOutputIds.has(out.id)) {
            diagnostics.push({
              code: 'PACKAGE_DUPLICATE_OUTPUT',
              path: `${outPath}.id`,
              message: `Duplicate output id "${out.id}" found in outputs array.`,
            });
          }
          seenOutputIds.add(out.id);
        }

        if (!out.type || typeof out.type !== 'string' || !VALID_DATA_TYPES.has(out.type)) {
          diagnostics.push({
            code: 'OUTPUT_TYPE_INVALID',
            path: `${outPath}.type`,
            message: `Output "${out.id || idx}" has invalid datatype "${out.type}". Expected one of: ${Array.from(VALID_DATA_TYPES).join(', ')}.`,
          });
        }
      });
    }
  }

  // 6. Validate Properties
  if (p.properties !== undefined) {
    if (!Array.isArray(p.properties)) {
      diagnostics.push({
        code: 'PACKAGE_PROPERTIES_NOT_ARRAY',
        path: 'properties',
        message: 'Package properties must be an array when supplied.',
      });
    } else {
      const seenPropIds = new Set<string>();
      p.properties.forEach((prop: any, idx: number) => {
        const propPath = `properties[${idx}]`;
        if (!prop || typeof prop !== 'object') {
          diagnostics.push({
            code: 'PROPERTY_NOT_OBJECT',
            path: propPath,
            message: `Property at index ${idx} must be an object.`,
          });
          return;
        }
        if (!prop.id || typeof prop.id !== 'string' || prop.id.trim() === '') {
          diagnostics.push({
            code: 'PROPERTY_ID_MISSING',
            path: `${propPath}.id`,
            message: `Property at index ${idx} is missing a valid id.`,
          });
        } else {
          if (seenPropIds.has(prop.id)) {
            diagnostics.push({
              code: 'PACKAGE_DUPLICATE_PROPERTY',
              path: `${propPath}.id`,
              message: `Duplicate property id "${prop.id}" found in properties array.`,
            });
          }
          seenPropIds.add(prop.id);
          declaredPropertyIds.add(prop.id.toLowerCase());
        }

        if (!prop.type || typeof prop.type !== 'string' || !VALID_PROPERTY_TYPES.has(prop.type)) {
          diagnostics.push({
            code: 'PROPERTY_TYPE_INVALID',
            path: `${propPath}.type`,
            message: `Property "${prop.id || idx}" has invalid type "${prop.type}". Expected one of: ${Array.from(VALID_PROPERTY_TYPES).join(', ')}.`,
          });
        }

        if (prop.type === 'select') {
          if (!prop.options || !Array.isArray(prop.options) || prop.options.length === 0) {
            diagnostics.push({
              code: 'PROPERTY_OPTIONS_INVALID',
              path: `${propPath}.options`,
              message: `Property "${prop.id || idx}" of type "select" must have non-empty options array.`,
            });
          }
        }
      });
    }
  }

  // 7. Validate Implementation & Subflow Graphs
  const implCandidates: { impl: any; path: string }[] = [];
  if (p.implementation) {
    implCandidates.push({ impl: p.implementation, path: 'implementation' });
  }
  if (p.implementations && typeof p.implementations === 'object') {
    Object.entries(p.implementations).forEach(([targetKey, targetImpl]) => {
      implCandidates.push({ impl: targetImpl, path: `implementations.${targetKey}` });
    });
  }

  if (implCandidates.length === 0) {
    diagnostics.push({
      code: 'IMPLEMENTATION_MISSING',
      path: 'implementation',
      message: 'Package must declare at least one implementation (implementation or implementations).',
    });
  }

  // Track subflow params to check for placeholders
  const subflowsToValidatePlaceholders: any[] = [];

  implCandidates.forEach(({ impl, path: implPath }) => {
    if (!impl || typeof impl !== 'object') {
      diagnostics.push({
        code: 'IMPLEMENTATION_NOT_OBJECT',
        path: implPath,
        message: `Implementation descriptor at "${implPath}" must be an object.`,
      });
      return;
    }

    const strategy = impl.strategy || impl.type;
    if (!strategy || !VALID_STRATEGIES.has(strategy)) {
      diagnostics.push({
        code: 'IMPLEMENTATION_STRATEGY_INVALID',
        path: `${implPath}.strategy`,
        message: `Implementation at "${implPath}" has invalid strategy "${strategy}". Expected: "graph", "builtin", or "native".`,
      });
    }

    if (strategy === 'graph') {
      const rawGraph = impl.subflow || impl.graph;
      if (!rawGraph || typeof rawGraph !== 'object') {
        diagnostics.push({
          code: 'SUBFLOW_MISSING',
          path: `${implPath}.subflow`,
          message: `Graph implementation at "${implPath}" requires a subflow graph definition.`,
        });
        return;
      }

      subflowsToValidatePlaceholders.push(rawGraph);

      const entry = impl.entry || rawGraph.entry;
      const exit = impl.exit || rawGraph.exit;

      if (!entry || typeof entry !== 'string' || entry.trim() === '') {
        diagnostics.push({
          code: 'SUBFLOW_ENTRY_MISSING',
          path: `${implPath}.entry`,
          message: `Graph implementation at "${implPath}" must declare an explicit "entry" node ID.`,
        });
      }
      if (!exit || typeof exit !== 'string' || exit.trim() === '') {
        diagnostics.push({
          code: 'SUBFLOW_EXIT_MISSING',
          path: `${implPath}.exit`,
          message: `Graph implementation at "${implPath}" must declare an explicit "exit" node ID.`,
        });
      }

      if (!Array.isArray(rawGraph.nodes)) {
        diagnostics.push({
          code: 'SUBFLOW_NODES_NOT_ARRAY',
          path: `${implPath}.nodes`,
          message: `Subflow nodes at "${implPath}" must be an array.`,
        });
      }
      if (!Array.isArray(rawGraph.edges)) {
        diagnostics.push({
          code: 'SUBFLOW_EDGES_NOT_ARRAY',
          path: `${implPath}.edges`,
          message: `Subflow edges at "${implPath}" must be an array.`,
        });
      }

      if (Array.isArray(rawGraph.nodes)) {
        const nodeIds = new Set<string>();
        rawGraph.nodes.forEach((n: any, nIdx: number) => {
          if (!n || typeof n !== 'object' || !n.id) {
            diagnostics.push({
              code: 'SUBFLOW_NODE_INVALID',
              path: `${implPath}.nodes[${nIdx}]`,
              message: `Subflow node at index ${nIdx} must be an object with an id.`,
            });
            return;
          }
          nodeIds.add(n.id);

          const nodeType = (n.data as any)?.nodeType || n.type;

          // Disallow nested components in subflows
          if (nodeType === 'component') {
            diagnostics.push({
              code: 'SUBFLOW_NESTED_COMPONENT_DISALLOWED',
              path: `${implPath}.nodes[${nIdx}]`,
              message: `Subflow node "${n.id}" has nodeType "component". Nested components are not supported in subflow graphs.`,
            });
          } else if (nodeType && !CANONICAL_PRIMITIVES_SET.has(nodeType)) {
            // Strict Primitive Boundary: Subflow can ONLY compose canonical primitives
            diagnostics.push({
              code: 'SUBFLOW_NON_CANONICAL_PRIMITIVE',
              path: `${implPath}.nodes[${nIdx}]`,
              message: `Subflow node "${n.id}" uses non-canonical node type "${nodeType}". Subflows must compose only canonical primitives.`,
            });
          }
        });

        if (entry && !nodeIds.has(entry)) {
          diagnostics.push({
            code: 'SUBFLOW_ENTRY_NOT_FOUND',
            path: `${implPath}.entry`,
            message: `Subflow entry node ID "${entry}" does not exist in subflow nodes.`,
          });
        }
        if (exit && !nodeIds.has(exit)) {
          diagnostics.push({
            code: 'SUBFLOW_EXIT_NOT_FOUND',
            path: `${implPath}.exit`,
            message: `Subflow exit node ID "${exit}" does not exist in subflow nodes.`,
          });
        }
      }
    }
  });

  // 8. Placeholder Validation
  // Check placeholders in dependencies (setup, globals, includes) and subflow params
  const foundPlaceholders: { token: string; path: string }[] = [];

  const checkDeps = (deps: any, prefix: string) => {
    if (!deps || typeof deps !== 'object') return;
    ['includes', 'globals', 'setup'].forEach(key => {
      if (Array.isArray(deps[key])) {
        deps[key].forEach((line: string, idx: number) => {
          if (typeof line === 'string') {
            const phs = extractPlaceholders(line);
            phs.forEach(token => foundPlaceholders.push({ token, path: `${prefix}.${key}[${idx}]` }));
          }
        });
      }
    });
  };

  if (p.dependencies) {
    checkDeps(p.dependencies, 'dependencies');
  }
  implCandidates.forEach(({ impl, path }) => {
    if (impl.dependencies) {
      checkDeps(impl.dependencies, `${path}.dependencies`);
    }
  });

  subflowsToValidatePlaceholders.forEach((sf, sfIdx) => {
    if (Array.isArray(sf.nodes)) {
      sf.nodes.forEach((n: any) => {
        if (n.data?.params && typeof n.data.params === 'object') {
          scanObjectForPlaceholders(n.data.params, foundPlaceholders, `subflow[${sfIdx}].nodes[${n.id}].params`);
        }
      });
    }
  });

  foundPlaceholders.forEach(({ token, path }) => {
    const lowerToken = token.toLowerCase();
    const isDeclaredPin = declaredPinIds.has(lowerToken);
    const isDeclaredProp = declaredPropertyIds.has(lowerToken);

    if (!isDeclaredPin && !isDeclaredProp) {
      diagnostics.push({
        code: 'UNDECLARED_PLACEHOLDER',
        path,
        message: `Placeholder "$${token}" does not resolve to any declared pin ID or property ID in package "${p.id || 'unknown'}".`,
      });
    }
  });

  return createValidationResult(diagnostics);
}

// ─────────────────────────────────────────────────────────────────
//  Boundary 2: Component Instance Validation
// ─────────────────────────────────────────────────────────────────

/**
 * Validates an instantiated component node against its package contract and schematic wiring.
 * Pure validation utility.
 */
export function validateComponentInstance(
  node: Node,
  pkg: ComponentPackageContract,
  schemaContext?: {
    schemaNodes?: Node[];
    schemaEdges?: Edge[];
  }
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  const nodeData = (node.data || {}) as any;
  const nodeType = nodeData.nodeType || node.type;

  // 1. Must be a component node
  if (nodeType !== 'component') {
    diagnostics.push({
      code: 'INSTANCE_NOT_COMPONENT',
      path: `nodes[${node.id}].nodeType`,
      message: `Node "${node.id}" has nodeType "${nodeType}", expected "component".`,
    });
  }

  // 2. Must declare packageId matching pkg.id
  const packageId = nodeData.params?.packageId || nodeData.packageId;
  if (!packageId) {
    diagnostics.push({
      code: 'INSTANCE_PACKAGE_ID_MISSING',
      path: `nodes[${node.id}].params.packageId`,
      message: `Component instance "${node.id}" is missing required parameter "packageId".`,
    });
  } else if (packageId !== pkg.id) {
    diagnostics.push({
      code: 'INSTANCE_PACKAGE_MISMATCH',
      path: `nodes[${node.id}].params.packageId`,
      message: `Component instance "${node.id}" specifies packageId "${packageId}", but validating against package "${pkg.id}".`,
    });
  }

  // 3. Explicit Schema Correlation (No label matching!)
  const explicitId = nodeData.params?.componentInstanceId || nodeData.params?.componentId || nodeData.componentId;
  let boundSchemaNodeId: string | undefined = undefined;

  if (schemaContext?.schemaNodes && Array.isArray(schemaContext.schemaNodes)) {
    if (explicitId) {
      const found = schemaContext.schemaNodes.find(n => n.id === explicitId);
      if (found) {
        boundSchemaNodeId = found.id;
      } else {
        diagnostics.push({
          code: 'INSTANCE_SCHEMA_TARGET_NOT_FOUND',
          path: `nodes[${node.id}].params.componentId`,
          message: `Component instance "${node.id}" explicitly references schema component "${explicitId}", which does not exist in schema.`,
        });
      }
    } else {
      // Direct ID match
      const direct = schemaContext.schemaNodes.find(n => n.id === node.id);
      if (direct) {
        boundSchemaNodeId = direct.id;
      } else {
        diagnostics.push({
          code: 'INSTANCE_NO_EXPLICIT_BINDING',
          path: `nodes[${node.id}]`,
          message: `Component instance "${node.id}" lacks explicit binding to a Schema Canvas component instance.`,
        });
      }
    }
  }

  // 4. Required Pins Wiring Validation
  if (boundSchemaNodeId && schemaContext?.schemaEdges && Array.isArray(schemaContext.schemaEdges)) {
    const connectedPinHandles = new Set<string>();

    schemaContext.schemaEdges.forEach(e => {
      if (e.source === boundSchemaNodeId && e.sourceHandle) {
        connectedPinHandles.add(e.sourceHandle.toLowerCase().trim());
      }
      if (e.target === boundSchemaNodeId && e.targetHandle) {
        connectedPinHandles.add(e.targetHandle.toLowerCase().trim());
      }
    });

    if (Array.isArray(pkg.pins)) {
      pkg.pins.forEach(pin => {
        if (pin.required) {
          const pinKey = pin.id.toLowerCase().trim();
          const isConnected = connectedPinHandles.has(pinKey);
          const hasParamOverride = nodeData.params?.[pin.id] !== undefined || nodeData.params?.[pinKey] !== undefined;

          if (!isConnected && !hasParamOverride) {
            diagnostics.push({
              code: 'INSTANCE_REQUIRED_PIN_UNCONNECTED',
              path: `nodes[${node.id}].pins.${pin.id}`,
              message: `Required pin "${pin.id}" (${pin.label}) on component instance "${node.id}" is not connected in the schematic.`,
            });
          }
        }
      });
    }
  }

  return createValidationResult(diagnostics);
}

// ─────────────────────────────────────────────────────────────────
//  Boundary 3: Expanded Graph Validation
// ─────────────────────────────────────────────────────────────────

/**
 * Validates that an expanded visual flow graph conforms to canonical primitive invariants.
 * Pure validation utility.
 */
export function validateExpandedGraph(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  const seenNodeIds = new Set<string>();

  // 1. Check duplicate node IDs and node types
  nodes.forEach((n, idx) => {
    if (!n || typeof n !== 'object' || !n.id) {
      diagnostics.push({
        code: 'EXPANDED_NODE_INVALID',
        path: `nodes[${idx}]`,
        message: `Node at index ${idx} is missing or has no valid id.`,
      });
      return;
    }

    if (seenNodeIds.has(n.id)) {
      diagnostics.push({
        code: 'EXPANDED_DUPLICATE_NODE_ID',
        path: `nodes[${n.id}]`,
        message: `Duplicate node ID "${n.id}" encountered in expanded graph.`,
      });
    }
    seenNodeIds.add(n.id);

    const nodeType = (n.data as any)?.nodeType || n.type;

    // Must have NO unexpanded component nodes
    if (nodeType === 'component') {
      diagnostics.push({
        code: 'EXPANDED_COMPONENT_REMAINING',
        path: `nodes[${n.id}]`,
        message: `Unexpanded component node "${n.id}" remains in graph after component expansion stage.`,
      });
    } else if (nodeType && !CANONICAL_PRIMITIVES_SET.has(nodeType)) {
      // Must strictly be in the 17 Canonical Primitive set
      diagnostics.push({
        code: 'EXPANDED_NON_CANONICAL_PRIMITIVE',
        path: `nodes[${n.id}]`,
        message: `Expanded graph contains non-canonical node type "${nodeType}" (nodeId: "${n.id}"). All components must expand to canonical primitives.`,
      });
    }

    // 2. Check for unresolved placeholders in node params
    const params = (n.data as any)?.params;
    if (params && typeof params === 'object') {
      const placeholders: { token: string; path: string }[] = [];
      scanObjectForPlaceholders(params, placeholders, `nodes[${n.id}].params`);
      placeholders.forEach(ph => {
        diagnostics.push({
          code: 'EXPANDED_UNRESOLVED_PLACEHOLDER',
          path: ph.path,
          message: `Unresolved placeholder "$${ph.token}" found in node "${n.id}". Pin placeholders must be resolved during expansion.`,
        });
      });
    }
  });

  // 3. Edge Integrity: check dangling edge endpoints
  edges.forEach((e, idx) => {
    if (!e || typeof e !== 'object') return;

    if (!seenNodeIds.has(e.source)) {
      diagnostics.push({
        code: 'EXPANDED_DANGLING_EDGE_SOURCE',
        path: `edges[${idx}].source`,
        message: `Edge "${e.id || idx}" references non-existent source node "${e.source}".`,
      });
    }

    if (!seenNodeIds.has(e.target)) {
      diagnostics.push({
        code: 'EXPANDED_DANGLING_EDGE_TARGET',
        path: `edges[${idx}].target`,
        message: `Edge "${e.id || idx}" references non-existent target node "${e.target}".`,
      });
    }
  });

  return createValidationResult(diagnostics);
}
