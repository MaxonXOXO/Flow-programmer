'use client'

import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
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
import { Edit2, Copy, Trash2, Sliders, X, Check } from 'lucide-react'

interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface QuickEditState {
  nodeId: string
  x: number
  y: number
  params: Record<string, string>
}

interface ConnectionInfo {
  componentId: string
  componentLabel: string
  componentType: string
  pin: string
  arduinoPin: string
}

function parseConnections(nodes: any[], edges: any[]): ConnectionInfo[] {
  const connections: ConnectionInfo[] = []

  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return

    const isSourceUno = sourceNode.id === 'arduino-uno'
    const unoPin = isSourceUno ? edge.sourceHandle : edge.targetHandle
    const compNode = isSourceUno ? targetNode : sourceNode
    const compPin = isSourceUno ? edge.targetHandle : edge.sourceHandle

    if (!unoPin || !compNode || !compPin) return
    const data = compNode.data as any

    connections.push({
      componentId: compNode.id,
      componentLabel: data.label,
      componentType: data.componentType,
      pin: compPin,
      arduinoPin: unoPin,
    })
  })

  return connections
}

const pinToNumber = (pin: string): string => {
  if (pin.startsWith('D')) return pin.slice(1)
  return pin
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
    simState,
    schemaNodes,
    schemaEdges
  } = useFlowStore()

  const { screenToFlowPosition } = useReactFlow()
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null)
  const quickEditRef = useRef<HTMLDivElement>(null)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

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

    const conns = parseConnections(schemaNodes, schemaEdges)
    const params = { ...nodeConfig.params }
    let msg = ''

    if (nodeConfig.nodeType === 'ultrasonic') {
      const usedTrigPins = flowNodes
        .filter(n => (n.data as any)?.nodeType === 'ultrasonic')
        .map(n => (n.data as any)?.params?.trigPin)
      const usedEchoPins = flowNodes
        .filter(n => (n.data as any)?.nodeType === 'ultrasonic')
        .map(n => (n.data as any)?.params?.echoPin)

      const ultrasonicCompIds = [...new Set(conns.filter(c => c.componentLabel.toLowerCase().includes('ultrasonic')).map(c => c.componentId))]
      let targetId = ultrasonicCompIds.find(id => {
        const trig = conns.find(c => c.componentId === id && c.pin === 'trig')?.arduinoPin
        const echo = conns.find(c => c.componentId === id && c.pin === 'echo')?.arduinoPin
        return !usedTrigPins.includes(trig ? pinToNumber(trig) : null) && !usedEchoPins.includes(echo ? pinToNumber(echo) : null)
      })
      if (!targetId && ultrasonicCompIds.length > 0) targetId = ultrasonicCompIds[0]

      if (targetId) {
        const trig = conns.find(c => c.componentId === targetId && c.pin === 'trig')
        const echo = conns.find(c => c.componentId === targetId && c.pin === 'echo')
        if (trig) params.trigPin = pinToNumber(trig.arduinoPin)
        if (echo) params.echoPin = pinToNumber(echo.arduinoPin)
        
        const compLabel = conns.find(c => c.componentId === targetId)?.componentLabel || 'Ultrasonic Sensor'
        if (trig && echo) {
          msg = `Auto-mapped ${compLabel} pins: TRIG = ${trig.arduinoPin}, ECHO = ${echo.arduinoPin}`
        } else if (trig) {
          msg = `Auto-mapped ${compLabel} pin: TRIG = ${trig.arduinoPin}`
        } else if (echo) {
          msg = `Auto-mapped ${compLabel} pin: ECHO = ${echo.arduinoPin}`
        }
      }
    } else if (nodeConfig.nodeType === 'dht') {
      const usedPins = flowNodes.filter(n => (n.data as any)?.nodeType === 'dht').map(n => (n.data as any)?.params?.pin)
      const compIds = [...new Set(conns.filter(c => c.componentLabel.toLowerCase().includes('dht')).map(c => c.componentId))]
      let targetId = compIds.find(id => {
        const dataPin = conns.find(c => c.componentId === id && c.pin === 'data')?.arduinoPin
        return !usedPins.includes(dataPin ? pinToNumber(dataPin) : null)
      })
      if (!targetId && compIds.length > 0) targetId = compIds[0]

      if (targetId) {
        const dataPin = conns.find(c => c.componentId === targetId && c.pin === 'data')
        if (dataPin) {
          params.pin = pinToNumber(dataPin.arduinoPin)
          const compLabel = conns.find(c => c.componentId === targetId)?.componentLabel || 'DHT Sensor'
          msg = `Auto-mapped ${compLabel} to Pin ${dataPin.arduinoPin}`
        }
      }
    } else if (nodeConfig.nodeType === 'pir') {
      const usedPins = flowNodes.filter(n => (n.data as any)?.nodeType === 'pir').map(n => (n.data as any)?.params?.pin)
      const compIds = [...new Set(conns.filter(c => c.componentLabel.toLowerCase().includes('pir')).map(c => c.componentId))]
      let targetId = compIds.find(id => {
        const outPin = conns.find(c => c.componentId === id && c.pin === 'out')?.arduinoPin
        return !usedPins.includes(outPin ? pinToNumber(outPin) : null)
      })
      if (!targetId && compIds.length > 0) targetId = compIds[0]

      if (targetId) {
        const outPin = conns.find(c => c.componentId === targetId && c.pin === 'out')
        if (outPin) {
          params.pin = pinToNumber(outPin.arduinoPin)
          const compLabel = conns.find(c => c.componentId === targetId)?.componentLabel || 'PIR Sensor'
          msg = `Auto-mapped ${compLabel} to Pin ${outPin.arduinoPin}`
        }
      }
    } else if (nodeConfig.nodeType === 'ldr') {
      const usedPins = flowNodes.filter(n => (n.data as any)?.nodeType === 'ldr').map(n => (n.data as any)?.params?.pin)
      const compIds = [...new Set(conns.filter(c => c.componentLabel.toLowerCase().includes('ldr')).map(c => c.componentId))]
      let targetId = compIds.find(id => {
        const ldrPin = conns.find(c => c.componentId === id && !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase()))?.arduinoPin
        return !usedPins.includes(ldrPin ? pinToNumber(ldrPin) : null)
      })
      if (!targetId && compIds.length > 0) targetId = compIds[0]

      if (targetId) {
        const ldrPin = conns.find(c => c.componentId === targetId && !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase()))
        if (ldrPin) {
          params.pin = pinToNumber(ldrPin.arduinoPin)
          const compLabel = conns.find(c => c.componentId === targetId)?.componentLabel || 'LDR Sensor'
          msg = `Auto-mapped ${compLabel} to Pin ${ldrPin.arduinoPin}`
        }
      }
    } else if (nodeConfig.nodeType === 'servo') {
      const usedPins = flowNodes.filter(n => (n.data as any)?.nodeType === 'servo').map(n => (n.data as any)?.params?.pin)
      const compIds = [...new Set(conns.filter(c => c.componentLabel.toLowerCase().includes('servo')).map(c => c.componentId))]
      let targetId = compIds.find(id => {
        const sigPin = conns.find(c => c.componentId === id && c.pin === 'signal')?.arduinoPin
        return !usedPins.includes(sigPin ? pinToNumber(sigPin) : null)
      })
      if (!targetId && compIds.length > 0) targetId = compIds[0]

      if (targetId) {
        const sigPin = conns.find(c => c.componentId === targetId && c.pin === 'signal')
        if (sigPin) {
          params.pin = pinToNumber(sigPin.arduinoPin)
          const compLabel = conns.find(c => c.componentId === targetId)?.componentLabel || 'Servo Motor'
          msg = `Auto-mapped ${compLabel} to Pin ${sigPin.arduinoPin}`
        }
      }
    } else if (nodeConfig.nodeType === 'sensor') {
      const usedPins = flowNodes.filter(n => (n.data as any)?.nodeType === 'sensor').map(n => (n.data as any)?.params?.pin)
      const sensorConns = conns.filter(c => c.componentType === 'sensor' && !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase()))
      let targetConn = sensorConns.find(c => !usedPins.includes(pinToNumber(c.arduinoPin)))
      if (!targetConn && sensorConns.length > 0) targetConn = sensorConns[0]

      if (targetConn) {
        params.pin = pinToNumber(targetConn.arduinoPin)
        msg = `Auto-mapped ${targetConn.componentLabel} to Pin ${targetConn.arduinoPin}`
      }
    } else if (nodeConfig.nodeType === 'gpio') {
      const usedPins = flowNodes.filter(n => (n.data as any)?.nodeType === 'gpio').map(n => (n.data as any)?.params?.pin)
      const actuatorConns = conns.filter(c => 
        (c.componentType === 'actuator' || c.componentLabel.toLowerCase().includes('led') || c.componentLabel.toLowerCase().includes('buzzer') || c.componentLabel.toLowerCase().includes('relay')) && 
        !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase())
      )
      let targetConn = actuatorConns.find(c => !usedPins.includes(pinToNumber(c.arduinoPin)))
      if (!targetConn && actuatorConns.length > 0) targetConn = actuatorConns[0]

      if (targetConn) {
        params.pin = pinToNumber(targetConn.arduinoPin)
        msg = `Auto-mapped ${targetConn.componentLabel} to Pin ${targetConn.arduinoPin}`
      }
    }

    if (msg) {
      setNotification(msg)
    }

    addFlowNode({
      id: `node-${Date.now()}`,
      type: 'baseNode',
      position,
      data: {
        label: nodeConfig.label,
        nodeType: nodeConfig.nodeType,
        icon: nodeConfig.icon,
        params,
      },
    })
  }, [screenToFlowPosition, addFlowNode, schemaNodes, schemaEdges, flowNodes])

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

  // Close context menu on left-clicks (but not quick edit)
  useEffect(() => {
    const handleCloseMenu = (e: MouseEvent) => {
      // Don't close quick edit when clicking inside it
      if (quickEditRef.current && quickEditRef.current.contains(e.target as HTMLElement)) return
      setMenu(null)
    }
    window.addEventListener('click', handleCloseMenu)
    return () => window.removeEventListener('click', handleCloseMenu)
  }, [])

  // Close quick edit on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickEdit(null)
        setMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  // Open the inline quick edit panel
  const handleOpenQuickEdit = (nodeId: string, x: number, y: number) => {
    const node = flowNodes.find(n => n.id === nodeId)
    if (node) {
      const data = node.data as any
      const params = data.params || {}
      if (Object.keys(params).length > 0) {
        setQuickEdit({ nodeId, x, y, params: { ...params } })
      }
    }
  }

  // Save quick edit changes
  const handleSaveQuickEdit = () => {
    if (!quickEdit) return
    const node = flowNodes.find(n => n.id === quickEdit.nodeId)
    if (node) {
      const data = node.data as any
      updateFlowNodeData(quickEdit.nodeId, {
        ...data,
        params: quickEdit.params,
      })
    }
    setQuickEdit(null)
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
        onPaneClick={() => { setSelectedNode(null); setMenu(null); setQuickEdit(null) }}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        style={{ background: 'var(--color-bg-base)' }}
      >
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#1b202e" />
        <Controls style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text-normal)' }} />
        <MiniMap style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)' }} nodeColor="#2fd18b" />
      </ReactFlow>

      {/* Floating Neon Context Menu */}
      {menu && !quickEdit && (
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
          {/* Quick Edit - only show if node has params */}
          {(() => {
            const node = flowNodes.find(n => n.id === menu.nodeId)
            const data = node?.data as any
            const hasParams = data?.params && Object.keys(data.params).length > 0
            return hasParams ? (
              <button
                onClick={() => { handleOpenQuickEdit(menu.nodeId, menu.x, menu.y); setMenu(null) }}
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
                Quick Edit Values
              </button>
            ) : null
          })()}
          
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

      {/* Inline Quick Edit Floating Panel */}
      {quickEdit && (
        <div
          ref={quickEditRef}
          style={{
            position: 'fixed',
            top: quickEdit.y,
            left: quickEdit.x,
            background: '#11141c',
            border: '1px solid #2a3550',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(95,163,255,0.12)',
            borderRadius: 8,
            zIndex: 10001,
            minWidth: 240,
            maxWidth: 320,
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            background: 'rgba(95,163,255,0.08)',
            borderBottom: '1px solid #2a3550',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: '#5fa3ff',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Edit2 className="w-3.5 h-3.5" />
              QUICK EDIT
            </span>
            <button
              onClick={() => setQuickEdit(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#546484',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff5f9e'}
              onMouseLeave={e => e.currentTarget.style.color = '#546484'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Parameter Fields */}
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(quickEdit.params).map(([key, val]) => (
              <div key={key}>
                <label style={{
                  display: 'block',
                  fontSize: 9,
                  color: '#546484',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 4,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {key}
                </label>
                <input
                  autoFocus={Object.keys(quickEdit.params).indexOf(key) === 0}
                  value={val}
                  onChange={(e) => {
                    setQuickEdit(prev => prev ? {
                      ...prev,
                      params: { ...prev.params, [key]: e.target.value }
                    } : null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveQuickEdit()
                    if (e.key === 'Escape') setQuickEdit(null)
                  }}
                  style={{
                    width: '100%',
                    background: '#07090d',
                    border: '1px solid #1e2638',
                    borderRadius: 4,
                    padding: '6px 10px',
                    color: '#f0f4fc',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#5fa3ff'
                    e.target.style.boxShadow = '0 0 0 2px rgba(95,163,255,0.15)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#1e2638'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Footer Buttons */}
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #1e2638',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 6,
          }}>
            <button
              onClick={() => setQuickEdit(null)}
              style={{
                background: 'transparent',
                border: '1px solid #1e2638',
                borderRadius: 4,
                padding: '4px 12px',
                fontSize: 10,
                color: '#a5b3cd',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#546484'; e.currentTarget.style.color = '#f0f4fc' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2638'; e.currentTarget.style.color = '#a5b3cd' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuickEdit}
              style={{
                background: '#2fd18b',
                border: 'none',
                borderRadius: 4,
                padding: '4px 14px',
                fontSize: 10,
                color: '#0a0b0e',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.1s',
                boxShadow: '0 0 8px rgba(47,209,139,0.2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#25b577'; e.currentTarget.style.boxShadow = '0 0 12px rgba(47,209,139,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2fd18b'; e.currentTarget.style.boxShadow = '0 0 8px rgba(47,209,139,0.2)' }}
            >
              <Check className="w-3 h-3" />
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Floating Simulation Diagnostics Hub */}
      {simState.running && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: 'rgba(21, 23, 30, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(47, 209, 139, 0.3)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 15px rgba(47,209,139,0.1)',
          padding: 12,
          width: 240,
          zIndex: 10,
          pointerEvents: 'auto',
          fontFamily: 'var(--font-sans)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 6,
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#45b872',
                boxShadow: '0 0 8px #45b872',
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-bright)' }}>
                Simulation Diagnostics
              </span>
            </div>
            <span style={{ fontSize: 9, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
              STEP {simState.step}
            </span>
          </div>

          {/* Variables Listing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>
              Active Variables
            </div>
            {Object.keys(simState.variables).length === 0 ? (
              <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                No active variables defined.
              </span>
            ) : (
              Object.entries(simState.variables).map(([name, val]) => (
                <div key={name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid rgba(255,255,255,0.02)',
                }}>
                  <span style={{ color: '#5fa3ff' }}>{name}</span>
                  <span style={{ color: '#2fd18b', fontWeight: 600 }}>{String(val)}</span>
                </div>
              ))
            )}
          </div>
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
          border: '1px solid rgba(47, 209, 139, 0.4)',
          borderRadius: 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 15px rgba(47,209,139,0.15)',
          padding: '10px 16px',
          zIndex: 10002,
          pointerEvents: 'auto',
          fontFamily: 'var(--font-sans)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#2fd18b',
            boxShadow: '0 0 8px #2fd18b',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#f0f4fc' }}>
            {notification}
          </span>
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