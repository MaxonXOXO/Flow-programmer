/**
 * Flow-IDE Native Project File Format (.flow) Types
 * Specification Version 1
 */

export type FlowProjectFormat = "flow"

export interface ProjectMetadata {
  name: string
  author?: string
  description?: string
  created: string
  modified: string
}

export interface BoardReference {
  id: string
  name?: string
  mcu?: string
  frequency?: string
}

export interface SchemaCanvasData {
  nodes: any[]
  edges: any[]
}

export interface FlowCanvasData {
  nodes: any[]
  edges: any[]
}

export interface FunctionCollection {
  subFlows: Record<string, { nodes: any[]; edges: any[] }>
}

export interface ProjectSettings {
  gridSize?: number
  snapToGrid?: boolean
  componentPackages?: Record<string, any>
  [key: string]: any
}

export interface FlowProject {
  format: "flow"
  version: number
  metadata: ProjectMetadata
  board: BoardReference
  schema: SchemaCanvasData
  flow: FlowCanvasData
  functions: FunctionCollection
  settings: ProjectSettings
}

export interface ProjectValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

export interface ImportProjectResult {
  success: boolean
  project?: FlowProject
  legacyUpgraded?: boolean
  errors?: string[]
}
