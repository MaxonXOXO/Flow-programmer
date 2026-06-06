import { componentsRegistry, ComponentDefinition } from '../../registry/components';

export interface ResolvedTemplate {
  includes: string[];
  globals: string;
  setup: string;
  code: string;
  returns: 'int' | 'float' | 'bool' | 'void' | 'string';
}

/**
 * Resolves which board pins are connected to each handle of a component node.
 */
export function resolvePinMapping(componentNodeId: string, schemaEdges: any[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  schemaEdges.forEach(edge => {
    if (edge.source === componentNodeId) {
      // If component is source (e.g. outputting signal)
      mapping[edge.sourceHandle] = edge.targetHandle;
    } else if (edge.target === componentNodeId) {
      // If component is target (e.g. receiving control)
      mapping[edge.targetHandle] = edge.sourceHandle;
    }
  });

  return mapping;
}

/**
 * Interpolates a template string containing placehholders like {pin_pinName}, {id}, {paramName}
 */
export function interpolateTemplate(
  templateStr: string,
  componentNodeId: string,
  pinMapping: Record<string, string>,
  params: Record<string, string> = {}
): string {
  let result = templateStr;

  // Replace {id} with a clean C-compatible identifier derived from the node ID
  const cleanId = componentNodeId.replace(/[^a-zA-Z0-9]/g, '_');
  result = result.replace(/{id}/g, cleanId);

  // Replace {pin_PINNAME} with the mapped board pin number/label
  Object.entries(pinMapping).forEach(([pinName, boardPin]) => {
    const regex = new RegExp(`{pin_${pinName}}`, 'g');
    result = result.replace(regex, boardPin);
  });

  // Replace standard parameters
  Object.entries(params).forEach(([paramName, value]) => {
    const regex = new RegExp(`{${paramName}}`, 'g');
    result = result.replace(regex, value);
  });

  // Fallback for unmapped pins to prevent empty outputs
  result = result.replace(/{pin_\w+}/g, '0');

  return result;
}

/**
 * Generates all setup, includes, global variables, and runtime code for a given component and operation.
 */
export function resolveOperationTemplate(
  operationId: string,
  componentId: string,
  componentNodeId: string,
  schemaEdges: any[],
  operationParams: Record<string, string> = {}
): ResolvedTemplate | null {
  const component = componentsRegistry[componentId];
  if (!component) return null;

  const pinMapping = resolvePinMapping(componentNodeId, schemaEdges);
  const templateConfig = component.runtime.templates[operationId];

  // Resolve Includes
  const includes = (component.runtime.includes || []).map((inc: string) => 
    interpolateTemplate(inc, componentNodeId, pinMapping, operationParams)
  );

  // Resolve Globals
  const globals = component.runtime.globals ? 
    interpolateTemplate(component.runtime.globals, componentNodeId, pinMapping, operationParams) : '';

  // Resolve Setup
  const setup = component.runtime.setup ? 
    interpolateTemplate(component.runtime.setup, componentNodeId, pinMapping, operationParams) : '';

  // Resolve Code Execution
  const code = templateConfig ? 
    interpolateTemplate(templateConfig.code, componentNodeId, pinMapping, operationParams) : '';

  return {
    includes,
    globals,
    setup,
    code,
    returns: templateConfig ? templateConfig.returns : 'void'
  };
}
