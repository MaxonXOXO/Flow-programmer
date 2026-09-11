'use client'

import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  addEdge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useFlowStore } from '@/store/userFlowStore'
import { resolveCanonicalPackageId, instantiatePackageGraph } from '@/lib/packages/packageGraphInstantiator'
import { getComponentPackage } from '@/lib/registry/components'
import BaseNode from '@/components/nodes/BaseNode'
import CustomSelect from '@/components/ui/CustomSelect'
import { Edit2, Copy, Trash2, Sliders, X, Check, Plus, Lock, Unlock } from 'lucide-react'

interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface QuickEditState {
  nodeId: string
  x: number
  y: number
  params: Record<string, any>
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

const getMiniMapNodeColor = (node: any) => {
  const nodeType = (node.data as any)?.nodeType || node.type
  switch (nodeType) {
    case 'start':
    case 'print':
      return '#2fd18b'
    case 'end':
    case 'return':
    case 'api':
    case 'input':
    case 'oled':
      return '#ff5f9e'
    case 'condition':
    case 'analog_read':
    case 'digital_read':
    case 'pulse_in':
    case 'sensor':
    case 'dht':
    case 'ultrasonic':
    case 'pir':
    case 'ldr':
    case 'ir':
    case 'flame':
    case 'soilMoisture':
    case 'waterLevel':
    case 'mqGas':
    case 'vibration':
      return '#ffb13d'
    case 'variable':
    case 'assignment':
    case 'function':
    case 'function_call':
    case 'digital_write':
    case 'pwm_write':
    case 'component':
    case 'gpio':
    case 'lcd':
      return '#5fa3ff'
    case 'delay':
    case 'servo':
    case 'l298n':
      return '#a5b3cd'
    case 'unoNode':
      return '#2fd18b'
    case 'componentNode':
      return '#5fa3ff'
    default:
      return '#5fa3ff'
  }
}

function FlowCanvasInner() {
  const { 
    flowNodes: mainFlowNodes,
    flowEdges: mainFlowEdges,
    setSelectedNode, 
    updateFlowNodeData,
    simState,
    schemaNodes,
    schemaEdges,
    showGrid,
    showMinimap,
    // Sub-flow system
    subFlowStack,
    subFlows,
    enterSubFlow,
    exitSubFlow,
    exitToMainFlow,
    getActiveFlowNodes,
    getActiveFlowEdges,
    setActiveFlowEdges,
    addActiveFlowNode,
    deleteActiveFlowNode,
    onActiveFlowNodesChange,
    onActiveFlowEdgesChange,
    updateActiveFlowNodeData,
    updateAnyFlowNodeData,
    pushHistory,
    // Component Packages & Workspace Documents
    activePackageId,
    componentPackages,
    exitComponentPackage,
    documents,
    activeDocumentId,
    openSubflowDocument,
    unlockSubflowDocument,
    saveSubflowOverride,
    revertSubflowOverride,
  } = useFlowStore()

  // Resolve current active document and read-only state
  const activeDoc = useMemo(() => documents.find(d => d.id === activeDocumentId), [documents, activeDocumentId])
  const isSubflowDoc = activeDoc?.type === 'subflow'
  const isReadOnly = Boolean(isSubflowDoc && (activeDoc as any).readOnly !== false)

  // Resolve current visible flow
  const flowNodes = getActiveFlowNodes()
  const flowEdges = getActiveFlowEdges()
  const isInSubFlow = subFlowStack.length > 0
  const activePackage = activePackageId ? componentPackages[activePackageId] : null

  const { screenToFlowPosition, setViewport, fitView, getViewport, getZoom, setCenter } = useReactFlow()
  const focusTarget = useFlowStore(s => s.focusTarget)
  const lastHandledFocusTargetRef = useRef<number>(0)
  const [isZoomLocked, setIsZoomLocked] = useState(false)
  const [lockedZoomLevel, setLockedZoomLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!focusTarget || focusTarget.timestamp === lastHandledFocusTargetRef.current) return
    lastHandledFocusTargetRef.current = focusTarget.timestamp

    const targetNode = flowNodes.find(n => n.id === focusTarget.id)
    if (targetNode) {
      try {
        const x = targetNode.position.x + (targetNode.width ? Number(targetNode.width) / 2 : 100)
        const y = targetNode.position.y + (targetNode.height ? Number(targetNode.height) / 2 : 40)
        const currentZoom = getZoom ? getZoom() : 1
        setCenter(x, y, { zoom: currentZoom, duration: 250 })
      } catch {}
    }
  }, [focusTarget, flowNodes, setCenter, getZoom])

  const handleToggleZoomLock = useCallback(() => {
    if (!isZoomLocked) {
      try {
        const zoom = getZoom()
        setLockedZoomLevel(zoom)
      } catch {
        setLockedZoomLevel(1)
      }
      setIsZoomLocked(true)
    } else {
      setLockedZoomLevel(null)
      setIsZoomLocked(false)
    }
  }, [isZoomLocked, getZoom])

  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null)
  const quickEditRef = useRef<HTMLDivElement>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const prevDocIdRef = useRef<string>(activeDocumentId)
  const mainFlowViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null)

  useEffect(() => {
    const prevDocId = prevDocIdRef.current
    prevDocIdRef.current = activeDocumentId

    // When navigating away from main_flow, preserve its current viewport
    if (prevDocId === 'main_flow' && activeDocumentId !== 'main_flow') {
      try {
        mainFlowViewportRef.current = getViewport()
      } catch {
        // Ignored if canvas is not initialized
      }
    }

    if (activeDocumentId === 'main_flow' && mainFlowViewportRef.current) {
      // Restore preserved Main Flow viewport
      try {
        setViewport(mainFlowViewportRef.current, { duration: 200 })
      } catch {}
    } else {
      // For subflow documents or initial load, fit the graph to viewport
      try {
        fitView({ duration: 250 })
      } catch (e) {
        // Ignored if canvas is not ready yet
      }
    }
  }, [activeDocumentId, fitView, getViewport, setViewport])

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
    (connection: Connection) => {
      if (isReadOnly) return
      pushHistory()
      setActiveFlowEdges(addEdge(connection, flowEdges))
    },
    [isReadOnly, flowEdges, setActiveFlowEdges, pushHistory]
  )

  // Double-click handler: check for subflow unlock, canonical component package node, or function node
  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: any) => {
    // 0. If inside a read-only component subflow, double-clicking any node unlocks it for editing
    if (isSubflowDoc && isReadOnly && activeDoc) {
      unlockSubflowDocument(activeDoc.id, (activeDoc as any).componentInstanceId)
      setNotification('Subflow unlocked for editing. Changes will override this component instance.')
      return
    }

    // 1. Check if node resolves to a canonical component package
    const canonicalPkgId = resolveCanonicalPackageId(node)
    if (canonicalPkgId) {
      try {
        // Validate graph instantiation criteria first to avoid silently opening an empty canvas on error
        instantiatePackageGraph({ packageId: canonicalPkgId, componentInstanceId: node.id })
        openSubflowDocument({
          packageId: canonicalPkgId,
          componentInstanceId: node.id,
          activate: true,
        })
        return
      } catch (err: any) {
        setNotification(`Cannot open subflow: ${err.message || err}`)
        return
      }
    }

    // 2. Fallback: double-click a function node → enter its sub-flow
    const nodeType = (node.data as any)?.nodeType
    if (nodeType === 'function') {
      enterSubFlow(node.id)
    }
  }, [isSubflowDoc, isReadOnly, activeDoc, unlockSubflowDocument, openSubflowDocument, enterSubFlow])

  // Canvas pane double click handler: unlock subflow if clicked on empty canvas in read-only subflow
  const onPaneDoubleClick = useCallback(() => {
    if (isSubflowDoc && isReadOnly && activeDoc) {
      unlockSubflowDocument(activeDoc.id, (activeDoc as any).componentInstanceId)
      setNotification('Subflow unlocked for editing. Changes will override this component instance.')
    }
  }, [isSubflowDoc, isReadOnly, activeDoc, unlockSubflowDocument])

  // Handle HTML5 Drag and Drop placement locally inside the provider
  const onDrop = useCallback((e: React.DragEvent) => {
    if (isReadOnly) return
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/flownode')
    if (!raw) return
    pushHistory()
    const nodeConfig = JSON.parse(raw)
    
    // Convert screen pixel position to flow coordinates using local canvas bounds
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    const conns = parseConnections(schemaNodes, schemaEdges)
    const params = { ...nodeConfig.params }
    let msg = ''

    // Generic metadata-driven pin auto-mapping:
    const packageId = params.packageId || resolveCanonicalPackageId({ data: nodeConfig })
    const pkg = packageId ? getComponentPackage(packageId) : undefined

    if (pkg && pkg.pins && pkg.pins.length > 0) {
      // Find schema nodes representing this package
      const compInstances = schemaNodes.filter(sn => resolveCanonicalPackageId(sn) === packageId)
      
      // Collect pins already assigned to existing flow nodes of this package
      const existingFlowNodes = flowNodes.filter(n => {
        const d = (n.data as any) || {}
        return d.params?.packageId === packageId || resolveCanonicalPackageId(n) === packageId
      })

      const usedPins = new Set(
        existingFlowNodes.flatMap(n => {
          const p = (n.data as any)?.params || {}
          return Object.entries(p)
            .filter(([k, v]) => (k.toLowerCase().includes('pin') || k === 'pin') && typeof v === 'string')
            .map(([_, v]) => pinToNumber(v as string))
        })
      )

      const signalPins = pkg.pins.filter(p => p.signal !== 'power' && p.signal !== 'ground')
      let targetCompId = compInstances.map(sn => sn.id).find(id => {
        const compConns = conns.filter(c => c.componentId === id)
        const isAnyPinUsed = compConns.some(c => usedPins.has(pinToNumber(c.arduinoPin)))
        return !isAnyPinUsed
      }) || (compInstances.length > 0 ? compInstances[0].id : undefined)

      if (targetCompId) {
        const compConns = conns.filter(c => c.componentId === targetCompId)
        const compLabel = compInstances.find(sn => sn.id === targetCompId)?.data?.label || pkg.metadata?.name || 'Component'
        const mappedParts: string[] = []

        for (const pin of signalPins) {
          let conn = compConns.find(c => c.pin.toLowerCase() === pin.id.toLowerCase())
          if (!conn && signalPins.length === 1 && compConns.length > 0) {
            conn = compConns.find(c => !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase()))
          }
          if (conn) {
            const pinNumber = pinToNumber(conn.arduinoPin)
            params[pin.id] = pinNumber
            params[`${pin.id}Pin`] = pinNumber
            if (signalPins.length === 1) {
              params.pin = pinNumber
            }
            mappedParts.push(`${pin.label || pin.id.toUpperCase()} = ${conn.arduinoPin}`)
          }
        }

        if (mappedParts.length > 0) {
          msg = `Auto-mapped ${compLabel}: ${mappedParts.join(', ')}`
        }
      }
    } else if (nodeConfig.nodeType === 'analog_read') {
      const usedPins = flowNodes
        .filter(n => (n.data as any)?.nodeType === 'analog_read')
        .map(n => pinToNumber((n.data as any)?.params?.pin || ''))
      const analogConns = conns.filter(c => c.arduinoPin.toUpperCase().startsWith('A') && !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase()))
      let targetConn = analogConns.find(c => !usedPins.includes(pinToNumber(c.arduinoPin))) || (analogConns.length > 0 ? analogConns[0] : null)
      if (targetConn) {
        params.pin = pinToNumber(targetConn.arduinoPin)
        msg = `Auto-mapped ${targetConn.componentLabel} to Pin ${targetConn.arduinoPin}`
      }
    } else if (nodeConfig.nodeType === 'digital_read' || nodeConfig.nodeType === 'pulse_in') {
      const usedPins = flowNodes
        .filter(n => ['digital_read', 'pulse_in'].includes((n.data as any)?.nodeType))
        .map(n => pinToNumber((n.data as any)?.params?.pin || ''))
      const inputConns = conns.filter(c => 
        (c.componentType === 'sensor' || c.componentLabel.toLowerCase().includes('button') || c.componentLabel.toLowerCase().includes('switch')) &&
        !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase())
      )
      let targetConn = inputConns.find(c => !usedPins.includes(pinToNumber(c.arduinoPin))) || (inputConns.length > 0 ? inputConns[0] : null)
      if (targetConn) {
        params.pin = pinToNumber(targetConn.arduinoPin)
        msg = `Auto-mapped ${targetConn.componentLabel} to Pin ${targetConn.arduinoPin}`
      }
    } else if (nodeConfig.nodeType === 'digital_write') {
      const usedPins = flowNodes
        .filter(n => ['digital_write', 'gpio'].includes((n.data as any)?.nodeType))
        .map(n => pinToNumber((n.data as any)?.params?.pin || ''))
      const outputConns = conns.filter(c => 
        (c.componentType === 'actuator' || c.componentLabel.toLowerCase().includes('led') || c.componentLabel.toLowerCase().includes('relay') || c.componentLabel.toLowerCase().includes('buzzer')) &&
        !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase())
      )
      let targetConn = outputConns.find(c => !usedPins.includes(pinToNumber(c.arduinoPin))) || (outputConns.length > 0 ? outputConns[0] : null)
      if (targetConn) {
        params.pin = pinToNumber(targetConn.arduinoPin)
        msg = `Auto-mapped ${targetConn.componentLabel} to Pin ${targetConn.arduinoPin}`
      }
    } else if (nodeConfig.nodeType === 'pwm_write') {
      const pwmPins = ['3', '5', '6', '9', '10', '11']
      const usedPins = flowNodes
        .filter(n => (n.data as any)?.nodeType === 'pwm_write')
        .map(n => pinToNumber((n.data as any)?.params?.pin || ''))
      const pwmConns = conns.filter(c => 
        pwmPins.includes(pinToNumber(c.arduinoPin)) &&
        !['vcc', 'gnd', '5v', '3.3v'].includes(c.arduinoPin.toLowerCase())
      )
      let targetConn = pwmConns.find(c => !usedPins.includes(pinToNumber(c.arduinoPin))) || (pwmConns.length > 0 ? pwmConns[0] : null)
      if (targetConn) {
        params.pin = pinToNumber(targetConn.arduinoPin)
        msg = `Auto-mapped PWM ${targetConn.componentLabel} to Pin ${targetConn.arduinoPin}`
      }
    }

    if (msg) {
      setNotification(msg)
    }

    const newNodeId = `node-${Date.now()}`
    if (nodeConfig.nodeType === 'function') {
      const existingFns = flowNodes.filter(n => (n.data as any)?.nodeType === 'function').length
      const fnName = params.name && params.name !== 'myFn' ? params.name : `myFn_${existingFns + 1}`
      params.name = fnName
      nodeConfig.label = `${fnName}()`
    }

    addActiveFlowNode({
      id: newNodeId,
      type: 'baseNode',
      position,
      data: {
        label: nodeConfig.label,
        nodeType: nodeConfig.nodeType,
        icon: nodeConfig.icon,
        params,
      },
    })

    if (nodeConfig.nodeType === 'function') {
      useFlowStore.getState().openDocument({
        id: `subflow_${newNodeId}`,
        title: `ƒ ${params.name}`,
        type: 'function',
        targetId: newNodeId,
      }, false)
    }
  }, [screenToFlowPosition, addActiveFlowNode, schemaNodes, schemaEdges, flowNodes])

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
      addActiveFlowNode(copy)
    }
  }

  // Open the inline quick edit panel
  const handleOpenQuickEdit = (nodeId: string, x: number, y: number) => {
    let node = flowNodes.find(n => n.id === nodeId)
    if (!node) {
      node = mainFlowNodes.find(n => n.id === nodeId)
    }
    if (!node) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === nodeId)
        if (found) { node = found; break; }
      }
    }

    if (node) {
      const isSubFlowStart = node.data?.nodeType === 'start' && subFlowStack.length > 0
      const parentFnNode = isSubFlowStart ? (() => {
        const parentId = subFlowStack[subFlowStack.length - 1]
        let parentNode = mainFlowNodes.find(n => n.id === parentId)
        if (!parentNode) {
          for (const sfId of Object.keys(subFlows)) {
            const found = subFlows[sfId].nodes.find(n => n.id === parentId)
            if (found) { parentNode = found; break; }
          }
        }
        return parentNode
      })() : null

      const targetNode = parentFnNode || node
      const data = targetNode.data as any
      const params = data.params || {}
      
      const paramsToEdit = { ...params }
      if (!paramsToEdit.inputs && paramsToEdit.parameters) {
        paramsToEdit.inputs = paramsToEdit.parameters
      }
      delete paramsToEdit.parameters
      delete paramsToEdit.arguments
      
      if (Object.keys(paramsToEdit).length > 0) {
        setQuickEdit({ nodeId: targetNode.id, x, y, params: paramsToEdit })
      }
    }
  }

  // Save quick edit changes
  const handleSaveQuickEdit = () => {
    if (!quickEdit) return
    let targetNode = flowNodes.find(n => n.id === quickEdit.nodeId)
    if (!targetNode) {
      targetNode = mainFlowNodes.find(n => n.id === quickEdit.nodeId)
    }
    if (!targetNode) {
      for (const sfId of Object.keys(subFlows)) {
        const found = subFlows[sfId].nodes.find(n => n.id === quickEdit.nodeId)
        if (found) { targetNode = found; break; }
      }
    }
    
    if (targetNode) {
      const data = targetNode.data as any
      updateAnyFlowNodeData(quickEdit.nodeId, {
        ...data,
        params: {
          ...(data.params || {}),
          ...quickEdit.params,
        },
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
      {/* Component Package Header Bar (Hidden in favor of WorkspaceTabBar tabs) */}
      {activePackage && (
        <div style={{
          display: 'none',
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(17, 20, 28, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(47, 209, 139, 0.4)', // Distinct green border for package context
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(47,209,139,0.12)',
          padding: '8px 16px',
          zIndex: 100,
          alignItems: 'center',
          gap: 16,
          fontFamily: 'var(--font-sans)',
        }}>
          {/* Label indicating component package editor */}
          <span style={{
            background: 'rgba(47, 209, 139, 0.15)',
            color: '#2fd18b',
            fontSize: 9,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 4,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)'
          }}>
            Package Editor
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#f0f4fc', fontSize: 11, fontWeight: 700 }}>
              {activePackage.name}
            </span>
            <span style={{ color: '#546484', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              ({activePackage.id})
            </span>
          </div>

          <div style={{ width: 1, height: 12, background: 'var(--color-border)' }} />

          <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--color-text-dim)' }}>
            <span>Nodes: <strong style={{ color: 'var(--color-text-normal)' }}>{activePackage.nodes.length}</strong></span>
            <span>Edges: <strong style={{ color: 'var(--color-text-normal)' }}>{activePackage.edges.length}</strong></span>
          </div>

          <div style={{ width: 1, height: 12, background: 'var(--color-border)' }} />

          <button
            onClick={exitComponentPackage}
            style={{
              background: 'rgba(255,95,158,0.08)',
              border: '1px solid rgba(255,95,158,0.2)',
              color: '#ff5f9e',
              fontSize: 9.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              letterSpacing: '0.3px',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,95,158,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,95,158,0.08)' }}
          >
            ← EXIT PACKAGE
          </button>
        </div>
      )}

      {/* Sub-flow Breadcrumb Navigation Bar (Hidden in favor of WorkspaceTabBar tabs) */}
      {isInSubFlow && (
        <div style={{
          display: 'none',
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(17, 20, 28, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(95, 163, 255, 0.25)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(95,163,255,0.08)',
          padding: '6px 14px',
          zIndex: 100,
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-sans)',
        }}>
          <button
            onClick={exitToMainFlow}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5fa3ff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 3,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(95,163,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Main Flow
          </button>
          {subFlowStack.map((nodeId, idx) => {
            const parentNode = mainFlowNodes.find(n => n.id === nodeId)
            const fnName = (parentNode?.data as any)?.params?.name || 'function'
            const isLast = idx === subFlowStack.length - 1
            return (
              <span key={nodeId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>›</span>
                {isLast ? (
                  <span style={{
                    color: '#f0f4fc',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(95,163,255,0.12)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid rgba(95,163,255,0.2)',
                  }}>
                    {fnName}()
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      // Navigate back to this level (pop everything after)
                      const depth = idx + 1
                      for (let i = subFlowStack.length; i > depth; i--) exitSubFlow()
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#5fa3ff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      borderRadius: 3,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {fnName}()
                  </button>
                )}
              </span>
            )
          })}
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, margin: '0 2px' }}>|</span>
          <button
            onClick={exitSubFlow}
            style={{
              background: 'rgba(255,95,158,0.08)',
              border: '1px solid rgba(255,95,158,0.2)',
              color: '#ff5f9e',
              fontSize: 9.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              letterSpacing: '0.3px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,95,158,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,95,158,0.08)' }}
          >
            ← BACK
          </button>
        </div>
      )}

      {/* Subflow Header Badge (Component Subflow · Read Only or Unlocked) */}
      {isSubflowDoc && activeDoc && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(17, 20, 28, 0.94)',
          backdropFilter: 'blur(12px)',
          border: isReadOnly ? '1px solid rgba(95, 163, 255, 0.35)' : '1px solid rgba(52, 211, 153, 0.4)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          padding: '5px 12px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 11,
          fontFamily: 'var(--font-sans)',
        }}>
          <span style={{ color: '#f0f4fc', fontWeight: 700 }}>
            {activeDoc.title.replace(/^(📦|🔓)\s*/, '')}
          </span>
          {isReadOnly ? (
            <button
              onClick={() => {
                unlockSubflowDocument(activeDoc.id, (activeDoc as any).componentInstanceId)
                setNotification('Subflow unlocked for editing. Changes will override this component instance.')
              }}
              title="Click or double-click to unlock subflow for editing"
              style={{
                background: 'rgba(95, 163, 255, 0.15)',
                color: '#5fa3ff',
                border: '1px solid rgba(95, 163, 255, 0.35)',
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(95, 163, 255, 0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(95, 163, 255, 0.15)' }}
            >
              <Lock className="w-2.5 h-2.5" />
              <span>READ ONLY · DOUBLE-CLICK TO UNLOCK</span>
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.35)',
                fontSize: 9,
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Unlock className="w-2.5 h-2.5" />
                <span>UNLOCKED OVERRIDE</span>
              </span>
              {activeDoc.dirty && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => {
                      saveSubflowOverride(activeDoc.id)
                      setNotification('Component override saved to project.')
                    }}
                    style={{
                      background: 'rgba(52, 211, 153, 0.2)',
                      border: '1px solid #34d399',
                      color: '#34d399',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Save Override
                  </button>
                  <button
                    onClick={() => {
                      revertSubflowOverride(activeDoc.id)
                      setNotification('Reverted component graph to package default.')
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Revert
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={animatedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onActiveFlowNodesChange}
        onEdgesChange={onActiveFlowEdgesChange}
        onConnect={onConnect}
        onDoubleClick={onPaneDoubleClick}
        minZoom={isZoomLocked && lockedZoomLevel !== null ? lockedZoomLevel : 0.1}
        maxZoom={isZoomLocked && lockedZoomLevel !== null ? lockedZoomLevel : 4}
        zoomOnScroll={!isZoomLocked}
        zoomOnPinch={!isZoomLocked}
        zoomOnDoubleClick={!isZoomLocked}
        panOnDrag={true}
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        deleteKeyCode={isReadOnly ? null : ['Backspace', 'Delete']}
        elementsSelectable={true}
        onNodeDragStart={() => { if (!isReadOnly) pushHistory() }}
        onNodesDelete={() => { if (!isReadOnly) pushHistory() }}
        onEdgesDelete={() => { if (!isReadOnly) pushHistory() }}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => { setSelectedNode(null); setMenu(null); setQuickEdit(null) }}
        onNodeContextMenu={onNodeContextMenu}
        proOptions={{ hideAttribution: true }}
        fitView
        style={{ background: 'var(--color-bg-base)' }}
      >
        {showGrid && <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="rgba(255,255,255,0.03)" />}
        <Controls
          showInteractive={false}
          style={{ background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', color: 'var(--color-text-normal)' }}
        >
          <ControlButton
            onClick={handleToggleZoomLock}
            title={isZoomLocked ? 'Unlock Canvas Zoom (Zoom is currently locked)' : 'Lock Canvas Zoom'}
            aria-label={isZoomLocked ? 'Unlock Canvas Zoom' : 'Lock Canvas Zoom'}
            style={{
              color: isZoomLocked ? '#38bdf8' : 'var(--color-text-dim)',
              background: isZoomLocked ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            }}
          >
            {isZoomLocked ? <Lock className="w-3.5 h-3.5 text-[#38bdf8]" /> : <Unlock className="w-3.5 h-3.5" />}
          </ControlButton>
        </Controls>
        {showMinimap && (
          <MiniMap 
            style={{
              background: '#11141c',
              border: '1px solid #1e2638',
              borderRadius: 8,
            }}
            maskColor="rgba(15, 17, 25, 0.75)"
            nodeColor={getMiniMapNodeColor}
            nodeStrokeColor={getMiniMapNodeColor}
            nodeBorderRadius={4}
          />
        )}
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
          {/* Quick Edit - only show if node has params and not read-only */}
          {!isReadOnly && (() => {
            const node = flowNodes.find(n => n.id === menu.nodeId)
            if (!node) return null

            const isSubFlowStart = node.data?.nodeType === 'start' && subFlowStack.length > 0
            const parentFnNode = isSubFlowStart ? (() => {
              const parentId = subFlowStack[subFlowStack.length - 1]
              let parentNode = mainFlowNodes.find(n => n.id === parentId)
              if (!parentNode) {
                for (const sfId of Object.keys(subFlows)) {
                  const found = subFlows[sfId].nodes.find(n => n.id === parentId)
                  if (found) { parentNode = found; break; }
                }
              }
              return parentNode
            })() : null

            const targetNode = parentFnNode || node
            const data = targetNode.data as any
            const params = data?.params || {}

            const paramsToEdit = { ...params }
            delete paramsToEdit.parameters
            delete paramsToEdit.arguments

            const hasParams = Object.keys(paramsToEdit).length > 0
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
          
          {!isReadOnly && (
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
            <Sliders className="w-3.5 h-3.5 text-[#ffb13d]" />
            Inspect Properties
          </button>

          {!isReadOnly && (
            <>
              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
              <button
                onClick={() => { deleteActiveFlowNode(menu.nodeId); setMenu(null) }}
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
            </>
          )}
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
            overflow: 'visible',
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
            {Object.entries(quickEdit.params).map(([key, val]) => {
              if (key === 'parameters') return null
              if (key === 'inputs') {
                let inputsList: { name: string; type: string }[] = []
                if (Array.isArray(val)) inputsList = val
                else if (typeof val === 'string' && val.trim() !== '') {
                  try { inputsList = JSON.parse(val); } catch(e) {}
                }

                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: 9, color: '#546484', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        Inputs ({inputsList.length})
                      </label>
                      <button
                        onClick={() => {
                          const newInputs = [...inputsList, { name: `input${inputsList.length + 1}`, type: 'int' }]
                          setQuickEdit(prev => prev ? {
                            ...prev,
                            params: { ...prev.params, inputs: newInputs, parameters: newInputs }
                          } : null)
                        }}
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: 3,
                          padding: '2px 6px',
                          fontSize: 9,
                          color: '#38bdf8',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Add Input</span>
                      </button>
                    </div>

                    {inputsList.length === 0 ? (
                      <div style={{ fontSize: 10, color: '#546484', fontStyle: 'italic', fontFamily: 'var(--font-mono)' }}>
                        (No inputs defined)
                      </div>
                    ) : (
                      inputsList.map((input, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            value={input.name}
                            placeholder="Input Name"
                            onChange={(e) => {
                              const newInputs = [...inputsList]
                              newInputs[idx] = { ...newInputs[idx], name: e.target.value }
                              setQuickEdit(prev => prev ? {
                                ...prev,
                                params: { ...prev.params, inputs: newInputs, parameters: newInputs }
                              } : null)
                            }}
                            style={{
                              flex: 1,
                              background: '#07090d',
                              border: '1px solid #1e2638',
                              borderRadius: 4,
                              padding: '4px 6px',
                              color: '#f0f4fc',
                              fontSize: 11,
                              fontFamily: 'var(--font-mono)',
                              outline: 'none',
                            }}
                          />
                          <CustomSelect
                            value={input.type || 'int'}
                            options={[
                              { value: 'int', label: 'int' },
                              { value: 'float', label: 'float' },
                              { value: 'bool', label: 'bool' },
                              { value: 'char', label: 'char' },
                              { value: 'String', label: 'String' },
                              { value: 'long', label: 'long' },
                              { value: 'void', label: 'void' },
                            ]}
                            onChange={(newVal) => {
                              const newInputs = [...inputsList]
                              newInputs[idx] = { ...newInputs[idx], type: newVal }
                              setQuickEdit(prev => prev ? {
                                ...prev,
                                params: { ...prev.params, inputs: newInputs, parameters: newInputs }
                              } : null)
                            }}
                            style={{ width: 85 }}
                          />
                          <button
                            onClick={() => {
                              const newInputs = inputsList.filter((_, i) => i !== idx)
                              setQuickEdit(prev => prev ? {
                                ...prev,
                                params: { ...prev.params, inputs: newInputs, parameters: newInputs }
                              } : null)
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef5f5f',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-[#ef5f5f]" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )
              }

              if (key === 'returnType') {
                return (
                  <div key={key}>
                    <label style={{ fontSize: 9, color: '#546484', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, display: 'block', fontFamily: 'var(--font-mono)' }}>
                      RETURN TYPE
                    </label>
                    <CustomSelect
                      value={val || 'void'}
                      options={[
                        { value: 'void', label: 'void' },
                        { value: 'int', label: 'int' },
                        { value: 'float', label: 'float' },
                        { value: 'bool', label: 'bool' },
                        { value: 'char', label: 'char' },
                        { value: 'String', label: 'String' },
                        { value: 'long', label: 'long' },
                      ]}
                      onChange={(newVal) => {
                        setQuickEdit(prev => prev ? {
                          ...prev,
                          params: { ...prev.params, [key]: newVal }
                        } : null)
                      }}
                    />
                  </div>
                )
              }

              return (
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
              )
            })}
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          padding: '10px 16px',
          zIndex: 10002,
          pointerEvents: 'auto',
          fontFamily: 'var(--font-sans)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#2fd18b',
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