'use client'

import { create } from 'zustand'
import { 
  Node, Edge, applyNodeChanges, applyEdgeChanges, 
  OnNodesChange, OnEdgesChange 
} from '@xyflow/react'
import { loadPackage, packageExists, validatePackage } from '@/lib/packages/packageLoader'

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

// Component Package data: each component package encapsulates its own internal flow
interface ComponentPackageData {
  id: string
  name: string
  version: string
  packagePins?: Record<string, { signal: string }>
  outputs?: Record<string, { type: string }>
  nodes: Node[]
  edges: Edge[]
  validationErrors?: Array<{ rule: string; message: string; nodeId?: string }>
}

export type DocumentType = 'schema' | 'flow' | 'function' | 'subflow' | 'code' | 'simulator'

export interface WorkspaceDocument {
  id: string
  title: string
  type: DocumentType
  icon?: string
  closable: boolean
  dirty?: boolean
  targetId?: string
}

interface FlowStore {
  updateFlowNodeData: (id: string, data: Record<string, unknown>) => void
  updateSchemaNodeData: (id: string, data: Record<string, unknown>) => void
  
  // Workspace Documents (Phase 5 Workspace Document & Tab System)
  documents: WorkspaceDocument[]
  activeDocumentId: string
  openDocument: (doc: Partial<WorkspaceDocument> & { id: string; title: string; type: DocumentType }) => void
  closeDocument: (id: string) => void
  setActiveDocument: (id: string) => void
  setDocumentDirty: (id: string, dirty: boolean) => void
  createFunctionNode: (preferredName?: string) => string

  // Schema canvas
  schemaNodes: Node[]
  schemaEdges: Edge[]

  // Flow canvas (main flow)
  flowNodes: Node[]
  flowEdges: Edge[]

  // Sub-flow system
  subFlows: Record<string, SubFlowData>
  subFlowStack: string[]  // Stack of node IDs we've navigated into

  // Component Packages
  componentPackages: Record<string, ComponentPackageData>
  activePackageId: string | null

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

  // Component Package navigation & management
  openComponentPackage: (packageId: string) => void
  exitComponentPackage: () => void

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
    componentPackages?: Record<string, ComponentPackageData>
  }) => void

  // Layout states
  showSidebar: boolean
  activeSidebarPanel: 'explorer' | 'components'
  showGrid: boolean
  showMinimap: boolean
  showProperties: boolean

  toggleSidebar: () => void
  setActiveSidebarPanel: (panel: 'explorer' | 'components') => void
  toggleSidebarPanel: (panel: 'explorer' | 'components') => void
  toggleGrid: () => void
  toggleMinimap: () => void
  toggleProperties: () => void

  // Edit actions (Undo, Redo, Copy, Cut, Paste, Delete)
  historyPast: Array<{ nodes: Node[]; edges: Edge[]; canvas: 'schema' | 'flow' }>
  historyFuture: Array<{ nodes: Node[]; edges: Edge[]; canvas: 'schema' | 'flow' }>
  clipboardNode: Node | null
  pushHistory: () => void
  undo: () => void
  redo: () => void
  copySelectedNode: () => void
  cutSelectedNode: () => void
  pasteNode: () => void
  deleteSelectedNode: () => void
}

// Helper: get the current sub-flow key from top of stack
function getCurrentSubFlowId(stack: string[]): string | null {
  return stack.length > 0 ? stack[stack.length - 1] : null
}

const DEFAULT_DOCUMENTS: WorkspaceDocument[] = [
  {
    id: 'schema',
    title: 'Schema Designer',
    type: 'schema',
    icon: '○',
    closable: false,
    dirty: false,
  },
  {
    id: 'main_flow',
    title: 'Main Flow',
    type: 'flow',
    icon: '⚡',
    closable: false,
    dirty: false,
  },
]

