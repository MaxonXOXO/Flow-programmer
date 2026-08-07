'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { Play, Square, Code, LogOut, Cpu, Zap, Box, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { SimulationEngine } from '@/lib/compiler/runtime/simulationEngine'
import { GraphToASTCompiler } from '@/lib/compiler/parser/graphParser'
import { exportProjectFromState, serializeProject, importProject, extractStoreState } from '@/lib/project/projectManager'
import { useSettingsStore } from '@/store/useSettingsStore'

export default function TopBar({ onCodeOpen }: { onCodeOpen: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { 
    simState, 
    setSimState, 
    resetSim, 
    project, 
    activeCanvas, 
    setActiveCanvas,
    documents,
    activeDocumentId,
    setActiveDocument,
    closeDocument,
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
    undo,
    redo,
    copySelectedNode,
    cutSelectedNode,
    pasteNode,
    deleteSelectedNode,
    loadProjectState
  } = useFlowStore()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  // Keyboard shortcut listeners for Undo / Redo / Cut / Copy / Paste / Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        useSettingsStore.getState().openPreferences()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          redo()
        } else {
          e.preventDefault()
          undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copySelectedNode()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        cutSelectedNode()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteNode()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelectedNode()
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copySelectedNode, cutSelectedNode, pasteNode, deleteSelectedNode]);

  const handleSaveProject = () => {
    if (!project) return
    const flowProject = exportProjectFromState({
      project,
      schemaNodes,
      schemaEdges,
      flowNodes,
      flowEdges,
      subFlows,
      componentPackages
    })
    const jsonStr = serializeProject(flowProject)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr)
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `${project.name || 'project'}.flow`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const result = importProject(content)
      if (result.success && result.project) {
        loadProjectState(extractStoreState(result.project))
        localStorage.setItem('fp_project', JSON.stringify({ name: result.project.metadata.name, platform: result.project.board.id }))
      } else {
        alert(`Failed to load project file:\n\n${(result.errors || ['Invalid project format.']).join('\n')}`)
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
      useSettingsStore.getState().openPreferences()
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
        <img
          src="/flowide.png"
          alt="Flow-IDE Logo"
          style={{
            width: 22,
            height: 22,
            objectFit: 'contain',
          }}
        />
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".flow,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
