import { FlowProject, ImportProjectResult, ProjectValidationResult } from './types'
import { CURRENT_PROJECT_VERSION, PROJECT_FILE_FORMAT, validateProjectSchema, upgradeLegacyProject } from './projectSchema'

/**
 * Creates a brand new empty FlowProject structure.
 */
export function createNewProject(
  name: string = 'Untitled Project',
  boardId: string = 'arduino_uno',
  author: string = '',
  description: string = ''
): FlowProject {
  const now = new Date().toISOString()
  return {
    format: PROJECT_FILE_FORMAT,
    version: CURRENT_PROJECT_VERSION,
    metadata: {
      name: name.trim() || 'Untitled Project',
      author,
      description,
      created: now,
      modified: now,
    },
    board: {
      id: boardId,
      name: boardId === 'arduino_uno' ? 'Arduino Uno' : boardId,
    },
    schema: {
      nodes: [],
      edges: [],
    },
    flow: {
      nodes: [],
      edges: [],
    },
    functions: {
      subFlows: {},
    },
    settings: {
      componentPackages: {},
    },
  }
}

/**
 * Builds a validated FlowProject structure from active application store state.
 */
export function exportProjectFromState(storeState: {
  project?: { name?: string; platform?: string; createdAt?: number };
  schemaNodes?: any[];
  schemaEdges?: any[];
  flowNodes?: any[];
  flowEdges?: any[];
  subFlows?: Record<string, any>;
  componentPackages?: Record<string, any>;
  subflowInstances?: Record<string, any>;
  metadata?: any;
}): FlowProject {
  const now = new Date().toISOString()
  const name = storeState.metadata?.name || storeState.project?.name || 'Untitled Project'
  const boardId = storeState.project?.platform || 'arduino_uno'
  const created = storeState.metadata?.created || 
    (storeState.project?.createdAt ? new Date(storeState.project.createdAt).toISOString() : now)

  const componentOverrides: Record<string, any> = {}
  if (storeState.subflowInstances) {
    for (const [key, inst] of Object.entries(storeState.subflowInstances)) {
      if (inst && inst.unlocked && inst.packageId && inst.componentInstanceId) {
        componentOverrides[key] = {
          id: key,
          packageId: inst.packageId,
          componentInstanceId: inst.componentInstanceId,
          packageVersion: inst.packageVersion,
          entry: inst.entry,
          exit: inst.exit,
          nodes: JSON.parse(JSON.stringify(inst.nodes || [])),
          edges: JSON.parse(JSON.stringify(inst.edges || [])),
        }
      }
    }
  }

  return {
    format: PROJECT_FILE_FORMAT,
    version: CURRENT_PROJECT_VERSION,
    metadata: {
      name,
      author: storeState.metadata?.author || '',
      description: storeState.metadata?.description || '',
      created,
      modified: now,
    },
    board: {
      id: boardId,
      name: boardId === 'arduino_uno' ? 'Arduino Uno' : boardId,
    },
    schema: {
      nodes: storeState.schemaNodes || [],
      edges: storeState.schemaEdges || [],
    },
    flow: {
      nodes: storeState.flowNodes || [],
      edges: storeState.flowEdges || [],
    },
    functions: {
      subFlows: storeState.subFlows || {},
    },
    ...(Object.keys(componentOverrides).length > 0 ? { componentOverrides } : {}),
    settings: {
      componentPackages: storeState.componentPackages || {},
    },
  }
}

/**
 * Serializes a FlowProject to a formatted JSON string.
 */
export function serializeProject(project: FlowProject): string {
  return JSON.stringify(project, null, 2)
}

/**
 * Validates a project object.
 */
export function validateProject(data: any): ProjectValidationResult {
  return validateProjectSchema(data)
}

/**
 * Version migration runner for future format versions.
 */
export function migrateProject(data: any): FlowProject {
  if (!data || typeof data !== 'object') {
    throw new Error('Cannot migrate invalid or empty project data.')
  }

  // Legacy projects (missing format or version)
  if (data.format !== PROJECT_FILE_FORMAT || typeof data.version !== 'number') {
    return upgradeLegacyProject(data)
  }

  // Future migration handlers (e.g. version 1 -> 2) will be added here
  return data as FlowProject
}

/**
 * Safely parses and imports a .flow project or legacy JSON file.
 * Returns clean validation result and transparently upgrades legacy projects.
 */
export function importProject(fileContentOrObject: string | object): ImportProjectResult {
  let rawData: any

  if (typeof fileContentOrObject === 'string') {
    try {
      rawData = JSON.parse(fileContentOrObject)
    } catch (err) {
      return {
        success: false,
        errors: ['Failed to parse JSON file content. File may be corrupted or malformed.'],
      }
    }
  } else if (fileContentOrObject && typeof fileContentOrObject === 'object') {
    rawData = fileContentOrObject
  } else {
    return {
      success: false,
      errors: ['Invalid project input provided.'],
    }
  }

  let isLegacy = false
  let project: FlowProject

  // Detect legacy format (missing format === "flow" or version number)
  if (rawData.format !== PROJECT_FILE_FORMAT || typeof rawData.version !== 'number') {
    isLegacy = true
    project = upgradeLegacyProject(rawData)
  } else {
    project = migrateProject(rawData)
  }

  // Validate final upgraded/loaded project
  const validation = validateProject(project)
  if (!validation.valid) {
    return {
      success: false,
      project,
      legacyUpgraded: isLegacy,
      errors: validation.errors,
    }
  }

  return {
    success: true,
    project,
    legacyUpgraded: isLegacy,
  }
}

/**
 * Converts a FlowProject structure into store state format for userFlowStore.loadProjectState().
 */
export function extractStoreState(flowProject: FlowProject) {
  const subflowInstances: Record<string, any> = {}
  if (flowProject.componentOverrides) {
    const overridesList = Array.isArray(flowProject.componentOverrides)
      ? flowProject.componentOverrides
      : Object.values(flowProject.componentOverrides)

    for (const ov of overridesList) {
      if (!ov || !ov.packageId || !ov.componentInstanceId) continue
      const docId = ov.id || `subflow_${ov.packageId}_${ov.componentInstanceId}`
      subflowInstances[docId] = {
        packageId: ov.packageId,
        componentInstanceId: ov.componentInstanceId,
        packageVersion: ov.packageVersion,
        entry: ov.entry,
        exit: ov.exit,
        nodes: JSON.parse(JSON.stringify(ov.nodes || [])),
        edges: JSON.parse(JSON.stringify(ov.edges || [])),
        unlocked: true,
        dirty: false,
      }
    }
  }

  return {
    project: {
      name: flowProject.metadata.name,
      platform: flowProject.board.id,
      createdAt: new Date(flowProject.metadata.created).getTime() || Date.now(),
    },
    metadata: flowProject.metadata,
    schemaNodes: flowProject.schema.nodes,
    schemaEdges: flowProject.schema.edges,
    flowNodes: flowProject.flow.nodes,
    flowEdges: flowProject.flow.edges,
    subFlows: flowProject.functions.subFlows,
    componentPackages: flowProject.settings?.componentPackages || {},
    subflowInstances,
  }
}
