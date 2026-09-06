'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  Connection,
  addEdge,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '@/store/userFlowStore'
import { resolveCanonicalPackageId, instantiatePackageGraph } from '@/lib/packages/packageGraphInstantiator'
import UnoNode from './UnoNode'
import BoardNode from './BoardNode'
import ComponentNode from './ComponentNode'
import { Copy, Trash2, Sliders, X } from 'lucide-react'

interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

function SchemaCanvasInner() {
  const {
    schemaNodes,
    schemaEdges,
    onSchemaNodesChange,
    onSchemaEdgesChange,
    setSchemaEdges,
    setSelectedNode,
    addSchemaNode,
    deleteSchemaNode,
    showGrid,
    openComponentPackage,
    openSubflowDocument,
    pushHistory
  } = useFlowStore()

  const { screenToFlowPosition, setViewport, fitView } = useReactFlow()
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  useEffect(() => {
    const handleResetZoom = () => {
      try {
        fitView({ duration: 300 });
      } catch (e) {
        setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
      }
    };
    window.addEventListener('flow:reset-zoom', handleResetZoom);
    return () => window.removeEventListener('flow:reset-zoom', handleResetZoom);
  }, [fitView, setViewport])

  const nodeTypes = useMemo(() => ({
    boardNode: BoardNode,
    unoNode: BoardNode,
    componentNode: ComponentNode,
  }), [])

  const defaultEdgeOptions = useMemo(() => ({
    style: { strokeWidth: 2.5, stroke: '#5fa3ff', zIndex: 1000 },
    zIndex: 1000,
  }), [])

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory()
      setSchemaEdges(addEdge(connection, schemaEdges))
    },
    [schemaEdges, setSchemaEdges, pushHistory]
  )

  // Handle double clicking schematic component to open package subflow document
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: any) => {
    const canonicalPkgId = resolveCanonicalPackageId(node)
    if (canonicalPkgId) {
      try {
        instantiatePackageGraph({ packageId: canonicalPkgId, componentInstanceId: node.id })
        openSubflowDocument({
          packageId: canonicalPkgId,
          componentInstanceId: node.id,
          activate: true,
        })
      } catch (err: any) {
        setNotification(`Cannot open subflow: ${err.message || err}`)
      }
    }
  }, [openSubflowDocument])

  // Handle right-click context menu on components
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

  // Handle local Drag and Drop logic
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/schemanode') || e.dataTransfer.getData('application/flownode')
    if (!raw) return
    pushHistory()
    const nodeConfig = JSON.parse(raw)

    // Map screen drop client pixels to local Flow canvas coordinates
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    addSchemaNode({
      id: `comp-${Date.now()}`,
      type: 'componentNode',
      position,
      data: {
        label: nodeConfig.label,
        componentType: nodeConfig.componentType,
        pins: nodeConfig.pins,
        icon: nodeConfig.icon,
        definition: nodeConfig.definition,
      },
    })
  }, [screenToFlowPosition, addSchemaNode, pushHistory])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Close context menu on left-clicks
  useEffect(() => {
    const handleCloseMenu = () => setMenu(null)
    window.addEventListener('click', handleCloseMenu)
    return () => window.removeEventListener('click', handleCloseMenu)
  }, [])

  const isBoardNode = (nodeId: string) => {
    const n = schemaNodes.find(item => item.id === nodeId)
    return nodeId === 'arduino-uno' || nodeId === 'board' || n?.type === 'boardNode' || n?.type === 'unoNode'
  }

  // Duplicate schematic component
  const handleDuplicate = (nodeId: string) => {
    const original = schemaNodes.find(n => n.id === nodeId)
    if (original && !isBoardNode(original.id)) {
      pushHistory()
      const newId = `comp-${Date.now()}`
      const copy = {
        ...original,
        id: newId,
        position: { x: original.position.x + 45, y: original.position.y + 45 },
        selected: false,
      }
      addSchemaNode(copy)
    }
  }

  return (
    <div
      className="w-full h-full relative"
      onContextMenu={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={schemaNodes}
        edges={schemaEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onSchemaNodesChange}
        onEdgesChange={onSchemaEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => pushHistory()}
        onNodesDelete={() => pushHistory()}
        onEdgesDelete={() => pushHistory()}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => { setSelectedNode(null); setMenu(null) }}
        onNodeContextMenu={onNodeContextMenu}
        connectionMode={ConnectionMode.Loose}
        elevateEdgesOnSelect={true}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
        fitView
        style={{ background: 'var(--color-bg-base)' }}
      >
        {showGrid && <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="rgba(255,255,255,0.03)" />}
        <Controls style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text-normal)' }} />
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
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isBoardNode(menu.nodeId) && (
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
              Duplicate Block
            </button>
          )}

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
            <Sliders className="w-3.5 h-3.5 text-[#5fa3ff]" />
            Inspect Pins
          </button>

          {!isBoardNode(menu.nodeId) && (
            <>
              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
              <button
                onClick={() => { deleteSchemaNode(menu.nodeId); setMenu(null) }}
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
                Delete Component
              </button>
            </>
          )}
        </div>
      )}
      {notification && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(21, 23, 30, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 95, 158, 0.4)',
          borderRadius: 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          padding: '10px 16px',
          zIndex: 10002,
          pointerEvents: 'auto',
          fontFamily: 'var(--font-sans)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 13, color: '#ff5f9e' }}>⚠️</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#f0f4fc' }}>
            {notification}
          </span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              marginLeft: 8,
              padding: 2,
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function SchemaCanvas() {
  return (
    <ReactFlowProvider>
      <SchemaCanvasInner />
    </ReactFlowProvider>
  )
}