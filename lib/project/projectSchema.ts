import { FlowProject, ProjectValidationResult } from './types'

export const CURRENT_PROJECT_VERSION = 1
export const PROJECT_FILE_FORMAT = "flow"
export const FILE_EXTENSION = ".flow"

/**
 * Validates a parsed object against the FlowProject schema specification.
 */
export function validateProjectSchema(data: any): ProjectValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Project data must be a valid non-null object.'] }
  }

  // Check format identifier
  if (data.format !== PROJECT_FILE_FORMAT) {
    errors.push(`Invalid format identifier: expected "${PROJECT_FILE_FORMAT}", received "${data.format}".`)
  }

  // Check version number
  if (typeof data.version !== 'number') {
    errors.push('Project version is missing or not a number.')
  } else if (data.version > CURRENT_PROJECT_VERSION) {
    warnings.push(`Project version ${data.version} is newer than current IDE version ${CURRENT_PROJECT_VERSION}. Some features may not be supported.`)
  }

  // Check metadata section
  if (!data.metadata || typeof data.metadata !== 'object') {
    errors.push('Missing metadata section.')
  } else {
    if (!data.metadata.name || typeof data.metadata.name !== 'string') {
      errors.push('Metadata must include a valid project name.')
    }
  }

  // Check board section
  if (!data.board || typeof data.board !== 'object') {
    errors.push('Missing board section.')
  } else {
    if (!data.board.id || typeof data.board.id !== 'string') {
      errors.push('Board reference must include a board ID.')
    }
  }

  // Check canvas data sections
  if (!data.schema || typeof data.schema !== 'object' || !Array.isArray(data.schema.nodes)) {
    errors.push('Schema section missing or invalid nodes array.')
  }
  if (!data.flow || typeof data.flow !== 'object' || !Array.isArray(data.flow.nodes)) {
    errors.push('Flow section missing or invalid nodes array.')
  }

  // Check functions collection
  if (!data.functions || typeof data.functions !== 'object') {
    errors.push('Missing functions section.')
  }

  // Check componentOverrides if present
  if (data.componentOverrides !== undefined) {
    if (typeof data.componentOverrides !== 'object' || data.componentOverrides === null) {
      errors.push('componentOverrides section must be a valid object or map.')
    } else {
      const overridesList = Array.isArray(data.componentOverrides) 
        ? data.componentOverrides 
        : Object.values(data.componentOverrides)

      overridesList.forEach((ov: any, idx: number) => {
        if (!ov || typeof ov !== 'object') {
          errors.push(`componentOverrides[${idx}] must be a valid object.`)
          return
        }
        if (!ov.packageId || typeof ov.packageId !== 'string') {
          errors.push(`componentOverrides[${idx}] missing valid packageId.`)
        }
        if (!ov.componentInstanceId || typeof ov.componentInstanceId !== 'string') {
          errors.push(`componentOverrides[${idx}] missing valid componentInstanceId.`)
        }
        if (!Array.isArray(ov.nodes)) {
          errors.push(`componentOverrides[${idx}] missing valid nodes array.`)
        }
        if (!Array.isArray(ov.edges)) {
          errors.push(`componentOverrides[${idx}] missing valid edges array.`)
        }
        if (!ov.entry || typeof ov.entry !== 'string') {
          errors.push(`componentOverrides[${idx}] missing explicit entry node declaration.`)
        } else if (Array.isArray(ov.nodes) && !ov.nodes.some((n: any) => n.id === ov.entry)) {
          errors.push(`componentOverrides[${idx}] entry node "${ov.entry}" does not exist in nodes.`)
        }
        if (!ov.exit || typeof ov.exit !== 'string') {
          errors.push(`componentOverrides[${idx}] missing explicit exit node declaration.`)
        } else if (Array.isArray(ov.nodes) && !ov.nodes.some((n: any) => n.id === ov.exit)) {
          errors.push(`componentOverrides[${idx}] exit node "${ov.exit}" does not exist in nodes.`)
        }
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Normalizes legacy project formats (v1.0, v1.5 JSON dumps) into valid FlowProject structure.
 */
export function upgradeLegacyProject(raw: any): FlowProject {
  const now = new Date().toISOString()

  const name = raw?.project?.name || raw?.name || 'Untitled Project'
  const boardId = raw?.project?.platform || raw?.board?.id || raw?.platform || 'arduino_uno'

  const schemaNodes = Array.isArray(raw?.schemaNodes) ? raw.schemaNodes : (Array.isArray(raw?.schema?.nodes) ? raw.schema.nodes : [])
  const schemaEdges = Array.isArray(raw?.schemaEdges) ? raw.schemaEdges : (Array.isArray(raw?.schema?.edges) ? raw.schema.edges : [])

  const flowNodes = Array.isArray(raw?.flowNodes) ? raw.flowNodes : (Array.isArray(raw?.flow?.nodes) ? raw.flow.nodes : [])
  const flowEdges = Array.isArray(raw?.flowEdges) ? raw.flowEdges : (Array.isArray(raw?.flow?.edges) ? raw.flow.edges : [])

  const subFlows = raw?.subFlows || raw?.functions?.subFlows || {}
  const componentPackages = raw?.componentPackages || raw?.settings?.componentPackages || {}
  const componentOverrides = raw?.componentOverrides || {}

  return {
    format: PROJECT_FILE_FORMAT,
    version: CURRENT_PROJECT_VERSION,
    metadata: {
      name,
      author: raw?.metadata?.author || '',
      description: raw?.metadata?.description || '',
      created: raw?.metadata?.created || raw?.project?.createdAt ? new Date(raw?.project?.createdAt || Date.now()).toISOString() : now,
      modified: now,
    },
    board: {
      id: boardId,
      name: boardId === 'arduino_uno' ? 'Arduino Uno' : boardId,
    },
    schema: {
      nodes: schemaNodes,
      edges: schemaEdges,
    },
    flow: {
      nodes: flowNodes,
      edges: flowEdges,
    },
    functions: {
      subFlows,
    },
    componentOverrides,
    settings: {
      componentPackages,
    },
  }
}