export const useFlowStore = create<FlowStore>((set, get) => ({
  documents: DEFAULT_DOCUMENTS,
  activeDocumentId: 'schema',
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
  componentPackages: {},
  activePackageId: null,
  selectedNodeId: null,
  project: null,
  activeCanvas: 'schema',

  setActiveDocument: (id: string) => {
    const s = get()
    const doc = s.documents.find(d => d.id === id) || s.documents[0]
    if (!doc) return

    const canvas = doc.type === 'schema' ? 'schema' : 'flow'

    if (doc.type === 'function' || doc.type === 'subflow') {
      if (doc.targetId) {
        if (s.subFlows[doc.targetId]) {
          if (s.subFlowStack[s.subFlowStack.length - 1] !== doc.targetId) {
            set({ subFlowStack: [doc.targetId], activePackageId: null })
          }
        } else if (s.componentPackages[doc.targetId]) {
          set({ activePackageId: doc.targetId, subFlowStack: [] })
        }
      }
    } else if (doc.type === 'flow') {
      if (s.subFlowStack.length > 0 || s.activePackageId) {
        set({ subFlowStack: [], activePackageId: null })
      }
    }

    set({
      activeDocumentId: doc.id,
      activeCanvas: canvas,
    })
  },

  openDocument: (docInput) => {
    const s = get()
    const existing = s.documents.find(d => d.id === docInput.id)
    let newDocs = s.documents

    if (!existing) {
      const newDoc: WorkspaceDocument = {
        id: docInput.id,
        title: docInput.title,
        type: docInput.type,
        icon: docInput.icon,
        closable: docInput.closable !== undefined ? docInput.closable : true,
        dirty: docInput.dirty || false,
        targetId: docInput.targetId,
      }
      newDocs = [...s.documents, newDoc]
    }

    set({ documents: newDocs })
    get().setActiveDocument(docInput.id)
  },

  closeDocument: (id: string) => {
    const s = get()
    const targetDoc = s.documents.find(d => d.id === id)
    if (!targetDoc || targetDoc.closable === false) return

    const targetIdx = s.documents.findIndex(d => d.id === id)
    const newDocs = s.documents.filter(d => d.id !== id)

    let nextActiveId = s.activeDocumentId
    if (s.activeDocumentId === id) {
      const nextDoc = newDocs[Math.max(0, targetIdx - 1)]
      nextActiveId = nextDoc ? nextDoc.id : 'schema'
    }

    set({ documents: newDocs })
    get().setActiveDocument(nextActiveId)
  },

  setDocumentDirty: (id: string, dirty: boolean) => set((s) => ({
    documents: s.documents.map(d => d.id === id ? { ...d, dirty } : d)
  })),

  createFunctionNode: (preferredName?: string) => {
    get().pushHistory()
    const s = get()
    const existingFnCount = s.flowNodes.filter(n => (n.data as any)?.nodeType === 'function').length
    const fnName = preferredName || `myFunction_${existingFnCount + 1}`
    const fnNodeId = `node_fn_${Date.now()}`

    const newFnNode: Node = {
      id: fnNodeId,
      type: 'baseNode',
      position: {
        x: 250 + (existingFnCount % 5) * 40,
        y: 150 + (existingFnCount % 5) * 60,
      },
      data: {
        label: `${fnName}()`,
        nodeType: 'function',
        icon: '{}',
        params: {
          name: fnName,
          returnType: 'void',
          parameters: [],
        },
      },
    }

    const subFlows = {
      ...s.subFlows,
      [fnNodeId]: {
        nodes: [
          {
            id: `${fnNodeId}-start`,
            type: 'baseNode',
            position: { x: 100, y: 200 },
            data: { label: `${fnName}() Start`, nodeType: 'start', icon: '▶', params: {} },
          },
          {
            id: `${fnNodeId}-end`,
            type: 'baseNode',
            position: { x: 600, y: 200 },
            data: { label: `Return`, nodeType: 'end', icon: '⬛', params: {} },
          },
        ],
        edges: [],
      },
    }

    set({
      flowNodes: [...s.flowNodes, newFnNode],
      subFlows,
    })

    get().openDocument({
      id: `subflow_${fnNodeId}`,
      title: `${fnName}()`,
      type: 'function',
      targetId: fnNodeId,
    })

    return fnNodeId
  },
  simState: {
    running: false,
    step: 0,
    variables: {},
    currentNodeId: null,
  },
  showSidebar: true,
  activeSidebarPanel: 'explorer',
  showGrid: true,
  showMinimap: true,
  showProperties: true,

  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel, showSidebar: true }),
  toggleSidebarPanel: (panel) => set((s) => {
    if (s.showSidebar && s.activeSidebarPanel === panel) {
      return { showSidebar: false }
    }
    return { showSidebar: true, activeSidebarPanel: panel }
  }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  toggleProperties: () => set((s) => ({ showProperties: !s.showProperties })),

  updateFlowNodeData: (id, data) => set((s) => {
    const fnName = (data.params as any)?.name || (data as any)?.label
    const cleanFnName = fnName ? String(fnName).replace(/\(\)$/, '') : null
    const newDocs = cleanFnName ? s.documents.map(d => {
      if (d.targetId === id || d.id === `subflow_${id}`) {
        return { ...d, title: `ƒ ${cleanFnName}` }
      }
      return d
    }) : s.documents

    return {
      flowNodes: s.flowNodes.map(n => n.id === id ? { ...n, data } : n),
      documents: newDocs,
    }
  }),
  updateSchemaNodeData: (id, data) => set((s) => ({
    schemaNodes: s.schemaNodes.map(n => n.id === id ? { ...n, data } : n)
  })),

  setSchemaNodes: (schemaNodes) => set({ schemaNodes }),
  setSchemaEdges: (schemaEdges) => set({ schemaEdges }),
  addSchemaNode: (node) => {
    get().pushHistory();
    set((s) => ({ schemaNodes: [...s.schemaNodes, node] }));
  },
  deleteSchemaNode: (id) => {
    get().pushHistory();
    set((s) => ({
      schemaNodes: s.schemaNodes.filter(n => n.id !== id),
      schemaEdges: s.schemaEdges.filter(e => e.source !== id && e.target !== id),
    }));
  },

  setFlowNodes: (flowNodes) => set({ flowNodes }),
  setFlowEdges: (flowEdges) => set({ flowEdges }),
  addFlowNode: (node) => {
    get().pushHistory();
    set((s) => ({ flowNodes: [...s.flowNodes, node] }));
  },
  deleteFlowNode: (id) => {
    get().pushHistory();
    set((s) => ({
      flowNodes: s.flowNodes.filter(n => n.id !== id),
      flowEdges: s.flowEdges.filter(e => e.source !== id && e.target !== id),
      subFlows: (() => {
        const copy = { ...s.subFlows }
        delete copy[id]
        return copy
      })(),
    }));
  },

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
  enterSubFlow: (nodeId: string) => {
    const s = get()
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

    const existing = s.subFlows[nodeId]
    if (!existing) {
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
      set({
        subFlows,
        subFlowStack: [...s.subFlowStack, nodeId],
        selectedNodeId: null,
      })
    } else {
      set({
        subFlowStack: [...s.subFlowStack, nodeId],
        selectedNodeId: null,
      })
    }

    get().openDocument({
      id: `subflow_${nodeId}`,
      title: `ƒ ${fnName}`,
      type: 'function',
      targetId: nodeId,
    })
  },

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

  // ===== COMPONENT PACKAGE NAVIGATION =====
  openComponentPackage: (packageId: string) => {
    const s = get()
    let pkg = s.componentPackages[packageId]
    if (!pkg) {
      if (packageExists(packageId)) {
        const loaded = loadPackage(packageId)
        pkg = {
          id: loaded.id,
          name: loaded.name,
          version: loaded.version,
          packagePins: loaded.packagePins,
          outputs: loaded.outputs,
          nodes: loaded.nodes,
          edges: loaded.edges,
          validationErrors: loaded.validationErrors,
        }
      } else {
        pkg = {
          id: packageId,
          name: packageId,
          version: '2.0',
          packagePins: {},
          outputs: {},
          nodes: [],
          edges: [],
          validationErrors: [],
        }
      }
    }

    set({
      componentPackages: {
        ...s.componentPackages,
        [packageId]: pkg,
      },
      activePackageId: packageId,
      subFlowStack: [],
      selectedNodeId: null,
    })

    get().openDocument({
      id: `pkg_${packageId}`,
      title: `📦 ${packageId}`,
      type: 'subflow',
      targetId: packageId,
    })
  },

  exitComponentPackage: () => set({
    activePackageId: null,
    activeCanvas: 'schema',
    selectedNodeId: null,
  }),

  // ===== ACTIVE FLOW RESOLUTION =====
  // These getters resolve the currently visible flow based on sub-flow stack and package context
  getActiveFlowNodes: () => {
    const s = get()
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      return s.componentPackages[s.activePackageId].nodes
    }
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId && s.subFlows[currentId]) {
      return s.subFlows[currentId].nodes
    }
    return s.flowNodes
  },

  getActiveFlowEdges: () => {
    const s = get()
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      return s.componentPackages[s.activePackageId].edges
    }
    const currentId = getCurrentSubFlowId(s.subFlowStack)
    if (currentId && s.subFlows[currentId]) {
      return s.subFlows[currentId].edges
    }
    return s.flowEdges
  },

  // Set/modify the currently active flow (auto-routes to sub-flow or package if active)
  setActiveFlowNodes: (nodes) => set((s) => {
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = { ...activePkg, nodes }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = { ...activePkg, edges }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = { ...activePkg, nodes: [...activePkg.nodes, node] }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = {
        ...activePkg,
        nodes: activePkg.nodes.filter(n => n.id !== id),
        edges: activePkg.edges.filter(e => e.source !== id && e.target !== id),
      }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = { ...activePkg, nodes: applyNodeChanges(changes, activePkg.nodes) }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = { ...activePkg, edges: applyEdgeChanges(changes, activePkg.edges) }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    if (s.activePackageId && s.componentPackages[s.activePackageId]) {
      const activePkg = s.componentPackages[s.activePackageId]
      const updatedPkg = {
        ...activePkg,
        nodes: activePkg.nodes.map(n => n.id === id ? { ...n, data } : n),
      }
      updatedPkg.validationErrors = validatePackage(updatedPkg)
      return {
        componentPackages: {
          ...s.componentPackages,
          [s.activePackageId]: updatedPkg
        }
      }
    }
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
    const fnName = (data.params as any)?.name || (data as any)?.label
    const cleanFnName = fnName ? String(fnName).replace(/\(\)$/, '') : null
    const newDocs = cleanFnName ? s.documents.map(d => {
      if (d.targetId === id || d.id === `subflow_${id}`) {
        return { ...d, title: `ƒ ${cleanFnName}` }
      }
      return d
    }) : s.documents

    let updated = false
    const nextFlowNodes = s.flowNodes.map(n => {
      if (n.id === id) { updated = true; return { ...n, data } }
      return n
    })

    if (updated) {
      return { flowNodes: nextFlowNodes, documents: newDocs }
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
      return { subFlows: nextSubFlows, documents: newDocs }
    }

    const nextPackages = { ...s.componentPackages }
    let packageUpdated = false
    for (const pkgId of Object.keys(nextPackages)) {
      const pkg = nextPackages[pkgId]
      const nextNodes = pkg.nodes.map(n => {
        if (n.id === id) { packageUpdated = true; return { ...n, data } }
        return n
      })
      if (packageUpdated) {
        nextPackages[pkgId] = { ...pkg, nodes: nextNodes }
        nextPackages[pkgId].validationErrors = validatePackage(nextPackages[pkgId])
        break
      }
    }

    if (packageUpdated) {
      return { componentPackages: nextPackages, documents: newDocs }
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

  // Edit actions implementation
  historyPast: [],
  historyFuture: [],
  clipboardNode: null,

  pushHistory: () => set((s) => {
    const newSnapshot = {
      flowNodes: JSON.parse(JSON.stringify(s.flowNodes)),
      flowEdges: JSON.parse(JSON.stringify(s.flowEdges)),
      schemaNodes: JSON.parse(JSON.stringify(s.schemaNodes)),
      schemaEdges: JSON.parse(JSON.stringify(s.schemaEdges)),
      subFlows: JSON.parse(JSON.stringify(s.subFlows)),
      componentPackages: JSON.parse(JSON.stringify(s.componentPackages)),
      activeCanvas: s.activeCanvas
    };

    const past = [...s.historyPast, newSnapshot as any].slice(-40);
    return { historyPast: past, historyFuture: [] };
  }),

  undo: () => set((s) => {
    if (s.historyPast.length === 0) return s;
    const past = [...s.historyPast];
    const previous: any = past.pop()!;

    const currentSnapshot = {
      flowNodes: JSON.parse(JSON.stringify(s.flowNodes)),
      flowEdges: JSON.parse(JSON.stringify(s.flowEdges)),
      schemaNodes: JSON.parse(JSON.stringify(s.schemaNodes)),
      schemaEdges: JSON.parse(JSON.stringify(s.schemaEdges)),
      subFlows: JSON.parse(JSON.stringify(s.subFlows)),
      componentPackages: JSON.parse(JSON.stringify(s.componentPackages)),
      activeCanvas: s.activeCanvas
    };

    const future = [currentSnapshot as any, ...s.historyFuture];

    return {
      flowNodes: previous.flowNodes || s.flowNodes,
      flowEdges: previous.flowEdges || s.flowEdges,
      schemaNodes: previous.schemaNodes || s.schemaNodes,
      schemaEdges: previous.schemaEdges || s.schemaEdges,
      subFlows: previous.subFlows || s.subFlows,
      componentPackages: previous.componentPackages || s.componentPackages,
      historyPast: past,
      historyFuture: future,
    };
  }),

  redo: () => set((s) => {
    if (s.historyFuture.length === 0) return s;
    const future = [...s.historyFuture];
    const next: any = future.shift()!;

    const currentSnapshot = {
      flowNodes: JSON.parse(JSON.stringify(s.flowNodes)),
      flowEdges: JSON.parse(JSON.stringify(s.flowEdges)),
      schemaNodes: JSON.parse(JSON.stringify(s.schemaNodes)),
      schemaEdges: JSON.parse(JSON.stringify(s.schemaEdges)),
      subFlows: JSON.parse(JSON.stringify(s.subFlows)),
      componentPackages: JSON.parse(JSON.stringify(s.componentPackages)),
      activeCanvas: s.activeCanvas
    };

    const past = [...s.historyPast, currentSnapshot as any];

    return {
      flowNodes: next.flowNodes || s.flowNodes,
      flowEdges: next.flowEdges || s.flowEdges,
      schemaNodes: next.schemaNodes || s.schemaNodes,
      schemaEdges: next.schemaEdges || s.schemaEdges,
      subFlows: next.subFlows || s.subFlows,
      componentPackages: next.componentPackages || s.componentPackages,
      historyPast: past,
      historyFuture: future,
    };
  }),

  copySelectedNode: () => {
    const s = get();
    if (!s.selectedNodeId) return;
    const nodes = s.activeCanvas === 'flow' ? s.getActiveFlowNodes() : s.schemaNodes;
    const nodeToCopy = nodes.find(n => n.id === s.selectedNodeId);
    if (nodeToCopy) {
      set({ clipboardNode: JSON.parse(JSON.stringify(nodeToCopy)) });
    }
  },

  cutSelectedNode: () => {
    const s = get();
    if (!s.selectedNodeId) return;
    get().copySelectedNode();
    get().deleteSelectedNode();
  },

  pasteNode: () => {
    const s = get();
    if (!s.clipboardNode) return;
    get().pushHistory();

    const timestamp = Date.now();
    const newNodeId = `node_${timestamp}`;
    const pastedNode: Node = {
      ...JSON.parse(JSON.stringify(s.clipboardNode)),
      id: newNodeId,
      position: {
        x: s.clipboardNode.position.x + 40,
        y: s.clipboardNode.position.y + 40
      },
      selected: true
    };

    if (s.activeCanvas === 'flow') {
      get().addActiveFlowNode(pastedNode);
    } else {
      get().addSchemaNode(pastedNode);
    }
    set({ selectedNodeId: newNodeId });
  },

  deleteSelectedNode: () => {
    const s = get();
    if (!s.selectedNodeId) return;
    get().pushHistory();

    const targetId = s.selectedNodeId;
    if (s.activeCanvas === 'flow') {
      get().deleteActiveFlowNode(targetId);
    } else {
      get().deleteSchemaNode(targetId);
    }
    set({ selectedNodeId: null });
  },

  loadProjectState: (state) => set({
    project: state.project,
    flowNodes: state.flowNodes,
    flowEdges: state.flowEdges,
    schemaNodes: state.schemaNodes,
    schemaEdges: state.schemaEdges,
    subFlows: state.subFlows || {},
    componentPackages: state.componentPackages || {},
    subFlowStack: [],
    activePackageId: null,
  }),
}))