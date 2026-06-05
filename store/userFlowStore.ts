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

// Sub-flow data: each expandable node (like function) stores its own flow
interface SubFlowData {
  nodes: Node[]
  edges: Edge[]
}

interface FlowStore {
  updateFlowNodeData: (id: string, data: Record<string, unknown>) => void
  updateSchemaNodeData: (id: string, data: Record<string, unknown>) => void
  
  // Schema canvas
  schemaNodes: Node[]
  schemaEdges: Edge[]

  // Flow canvas (main flow)
  flowNodes: Node[]
  flowEdges: Edge[]

  // Sub-flow system
  subFlows: Record<string, SubFlowData>
  subFlowStack: string[]  // Stack of node IDs we've navigated into

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

  // Sub-flow navigation & management
  enterSubFlow: (nodeId: string) => void
  exitSubFlow: () => void
  exitToMainFlow: () => void

  // Get the currently active flow data (respects sub-flow stack)
  getActiveFlowNodes: () => Node[]
  getActiveFlowEdges: () => Edge[]

  // Set active flow data (works on current sub-flow level)
  setActiveFlowNodes: (nodes: Node[]) => void
  setActiveFlowEdges: (edges: Edge[]) => void
  addActiveFlowNode: (node: Node) => void
  deleteActiveFlowNode: (id: string) => void
  onActiveFlowNodesChange: OnNodesChange<Node>
  onActiveFlowEdgesChange: OnEdgesChange<Edge>
  updateActiveFlowNodeData: (id: string, data: Record<string, unknown>) => void
  updateAnyFlowNodeData: (id: string, data: Record<string, unknown>) => void

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
    subFlows?: Record<string, SubFlowData>
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

// Helper: get the current sub-flow key from top of stack
function getCurrentSubFlowId(stack: string[]): string | null {
  return stack.length > 0 ? stack[stack.length - 1] : null
}

export const useFlowStore = create<FlowStore>((set, get) => ({
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
  subFlows: {},
  subFlowStack: [],
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
    // Also clean up sub-flow data if the node had one
    subFlows: (() => {
      const copy = { ...s.subFlows }
      delete copy[id]
      return copy
    })(),
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

  // ===== SUB-FLOW NAVIGATION =====
  enterSubFlow: (nodeId: string) => set((s) => {
    // Ensure a sub-flow entry exists for this node
    const existing = s.subFlows[nodeId]
    if (!existing) {
      // Get the function name from the parent node (search flowNodes and nested subflows)
      let parentNode = s.flowNodes.find(n => n.id === nodeId)
      if (!parentNode) {
        for (const sfId of Object.keys(s.subFlows)) {
          const found = s.subFlows[sfId].nodes.find(n => n.id === nodeId)
          if (found) {
            parentNode = found
            break
          }
        }
      }
      const fnName = (parentNode?.data as any)?.params?.name || 'myFn'
 
      // Seed with Start and End nodes
      const subFlows = {
        ...s.subFlows,
        [nodeId]: {
          nodes: [
            {
              id: `${nodeId}-start`,
              type: 'baseNode',
              position: { x: 100, y: 200 },
              data: { label: `${fnName}() Start`, nodeType: 'start', icon: '▶', params: {} },
            },
            {
              id: `${nodeId}-end`,
              type: 'baseNode',
              position: { x: 600, y: 200 },
              data: { label: `Return`, nodeType: 'end', icon: '⬛', params: {} },
            },
          ],
          edges: [],
        }
      }
      return {
        subFlows,
        subFlowStack: [...s.subFlowStack, nodeId],
        selectedNodeId: null,
      }
    }
    return {
      subFlowStack: [...s.subFlowStack, nodeId],
      selectedNodeId: null,
    }
  }),

  exitSubFlow: () => set((s) => {
    if (s.subFlowStack.length === 0) return s
    return {
      subFlowStack: s.subFlowStack.slice(0, -1),
      selectedNodeId: null,
    }
  }),

  exitToMainFlow: () => set({
    subFlowStack: [],
    selectedNodeId: null,
  }),

  // ===== ACTIVE FLOW RESOLUTION =====
  // These getters resolve the currently visible flow based on sub-flow stack
  getActiveFlowNodes: () => {
    const s = get()
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId && s.subFlows[currentId]) {
      return s.subFlows[currentId].nodes
    }
    return s.flowNodes
  },

  getActiveFlowEdges: () => {
    const s = get()
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId && s.subFlows[currentId]) {
      return s.subFlows[currentId].edges
    }
    return s.flowEdges
  },

  // Set/modify the currently active flow (auto-routes to sub-flow if inside one)
  setActiveFlowNodes: (nodes) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: { ...s.subFlows[currentId], nodes },
        }
      }
    }
    return { flowNodes: nodes }
  }),

  setActiveFlowEdges: (edges) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: { ...s.subFlows[currentId], edges },
        }
      }
    }
    return { flowEdges: edges }
  }),

  addActiveFlowNode: (node) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      const sf = s.subFlows[currentId] || { nodes: [], edges: [] }
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: { ...sf, nodes: [...sf.nodes, node] },
        }
      }
    }
    return { flowNodes: [...s.flowNodes, node] }
  }),

  deleteActiveFlowNode: (id) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      const sf = s.subFlows[currentId] || { nodes: [], edges: [] }
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: {
            nodes: sf.nodes.filter(n => n.id !== id),
            edges: sf.edges.filter(e => e.source !== id && e.target !== id),
          },
        }
      }
    }
    return {
      flowNodes: s.flowNodes.filter(n => n.id !== id),
      flowEdges: s.flowEdges.filter(e => e.source !== id && e.target !== id),
    }
  }),

  onActiveFlowNodesChange: (changes) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      const sf = s.subFlows[currentId] || { nodes: [], edges: [] }
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: { ...sf, nodes: applyNodeChanges(changes, sf.nodes) },
        }
      }
    }
    return { flowNodes: applyNodeChanges(changes, s.flowNodes) }
  }),

  onActiveFlowEdgesChange: (changes) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      const sf = s.subFlows[currentId] || { nodes: [], edges: [] }
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: { ...sf, edges: applyEdgeChanges(changes, sf.edges) },
        }
      }
    }
    return { flowEdges: applyEdgeChanges(changes, s.flowEdges) }
  }),

  updateActiveFlowNodeData: (id, data) => set((s) => {
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId) {
      const sf = s.subFlows[currentId] || { nodes: [], edges: [] }
      return {
        subFlows: {
          ...s.subFlows,
          [currentId]: {
            ...sf,
            nodes: sf.nodes.map(n => n.id === id ? { ...n, data } : n),
          },
        }
      }
    }
    return {
      flowNodes: s.flowNodes.map(n => n.id === id ? { ...n, data } : n)
    }
  }),

  updateAnyFlowNodeData: (id, data) => set((s) => {
    let updated = false
    const nextFlowNodes = s.flowNodes.map(n => {
      if (n.id === id) { updated = true; return { ...n, data } }
      return n
    })

    if (updated) {
      return { flowNodes: nextFlowNodes }
    }

    const nextSubFlows = { ...s.subFlows }
    let subFlowUpdated = false
    for (const sfId of Object.keys(nextSubFlows)) {
      const sf = nextSubFlows[sfId]
      const nextNodes = sf.nodes.map(n => {
        if (n.id === id) { subFlowUpdated = true; return { ...n, data } }
        return n
      })
      if (subFlowUpdated) {
        nextSubFlows[sfId] = { ...sf, nodes: nextNodes }
        break
      }
    }

    if (subFlowUpdated) {
      return { subFlows: nextSubFlows }
    }

    return s
  }),

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
    subFlows: state.subFlows || {},
    subFlowStack: [],
  }),
}))