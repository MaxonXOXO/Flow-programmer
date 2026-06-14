import { Node, Edge } from '@xyflow/react';
import ultrasonicHcsr04 from '../../flow-packages/ultrasonic_hcsr04.flow.json';

export interface PackagePin {
  signal: 'digital' | 'analog' | string;
}

export interface PackageOutput {
  type: 'float' | 'int' | 'boolean' | string;
}

export interface ValidationError {
  rule: string;
  message: string;
  nodeId?: string;
}

export interface ComponentPackage {
  id: string;
  name: string;
  version: string;
  packagePins?: Record<string, PackagePin>;
  outputs?: Record<string, PackageOutput>;
  nodes: Node[];
  edges: Edge[];
  validationErrors?: ValidationError[];
}

const PACKAGE_REGISTRY: Record<string, any> = {
  ultrasonic_hcsr04: ultrasonicHcsr04,
};

/**
 * Validate component package configuration according to schema rule sets
 */
export function validatePackage(pkg: Partial<ComponentPackage>): ValidationError[] {
  const errors: ValidationError[] = [];

  const packagePins = pkg.packagePins || {};
  const outputs = pkg.outputs || {};
  const nodes = pkg.nodes || [];
  
  // Track mapped outputs (assigned inside the package)
  const mappedOutputs = new Set<string>();

  nodes.forEach((node: any) => {
    const nodeType = node.data?.nodeType || node.type;
    const params = node.data?.params || {};

    // Rule 1: Return node without value
    if (nodeType === 'return') {
      if (!params.value || String(params.value).trim() === '') {
        errors.push({
          rule: 'RETURN_WITHOUT_VALUE',
          message: 'Return node must specify a return value.',
          nodeId: node.id
        });
      }
    }

    // Rule 2: End node containing return data
    if (nodeType === 'end') {
      if (
        params.returnValue !== undefined || 
        params.returnExpression !== undefined || 
        params.outputValue !== undefined
      ) {
        errors.push({
          rule: 'END_WITH_RETURN_DATA',
          message: 'End node represents flow termination and must not contain return data.',
          nodeId: node.id
        });
      }
    }

    // Rule 4: Reference to undeclared package pin
    Object.entries(params).forEach(([_, paramValue]) => {
      if (typeof paramValue === 'string' && paramValue.startsWith('$')) {
        const pinName = paramValue.substring(1);
        if (!packagePins[pinName]) {
          errors.push({
            rule: 'UNDECLARED_PIN_REFERENCE',
            message: `Reference to undeclared package pin "${pinName}".`,
            nodeId: node.id
          });
        }
      }
    });

    // Track mapped/assigned outputs
    if (nodeType === 'return') {
      const retVal = params.value;
      if (retVal && outputs[retVal]) {
        mappedOutputs.add(retVal);
      }
    }
    if (nodeType === 'assignment') {
      const target = params.target;
      if (target && outputs[target]) {
        mappedOutputs.add(target);
      }
    }
  });

  // Rule 3: Package output not mapped
  Object.keys(outputs).forEach(outName => {
    if (!mappedOutputs.has(outName)) {
      errors.push({
        rule: 'UNMAPPED_PACKAGE_OUTPUT',
        message: `Package output "${outName}" is not mapped/assigned inside the flow.`
      });
    }
  });

  return errors;
}

/**
 * Check if a package exists in the registry
 */
export function packageExists(packageId: string): boolean {
  return packageId in PACKAGE_REGISTRY;
}

/**
 * Load package data by ID
 */
export function loadPackage(packageId: string): ComponentPackage {
  if (!packageExists(packageId)) {
    throw new Error(`Package with ID "${packageId}" not found`);
  }
  
  const pkg = PACKAGE_REGISTRY[packageId];
  const loadedPkg: ComponentPackage = {
    id: pkg.id,
    name: pkg.name,
    version: pkg.version || '1.0',
    packagePins: pkg.packagePins || {},
    outputs: pkg.outputs || {},
    nodes: Array.isArray(pkg.nodes) ? [...pkg.nodes] : [],
    edges: Array.isArray(pkg.edges) ? [...pkg.edges] : [],
  };

  loadedPkg.validationErrors = validatePackage(loadedPkg);
  return loadedPkg;
}

/**
 * Get package metadata without node/edge payloads
 */
export function getPackageMetadata(packageId: string) {
  const pkg = loadPackage(packageId);
  return {
    id: pkg.id,
    name: pkg.name,
    version: pkg.version,
    nodesCount: pkg.nodes.length,
    edgesCount: pkg.edges.length,
    validationErrors: pkg.validationErrors,
  };
}
