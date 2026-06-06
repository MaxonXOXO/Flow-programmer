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
import UnoNode from './UnoNode'
import ComponentNode from './ComponentNode'
import { Copy, Trash2, Sliders } from 'lucide-react'

import { ArduinoUno } from '@/lib/registry/boards'
import { componentsRegistry } from '@/lib/registry/components'

interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

function validateConnection(connection: Connection, nodes: any[]): { valid: boolean; error?: string } {
  const sourceNode = nodes.find(n => n.id === connection.source)
  const targetNode = nodes.find(n => n.id === connection.target)
  if (!sourceNode || !targetNode) return { valid: false, error: "Invalid connection: Nodes not found" }

  const isSourceUno = sourceNode.id === 'arduino-uno'
  const isTargetUno = targetNode.id === 'arduino-uno'

  if (!isSourceUno && !isTargetUno) {
    return { valid: false, error: "Connections must be between the Arduino board and a component" }
  }

  const unoPin = isSourceUno ? connection.sourceHandle : connection.targetHandle
  const compNode = isSourceUno ? targetNode : sourceNode
  const compPinId = isSourceUno ? connection.targetHandle : connection.sourceHandle

  if (!unoPin || !compNode || !compPinId) {
    return { valid: false, error: "Missing pin handle identifier" }
  }

  const unoPinDef = ArduinoUno.pins[unoPin]
  if (!unoPinDef) {
    return { valid: false, error: `Invalid Arduino Pin: ${unoPin}` }
  }

  const compId = compNode.data?.componentType || compNode.type || ''
  const compDef = componentsRegistry[compId]
  if (!compDef) {
    return { valid: false, error: `Component definition not found for: ${compId}` }
  }

  const compPin = compDef.pins.find(p => p.id === compPinId)
  if (!compPin) {
    return { valid: false, error: `Invalid component pin: ${compPinId}` }
  }

  if (compPin.type === 'ground') {
    if (!unoPinDef.capabilities.includes('ground')) {
      return { valid: false, error: `Ground pin [${compPin.label}] must connect to a GND pin on Arduino` }
    }
    return { valid: true }
  }

  if (compPin.type === 'power') {
    if (!unoPinDef.capabilities.includes('power')) {
      return { valid: false, error: `Power pin [${compPin.label}] must connect to 5V or 3.3V on Arduino` }
    }
    return { valid: true }
  }

  if (compPin.type === 'analog') {
    if (!unoPinDef.capabilities.includes('analog')) {
      return { valid: false, error: `Analog pin [${compPin.label}] must connect to an Analog pin (A0-A5)` }
    }
    return { valid: true }
  }

  if (compPin.type === 'pwm') {
    if (!unoPinDef.capabilities.includes('pwm')) {
      return { valid: false, error: `PWM pin [${compPin.label}] must connect to a PWM pin (with ~ symbol)` }
    }
    return { valid: true }
  }

  if (compPin.type === 'i2c') {
    if (compPin.id === 'sda' && !unoPinDef.capabilities.includes('i2c_sda')) {
      return { valid: false, error: "SDA pin must connect to SDA (A4) on Arduino" }
    }
    if (compPin.id === 'scl' && !unoPinDef.capabilities.includes('i2c_scl')) {
      return { valid: false, error: "SCL pin must connect to SCL (A5) on Arduino" }
    }
    return { valid: true }
  }

  if (compPin.type === 'spi') {
    const checkCap = `spi_${compPin.id}`
    if (!unoPinDef.capabilities.includes(checkCap as any)) {
      return { valid: false, error: `${compPin.label} must connect to corresponding SPI pin on Arduino` }
    }
    return { valid: true }
  }

  if (compPin.type === 'uart') {
    if (compPin.id === 'tx' && !unoPinDef.capabilities.includes('uart_rx')) {
      return { valid: false, error: "TX pin must connect to RX (Pin 0) on Arduino" }
    }
    if (compPin.id === 'rx' && !unoPinDef.capabilities.includes('uart_tx')) {
      return { valid: false, error: "RX pin must connect to TX (Pin 1) on Arduino" }
    }
    return { valid: true }
  }

  if (compPin.type === 'digital') {
    if (!unoPinDef.capabilities.includes('digital')) {
      return { valid: false, error: `Digital pin [${compPin.label}] must connect to a Digital pin on Arduino` }
    }
  }

  return { valid: true }
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
    showGrid
  } = useFlowStore()

  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const nodeTypes = useMemo(() => ({
    unoNode: UnoNode,
    componentNode: ComponentNode,
  }), [])

  const onConnect = useCallback(
    (connection: Connection) => {
      const check = validateConnection(connection, schemaNodes)
      if (!check.valid) {
        const err = check.error || "Mismatched pin capabilities"
        setErrorMsg(err)
        setTimeout(() => {
          setErrorMsg(prev => prev === err ? null : prev)
        }, 4000)
        return
      }
      setSchemaEdges(addEdge(connection, schemaEdges))
    },
    [schemaEdges, schemaNodes, setSchemaEdges]
  )

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
    const raw = e.dataTransfer.getData('application/flownode')
    if (!raw) return
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
      },
    })
  }, [screenToFlowPosition, addSchemaNode])

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

  // Duplicate schematic component
  const handleDuplicate = (nodeId: string) => {
    const original = schemaNodes.find(n => n.id === nodeId)
    if (original && original.id !== 'arduino-uno') {
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
      {errorMsg && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 95, 158, 0.95)',
          border: '1px solid #ff5f9e',
          borderRadius: 6,
          padding: '8px 16px',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: '0 4px 16px rgba(255, 95, 158, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span>⚠️ {errorMsg}</span>
          <button 
            onClick={() => setErrorMsg(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      )}
      <ReactFlow
        nodes={schemaNodes}
        edges={schemaEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onSchemaNodesChange}
        onEdgesChange={onSchemaEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => { setSelectedNode(null); setMenu(null) }}
        onNodeContextMenu={onNodeContextMenu}
        connectionMode={ConnectionMode.Loose}
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
          {menu.nodeId !== 'arduino-uno' && (
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

          {menu.nodeId !== 'arduino-uno' && (
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