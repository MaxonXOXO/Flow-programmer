'use client'

import { create } from 'zustand'
import { 
  Node, Edge, applyNodeChanges, applyEdgeChanges, 
  OnNodesChange, OnEdgesChange 
} from '@xyflow/react'

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
  updateFlowNodeData: (id: string, data: Record<string, unknown>) => void
  updateSchemaNodeData: (id: string, data: Record<string, unknown>) => void
  
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
  deleteSchemaNode: (id: string) => void

  // Flow actions
  setFlowNodes: (nodes: Node[]) => void
  setFlowEdges: (edges: Edge[]) => void
  addFlowNode: (node: Node) => void
  deleteFlowNode: (id: string) => void

  // XYFlow standard change actions
  onFlowNodesChange: OnNodesChange<Node>
  onFlowEdgesChange: OnEdgesChange<Edge>
  onSchemaNodesChange: OnNodesChange<Node>
  onSchemaEdgesChange: OnEdgesChange<Edge>

  // Shared actions
  setSelectedNode: (id: string | null) => void
  setSimState: (state: Partial<SimState>) => void
  setVariable: (name: string, value: unknown) => void
  resetSim: () => void
  setProject: (project: ProjectConfig) => void
  setActiveCanvas: (canvas: 'schema' | 'flow') => void
  loadProjectState: (state: {
    project: ProjectConfig
    flowNodes: Node[]
    flowEdges: Edge[]
    schemaNodes: Node[]
    schemaEdges: Edge[]
  }) => void

  // Layout states
  showSidebar: boolean
  showGrid: boolean
  showMinimap: boolean
  showProperties: boolean

  toggleSidebar: () => void
  toggleGrid: () => void
  toggleMinimap: () => void
  toggleProperties: () => void
}

export const useFlowStore = create<FlowStore>((set) => ({
  schemaNodes: [
    {
      id: 'arduino-uno',
      type: 'unoNode',
      position: { x: 300, y: 80 },
      data: { label: 'Arduino Uno' },
      draggable: true,
    }
  ],
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
  showSidebar: true,
  showGrid: true,
  showMinimap: true,
  showProperties: true,

  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleProperties: () => set((s) => ({ showProperties: !s.showProperties })),

  updateFlowNodeData: (id, data) => set((s) => ({
    flowNodes: s.flowNodes.map(n => n.id === id ? { ...n, data } : n)
  })),
  updateSchemaNodeData: (id, data) => set((s) => ({
    schemaNodes: s.schemaNodes.map(n => n.id === id ? { ...n, data } : n)
  })),

  setSchemaNodes: (schemaNodes) => set({ schemaNodes }),
  setSchemaEdges: (schemaEdges) => set({ schemaEdges }),
  addSchemaNode: (node) => set((s) => ({ schemaNodes: [...s.schemaNodes, node] })),
  deleteSchemaNode: (id) => set((s) => ({
    schemaNodes: s.schemaNodes.filter(n => n.id !== id),
    schemaEdges: s.schemaEdges.filter(e => e.source !== id && e.target !== id),
  })),

  setFlowNodes: (flowNodes) => set({ flowNodes }),
  setFlowEdges: (flowEdges) => set({ flowEdges }),
  addFlowNode: (node) => set((s) => ({ flowNodes: [...s.flowNodes, node] })),
  deleteFlowNode: (id) => set((s) => ({
    flowNodes: s.flowNodes.filter(n => n.id !== id),
    flowEdges: s.flowEdges.filter(e => e.source !== id && e.target !== id),
  })),

  // Apply change handlers directly in the store, avoiding stale closure references
  onFlowNodesChange: (changes) => set((s) => ({
    flowNodes: applyNodeChanges(changes, s.flowNodes)
  })),
  onFlowEdgesChange: (changes) => set((s) => ({
    flowEdges: applyEdgeChanges(changes, s.flowEdges)
  })),
  onSchemaNodesChange: (changes) => set((s) => ({
    schemaNodes: applyNodeChanges(changes, s.schemaNodes)
  })),
  onSchemaEdgesChange: (changes) => set((s) => ({
    schemaEdges: applyEdgeChanges(changes, s.schemaEdges)
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
  loadProjectState: (state) => set({
    project: state.project,
    flowNodes: state.flowNodes,
    flowEdges: state.flowEdges,
    schemaNodes: state.schemaNodes,
    schemaEdges: state.schemaEdges,
  }),
}))