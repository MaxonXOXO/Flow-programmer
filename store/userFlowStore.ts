import { create } from 'zustand'
import { Node, Edge } from '@xyflow/react'

interface ProjectConfig {
  name: string
  platform: string
  createdAt: number
}

interface SimState {
  running: boolean
  step: number
  variables: Record<string, unknown>
  currentNodeId: string | null
}

interface FlowStore {
  // Schema canvas
  schemaNodes: Node[]
  schemaEdges: Edge[]

  // Flow canvas
  flowNodes: Node[]
  flowEdges: Edge[]

  simState: SimState
  selectedNodeId: string | null
  project: ProjectConfig | null
  activeCanvas: 'schema' | 'flow'

  // Schema actions
  setSchemaNodes: (nodes: Node[]) => void
  setSchemaEdges: (edges: Edge[]) => void
  addSchemaNode: (node: Node) => void

  // Flow actions
  setFlowNodes: (nodes: Node[]) => void
  setFlowEdges: (edges: Edge[]) => void
  addFlowNode: (node: Node) => void
  deleteFlowNode: (id: string) => void

  // Shared actions
  setSelectedNode: (id: string | null) => void
  setSimState: (state: Partial<SimState>) => void
  setVariable: (name: string, value: unknown) => void
  resetSim: () => void
  setProject: (project: ProjectConfig) => void
  setActiveCanvas: (canvas: 'schema' | 'flow') => void
}

export const useFlowStore = create<FlowStore>((set) => ({
  schemaNodes: [],
  schemaEdges: [],
  flowNodes: [],
  flowEdges: [],
  selectedNodeId: null,
  project: null,
  activeCanvas: 'schema',
  simState: {
    running: false,
    step: 0,
    variables: {},
    currentNodeId: null,
  },

  setSchemaNodes: (schemaNodes) => set({ schemaNodes }),
  setSchemaEdges: (schemaEdges) => set({ schemaEdges }),
  addSchemaNode: (node) => set((s) => ({ schemaNodes: [...s.schemaNodes, node] })),

  setFlowNodes: (flowNodes) => set({ flowNodes }),
  setFlowEdges: (flowEdges) => set({ flowEdges }),
  addFlowNode: (node) => set((s) => ({ flowNodes: [...s.flowNodes, node] })),
  deleteFlowNode: (id) => set((s) => ({
    flowNodes: s.flowNodes.filter(n => n.id !== id),
    flowEdges: s.flowEdges.filter(e => e.source !== id && e.target !== id),
  })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setSimState: (state) => set((s) => ({ simState: { ...s.simState, ...state } })),
  setVariable: (name, value) => set((s) => ({
    simState: { ...s.simState, variables: { ...s.simState.variables, [name]: value } }
  })),
  resetSim: () => set((s) => ({
    simState: { ...s.simState, running: false, step: 0, variables: {}, currentNodeId: null }
  })),
  setProject: (project) => set({ project }),
  setActiveCanvas: (canvas) => set({ activeCanvas: canvas }),
}))