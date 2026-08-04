'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { Play, Square, Code, LogOut, Cpu } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { SimulationEngine } from '@/lib/compiler/runtime/simulationEngine'
import { GraphToASTCompiler } from '@/lib/compiler/parser/graphParser'

export default function TopBar({ onCodeOpen }: { onCodeOpen: () => void }) {
  const { 
    simState, 
    setSimState, 
    resetSim, 
    project, 
    activeCanvas, 
    setActiveCanvas,
    flowNodes,
    flowEdges,
    schemaNodes,
    schemaEdges,
    subFlows,
    componentPackages,
    activePackageId,
    showSidebar,
    showGrid,
    showMinimap,
    showProperties,
    toggleSidebar,
    toggleGrid,
    toggleMinimap,
    toggleProperties,
    loadProjectState,
    undo,
    redo,
    copySelectedNode,
    cutSelectedNode,
    pasteNode,
    deleteSelectedNode
  } = useFlowStore()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if (isCtrl && e.key.toLowerCase() === 'y') {
        redo();
      } else if (isCtrl && e.key.toLowerCase() === 'c') {
        copySelectedNode();
      } else if (isCtrl && e.key.toLowerCase() === 'x') {
        cutSelectedNode();
      } else if (isCtrl && e.key.toLowerCase() === 'v') {
        pasteNode();
      } else if (e.key === 'Delete') {
        deleteSelectedNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copySelectedNode, cutSelectedNode, pasteNode, deleteSelectedNode]);

  const handleSaveProject = () => {
    if (!project) return
    const projectState = {
      version: "1.5",
      project,
      schemaNodes,
      schemaEdges,
      flowNodes,
      flowEdges,
      subFlows,
      componentPackages
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectState, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `${project.name || 'project'}_flow.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed && parsed.project && parsed.schemaNodes && parsed.flowNodes) {
          loadProjectState({
            project: parsed.project,
            schemaNodes: parsed.schemaNodes,
            schemaEdges: parsed.schemaEdges || [],
            flowNodes: parsed.flowNodes,
            flowEdges: parsed.flowEdges || [],
            subFlows: parsed.subFlows || {},
            componentPackages: parsed.componentPackages || {},
          })
          localStorage.setItem('fp_project', JSON.stringify(parsed.project))
        } else {
          alert("Invalid project file structure.")
        }
      } catch (err) {
        alert("Failed to parse project file.")
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    if (simState.running) {
      try {
        const compiler = new GraphToASTCompiler(flowNodes, flowEdges, subFlows);
        const program = compiler.compile();

        const simEngine = new SimulationEngine();
        simEngine.loadProgram(program, schemaNodes);

        const executeStep = (stepCount: number) => {
          const result = simEngine.step();
          
          if (result.done || result.error) {
            if (result.error) {
              console.error('[SIM ERROR]', result.error);
            }
            setSimState({ running: false, currentNodeId: null });
            return;
          }

          setSimState({
            running: true,
            currentNodeId: result.currentNodeId,
            step: stepCount,
            variables: simEngine.getVariables()
          });

          const stepDelay = result.delayMs !== undefined ? result.delayMs : 1000;
          timeoutId = setTimeout(() => {
            executeStep(stepCount + 1);
          }, stepDelay);
        };

        executeStep(0);
      } catch (e) {
        console.error('[SIM START ERROR]', e);
        setSimState({ running: false, currentNodeId: null });
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
    Board: ['Change Platform...', 'Pin Configuration', 'Flash Firmware'],
    View: ['Toggle Sidebar', 'Toggle Grid', 'Toggle Minimap', 'Toggle Properties', 'Reset Zoom'],
    Help: ['Getting Started', 'Keyboard Shortcuts', 'API Reference', 'About Flow Coder']
  }

  const handleMenuAction = (menu: string, action: string) => {
    setActiveMenu(null)
    if (action === 'Export Arduino C++') {
      onCodeOpen()
    } else if (action === 'Preferences') {
      alert('Preferences Panel: Coming soon!')
    } else if (action === 'New Project') {
      localStorage.removeItem('fp_project')
      window.location.href = '/'
    } else if (action === 'Save Project') {
      handleSaveProject()
    } else if (action === 'Open...') {
      fileInputRef.current?.click()
    } else if (action === 'Toggle Sidebar') {
      toggleSidebar()
    } else if (action === 'Toggle Grid') {
      toggleGrid()
    } else if (action === 'Toggle Minimap') {
      toggleMinimap()
    } else if (action === 'Toggle Properties') {
      toggleProperties()
    } else if (action === 'Undo') {
      undo()
    } else if (action === 'Redo') {
      redo()
    } else if (action === 'Cut') {
      cutSelectedNode()
    } else if (action === 'Copy') {
      copySelectedNode()
    } else if (action === 'Paste') {
      pasteNode()
    } else if (action === 'Delete Node') {
      deleteSelectedNode()
    } else if (action === 'Reset Zoom') {
      window.dispatchEvent(new CustomEvent('flow:reset-zoom'))
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
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />
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
          FLOW-IDE
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
                  top: 26,
                  left: 0,
                  background: 'rgba(23, 26, 33, 0.95)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
                  minWidth: 165,
                  zIndex: 20,
                  padding: '4px 0',
                }}>
                  {items.map(item => {
                    const isChecked = 
                      (menuName === 'View' && item === 'Toggle Sidebar' && showSidebar) ||
                      (menuName === 'View' && item === 'Toggle Grid' && showGrid) ||
                      (menuName === 'View' && item === 'Toggle Minimap' && showMinimap) ||
                      (menuName === 'View' && item === 'Toggle Properties' && showProperties)

                    return (
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
                          e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--color-text-normal)'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ 
                            width: 10, 
                            display: 'inline-block', 
                            color: 'var(--color-accent)', 
                            fontWeight: 'bold',
                            fontSize: 10
                          }}>
                            {isChecked ? '✓' : ''}
                          </span>
                          {item}
                        </span>
                      </button>
                    )
                  })}
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
        background: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 6,
        padding: 3,
        gap: 3,
        margin: '0 8px',
      }}>
        {[
          { id: 'schema', label: 'Schema Designer' },
          { id: 'flow', label: 'Logic Editor' }
        ].map(tab => {
          const isActive = activeCanvas === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCanvas(tab.id as 'schema' | 'flow')}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                border: 'none',
                background: isActive ? 'var(--color-accent)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--color-text-normal)',
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-bright)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-normal)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {tab.id === 'schema' ? (
                <span style={{ color: isActive ? '#ffffff' : 'var(--color-accent-blue)', fontSize: 12 }}>⎔</span>
              ) : (
                <span style={{ color: isActive ? '#ffffff' : 'var(--color-accent-blue)', fontSize: 12 }}>⟳</span>
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      <div style={{ width: 1, height: 18, background: 'rgba(255, 255, 255, 0.07)' }} />

      {/* Simulation Controls: Run / Stop (Hidden as feature is in progress) */}
      {activeCanvas === 'flow' && (
        <div style={{ display: 'none', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
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

      {/* Package Validation Status */}
      {activeCanvas === 'flow' && activePackageId && componentPackages[activePackageId] && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: (componentPackages[activePackageId].validationErrors || []).length > 0 ? '#3b1c1c' : '#1c2e24',
            border: `1px solid ${(componentPackages[activePackageId].validationErrors || []).length > 0 ? '#572929' : '#2d4c38'}`,
            borderRadius: 4,
            padding: '3px 8px',
            height: 22,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: (componentPackages[activePackageId].validationErrors || []).length > 0 ? '#ef5f5f' : '#45b872',
              boxShadow: (componentPackages[activePackageId].validationErrors || []).length > 0 ? '0 0 8px #ef5f5f' : '0 0 8px #45b872',
            }} />
            <span style={{ 
              fontSize: 10, 
              fontWeight: 700, 
              color: (componentPackages[activePackageId].validationErrors || []).length > 0 ? '#ef5f5f' : '#45b872',
              fontFamily: 'monospace' 
            }}>
              PACKAGE VALIDATION: {(componentPackages[activePackageId].validationErrors || []).length > 0 
                ? `${(componentPackages[activePackageId].validationErrors || []).length} WARNINGS` 
                : 'PASS'}
            </span>
          </div>
          
          {/* Display details tooltip/popover when hovered/clicked if there are warnings */}
          {(componentPackages[activePackageId].validationErrors || []).length > 0 && (
            <span style={{ fontSize: 9.5, color: '#ef5f5f', fontStyle: 'italic', marginLeft: 4 }}>
              ({(componentPackages[activePackageId].validationErrors || []).map(e => e.message).join(', ')})
            </span>
          )}
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
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 4,
            padding: '4px 10px',
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

        <button
          onClick={onCodeOpen}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: 'none',
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
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--color-text-bright)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
            e.currentTarget.style.color = 'var(--color-text-normal)'
          }}
        >
          <Code className="w-3.5 h-3.5 text-[#e66e19]" /> Code Output
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
