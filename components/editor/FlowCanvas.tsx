'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '@/store/userFlowStore'
import BaseNode from '@/components/nodes/BaseNode'
import { Edit2, Copy, Trash2, Sliders } from 'lucide-react'

interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

function FlowCanvasInner() {
  const { 
    flowNodes, 
    flowEdges, 
    onFlowNodesChange, 
    onFlowEdgesChange, 
    setFlowEdges,
    setSelectedNode, 
    addFlowNode, 
    deleteFlowNode, 
    updateFlowNodeData,
    simState 
  } = useFlowStore()

  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  const nodeTypes = useMemo(() => ({
    baseNode: BaseNode,
  }), [])

  const onConnect = useCallback(
    (connection: Connection) => setFlowEdges(addEdge(connection, flowEdges)),
    [flowEdges, setFlowEdges]
  )

  // Handle HTML5 Drag and Drop placement locally inside the provider
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/flownode')
    if (!raw) return
    const nodeConfig = JSON.parse(raw)
    
    // Convert screen pixel position to flow coordinates using local canvas bounds
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    addFlowNode({
      id: `node-${Date.now()}`,
      type: 'baseNode',
      position,
      data: {
        label: nodeConfig.label,
        nodeType: nodeConfig.nodeType,
        icon: nodeConfig.icon,
        params: nodeConfig.params,
      },
    })
  }, [screenToFlowPosition, addFlowNode])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle right-click context menu on nodes
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: any) => {
      e.preventDefault()
      setMenu({
        nodeId: node.id,
        x: e.clientX,
        y: e.clientY,
      })
    },
    []
  )

  // Close context menu on left-clicks
  useEffect(() => {
    const handleCloseMenu = () => setMenu(null)
    window.addEventListener('click', handleCloseMenu)
    return () => window.removeEventListener('click', handleCloseMenu)
  }, [])

  // Duplicate selected node
  const handleDuplicate = (nodeId: string) => {
    const original = flowNodes.find(n => n.id === nodeId)
    if (original) {
      const newId = `node-${Date.now()}`
      const copy = {
        ...original,
        id: newId,
        position: { x: original.position.x + 40, y: original.position.y + 40 },
        selected: false,
      }
      addFlowNode(copy)
    }
  }

  // Quick edit node parameters
  const handleQuickEdit = (nodeId: string) => {
    const node = flowNodes.find(n => n.id === nodeId)
    if (node) {
      const data = node.data as any
      const params = data.params || {}
      const keys = Object.keys(params)
      if (keys.length > 0) {
        const firstKey = keys[0]
        const currentVal = params[firstKey]
        const newVal = prompt(`Quick Edit parameter "${firstKey}":`, currentVal)
        if (newVal !== null) {
          updateFlowNodeData(nodeId, {
            ...data,
            params: { ...params, [firstKey]: newVal }
          })
        }
      } else {
        alert('No parameters available to edit on this node.')
      }
    }
  }

  // Animate edges when simulation is active
  const animatedEdges = flowEdges.map(edge => ({
    ...edge,
    animated: simState.running,
  }))

  return (
    <div 
      className="w-full h-full relative" 
      onContextMenu={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={animatedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onFlowNodesChange}
        onEdgesChange={onFlowEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => { setSelectedNode(null); setMenu(null) }}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        style={{ background: 'var(--color-bg-base)' }}
      >
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#1b202e" />
        <Controls style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text-normal)' }} />
        <MiniMap style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }} nodeColor="#2fd18b" />
      </ReactFlow>

      {/* Floating Neon Context Menu */}
      {menu && (
        <div 
          style={{
            position: 'fixed',
            top: menu.y,
            left: menu.x,
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 10px rgba(95,163,255,0.15)',
            borderRadius: 6,
            zIndex: 10000,
            padding: '4px 0',
            minWidth: 150,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { handleQuickEdit(menu.nodeId); setMenu(null) }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '6px 12px',
              fontSize: 11,
              color: 'var(--color-text-bright)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a2233'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Edit2 className="w-3.5 h-3.5 text-[#5fa3ff]" />
            Quick Edit Value
          </button>
          
          <button
            onClick={() => { handleDuplicate(menu.nodeId); setMenu(null) }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '6px 12px',
              fontSize: 11,
              color: 'var(--color-text-bright)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a2233'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Copy className="w-3.5 h-3.5 text-[#2fd18b]" />
            Duplicate Node
          </button>

          <button
            onClick={() => { setSelectedNode(menu.nodeId); setMenu(null) }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '6px 12px',
              fontSize: 11,
              color: 'var(--color-text-bright)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a2233'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Sliders className="w-3.5 h-3.5 text-[#ffb13d]" />
            Inspect Properties
          </button>

          <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

          <button
            onClick={() => { deleteFlowNode(menu.nodeId); setMenu(null) }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '6px 12px',
              fontSize: 11,
              color: '#ff5f9e',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#331a26'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 className="w-3.5 h-3.5 text-[#ff5f9e]" />
            Delete Node
          </button>
        </div>
      )}
    </div>
  )
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}