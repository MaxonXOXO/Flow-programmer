'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { Play, Square, Code, LogOut, Cpu, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'

const evalCondition = (cond: string, vars: Record<string, any>): boolean => {
  try {
    let expr = cond
    Object.entries(vars).forEach(([k, v]) => {
      const regex = new RegExp(`\\b${k}\\b`, 'g')
      expr = expr.replace(regex, JSON.stringify(v))
    })
    expr = expr.replace(/(?<![=<>!])=(?!=)/g, '==')
    return !!new Function(`return (${expr})`)()
  } catch (e) {
    return Math.random() > 0.5
  }
}

export default function TopBar({ onCodeOpen }: { onCodeOpen: () => void }) {
  const { 
    simState, 
    setSimState, 
    resetSim, 
    project, 
    activeCanvas, 
    setActiveCanvas,
    flowNodes,
    flowEdges 
  } = useFlowStore()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    if (simState.running) {
      const runStep = (currentNodeId: string, currentVars: Record<string, any>, stepCount: number) => {
        const node = flowNodes.find(n => n.id === currentNodeId)
        if (!node) {
          setSimState({ running: false, currentNodeId: null })
          return
        }
        
        const nodeData = node.data as any
        const nodeType = nodeData?.nodeType
        const nParams = nodeData?.params || {}
        
        setSimState({ currentNodeId, step: stepCount, variables: currentVars })
        
        if (nodeType === 'end') {
          timeoutId = setTimeout(() => {
            setSimState({ running: false, currentNodeId: null })
          }, 1000)
          return
        }
        
        let stepDelay = 1000
        if (nodeType === 'delay') {
          stepDelay = parseInt(nParams.ms) || 500
        }
        
        const edges = flowEdges.filter(e => e.source === currentNodeId)
        if (edges.length === 0) {
          timeoutId = setTimeout(() => {
            setSimState({ running: false, currentNodeId: null })
          }, 1000)
          return
        }
        
        let nextNodeId: string | null = null
        const nextVars = { ...currentVars }
        
        if (nodeType === 'variable') {
          const name = nParams.name || 'x'
          const val = parseInt(nParams.value) || 0
          nextVars[name] = val
          const nextEdge = edges.find(e => e.sourceHandle === 'flow') || edges[0]
          nextNodeId = nextEdge?.target || null
        } else if (nodeType === 'condition') {
          const cond = nParams.condition || 'true'
          const isTrue = evalCondition(cond, nextVars)
          const branch = isTrue ? 'true' : 'false'
          const nextEdge = edges.find(e => e.sourceHandle === branch)
          nextNodeId = nextEdge?.target || null
        } else if (nodeType === 'loop') {
          const loopVar = nParams.var || 'i'
          const limit = parseInt(nParams.to) || 10
          const stepVal = parseInt(nParams.step) || 1
          const currentVal = (nextVars[loopVar] !== undefined) ? Number(nextVars[loopVar]) : (parseInt(nParams.from) || 0)
          
          if (currentVal < limit) {
            const nextEdge = edges.find(e => e.sourceHandle === 'body')
            nextNodeId = nextEdge?.target || null
            nextVars[loopVar] = currentVal + stepVal
          } else {
            const nextEdge = edges.find(e => e.sourceHandle === 'done')
            nextNodeId = nextEdge?.target || null
            delete nextVars[loopVar]
          }
        } else if (nodeType === 'dht') {
          const tempVar = nParams.varTemp || 'temp'
          const humVar = nParams.varHum || 'hum'
          nextVars[tempVar] = Math.round(20 + Math.random() * 15)
          nextVars[humVar] = Math.round(40 + Math.random() * 30)
          const nextEdge = edges.find(e => e.sourceHandle === 'flow') || edges[0]
          nextNodeId = nextEdge?.target || null
        } else if (nodeType === 'ultrasonic') {
          const distVar = nParams.varDist || 'distance'
          nextVars[distVar] = Math.round(5 + Math.random() * 200)
          const nextEdge = edges.find(e => e.sourceHandle === 'flow') || edges[0]
          nextNodeId = nextEdge?.target || null
        } else if (nodeType === 'pir') {
          const motionVar = nParams.varMotion || 'motion'
          nextVars[motionVar] = Math.random() > 0.5 ? 1 : 0
          const nextEdge = edges.find(e => e.sourceHandle === 'flow') || edges[0]
          nextNodeId = nextEdge?.target || null
        } else if (nodeType === 'ldr') {
          const lightVar = nParams.varLight || 'lightVal'
          nextVars[lightVar] = Math.round(100 + Math.random() * 800)
          const nextEdge = edges.find(e => e.sourceHandle === 'flow') || edges[0]
          nextNodeId = nextEdge?.target || null
        } else {
          const nextEdge = edges.find(e => e.sourceHandle === 'flow') || edges[0]
          nextNodeId = nextEdge?.target || null
        }
        
        if (nextNodeId) {
          timeoutId = setTimeout(() => {
            runStep(nextNodeId!, nextVars, stepCount + 1)
          }, stepDelay)
        } else {
          timeoutId = setTimeout(() => {
            setSimState({ running: false, currentNodeId: null })
          }, 1000)
        }
      }
      
      const startNode = flowNodes.find(n => n.data?.nodeType === 'start')
      if (startNode) {
        runStep(startNode.id, {}, 0)
      } else {
        setSimState({ running: false })
      }
    } else {
      if (timeoutId) clearTimeout(timeoutId)
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [simState.running])

  const menus = {
    File: ['New Project', 'Open...', 'Save Project', 'Export Arduino C++', 'Preferences'],
    Edit: ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Delete Node'],
    Board: ['Change Platform...', 'Pin Configuration', 'Verify Connection', 'Flash Firmware'],
    View: ['Show Sidebar', 'Show Grid', 'Toggle Console', 'Reset Zoom'],
    Help: ['Getting Started', 'Keyboard Shortcuts', 'API Reference', 'About Flow Coder']
  }

  const handleMenuAction = (menu: string, action: string) => {
    setActiveMenu(null)
    if (action === 'Export Arduino C++' || action === 'Verify Connection') {
      onCodeOpen()
    } else if (action === 'Preferences') {
      alert('Preferences Panel: Coming soon!')
    } else if (action === 'New Project') {
      localStorage.removeItem('fp_project')
      window.location.href = '/'
    }
  }

  return (
    <div style={{
      height: 40,
      background: 'var(--color-bg-header)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 8,
      zIndex: 100,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* Brand App Icon & Logo */}
      <div 
        onClick={() => window.location.href = '/'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginRight: 12,
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          background: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#151515',
          fontWeight: 900,
          fontSize: 12,
        }}>
          F
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: 12,
          color: 'var(--color-text-bright)',
          letterSpacing: '0.5px',
        }}>
          FlowCoder
        </div>
      </div>

      {/* Desktop App Dropdown Menus */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 16 }}>
        {Object.entries(menus).map(([menuName, items]) => (
          <div key={menuName} style={{ position: 'relative' }}>
            <button
              onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
              onMouseEnter={() => activeMenu && setActiveMenu(menuName)}
              style={{
                background: activeMenu === menuName ? '#3a3a3a' : 'transparent',
                border: 'none',
                color: activeMenu === menuName ? 'var(--color-text-bright)' : 'var(--color-text-normal)',
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
            >
              {menuName}
            </button>
            {activeMenu === menuName && (
              <>
                <div 
                  onClick={() => setActiveMenu(null)}
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                />
                <div style={{
                  position: 'absolute',
                  top: 24,
                  left: 0,
                  background: '#2b2b2b',
                  border: '1px solid #3e3e3e',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  minWidth: 160,
                  zIndex: 20,
                  padding: '4px 0',
                }}>
                  {items.map(item => (
                    <button
                      key={item}
                      onClick={() => handleMenuAction(menuName, item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-normal)',
                        fontSize: 11,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--color-accent)'
                        e.currentTarget.style.color = '#151515'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-normal)'
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--color-border)' }} />

      {/* Segmented View Mode Tabs */}
      <div style={{
        display: 'flex',
        background: '#1a1a1a',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: 2,
        gap: 2,
        margin: '0 8px',
      }}>
        {[
          { id: 'schema', label: 'Schema Designer' },
          { id: 'flow', label: 'Logic Editor' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCanvas(tab.id as 'schema' | 'flow')}
            style={{
              padding: '4px 10px',
              borderRadius: 3,
              border: 'none',
              background: activeCanvas === tab.id ? '#3a3a3a' : 'transparent',
              color: activeCanvas === tab.id ? 'var(--color-text-bright)' : 'var(--color-text-normal)',
              fontSize: 11,
              fontWeight: activeCanvas === tab.id ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s',
            }}
          >
            {tab.id === 'schema' ? (
              <span style={{ color: activeCanvas === 'schema' ? 'var(--color-accent-blue)' : 'inherit' }}>⎔</span>
            ) : (
              <span style={{ color: activeCanvas === 'flow' ? 'var(--color-accent)' : 'inherit' }}>⟳</span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--color-border)' }} />

      {/* Simulation Controls: Run / Stop */}
      {activeCanvas === 'flow' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
          <button
            onClick={() => setSimState({ running: true })}
            disabled={simState.running}
            style={{
              background: simState.running ? '#1c2e24' : '#23382b',
              border: '1px solid #2d4c38',
              color: simState.running ? '#558a69' : '#45b872',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              cursor: simState.running ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run
          </button>

          <button
            onClick={() => resetSim()}
            disabled={!simState.running}
            style={{
              background: simState.running ? '#3b1c1c' : '#251b1b',
              border: '1px solid #572929',
              color: simState.running ? '#ef5f5f' : '#6b4c4c',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              cursor: simState.running ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Stop
          </button>

          {/* Running Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#1a1a1a',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '3px 8px',
            height: 22,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: simState.running ? '#45b872' : '#777777',
              boxShadow: simState.running ? '0 0 8px #45b872' : 'none',
              transition: 'background 0.3s, box-shadow 0.3s',
            }} />
            <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
              SIM: {simState.running ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>
      )}

      {/* Center Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right Side Info & Workspace Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {project && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#1a1a1a',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 11,
            color: 'var(--color-text-normal)',
          }}>
            <Cpu className="w-3.5 h-3.5 text-[#3d8bff]" />
            <span style={{ fontWeight: 600, color: 'var(--color-text-bright)' }}>{project.name}</span>
            <span style={{ color: 'var(--color-text-dim)' }}>|</span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
              {project.platform.toUpperCase()}
            </span>
          </div>
        )}

        {/* Live Build Success Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#45b872', fontSize: 10, background: '#1c2e24', border: '1px solid #2d4c38', padding: '3px 6px', borderRadius: 4 }}>
          <CheckCircle2 className="w-3 h-3 text-[#45b872]" />
          <span>VERIFIED</span>
        </div>

        <button
          onClick={onCodeOpen}
          style={{
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-normal)',
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#444'
            e.currentTarget.style.color = 'var(--color-text-bright)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.color = 'var(--color-text-normal)'
          }}
        >
          <Code className="w-3.5 h-3.5 text-[#e67e22]" /> Code Output
        </button>

        <button
          onClick={() => { localStorage.removeItem('fp_project'); window.location.href = '/' }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-dim)',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-normal)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
        >
          <LogOut className="w-3.5 h-3.5" /> Exit
        </button>
      </div>
    </div>
  )
}
