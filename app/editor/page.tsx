'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FlowCanvas from '@/components/editor/FlowCanvas'
import Sidebar from '@/components/editor/Sidebar'
import TopBar from '@/components/editor/TopBar'
import SchemaCanvas from '@/components/schema/SchemaCanvas'
import { useFlowStore } from '@/store/userFlowStore'
import PropertiesPanel from '@/components/editor/PropertiesPanel'
import CodePanel, { InlineCodeEditor } from '@/components/editor/CodePanel'
import WorkspaceTabBar from '@/components/editor/WorkspaceTabBar'
import ActivityBar from '@/components/editor/ActivityBar'
import PreferencesModal from '@/components/settings/PreferencesModal'
import DockablePanel from '@/components/windowManager/DockablePanel'
import ResizeHandle from '@/components/windowManager/ResizeHandle'
import FloatLayer from '@/components/windowManager/FloatLayer'
import { usePanelStore } from '@/store/usePanelStore'
import { PanelId } from '@/lib/windowManager/types'

import { useSettingsStore } from '@/store/useSettingsStore'
import { 
  GitBranch, 
  AlertCircle, 
  AlertTriangle, 
  Cpu, 
  Workflow, 
  Activity, 
  CheckCircle2, 
  Layers 
} from 'lucide-react'

export default function EditorPage() {
  const { setProject } = useFlowStore()
  const router = useRouter()
  const [codeOpen, setCodeOpen] = useState(false)
  const initSettings = useSettingsStore((s) => s.initSettings)

  useEffect(() => {
    initSettings()
  }, [initSettings])

  useEffect(() => {
    const raw = localStorage.getItem('fp_project')
    if (!raw) { router.push('/'); return }
    setProject(JSON.parse(raw))
  }, [router, setProject])

  const { 
    selectedNodeId, 
    simState, 
    project, 
    documents, 
    activeDocumentId, 
    activeCanvas, 
    subFlowStack,
    flowNodes,
    schemaNodes,
  } = useFlowStore()
  const activeDocument = documents.find(d => d.id === activeDocumentId) || documents[0]

  const selectedNode = selectedNodeId 
    ? (activeCanvas === 'schema' 
        ? schemaNodes.find(n => n.id === selectedNodeId)
        : flowNodes.find(n => n.id === selectedNodeId))
    : null
  const selectedLabel = selectedNode 
    ? ((selectedNode.data as any)?.label || (selectedNode.data as any)?.params?.name || selectedNode.id)
    : null

  // Handle window beforeunload if confirmUnsaved is enabled and dirty tabs exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const confirmUnsaved = useSettingsStore.getState().settings.general.confirmUnsaved
      const hasDirty = documents.some(d => d.dirty)
      if (confirmUnsaved && hasDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [documents])

  // Read authoritative window manager panel layout state
  const panels = usePanelStore((s) => s.panels)
  const validateViewportBounds = usePanelStore((s) => s.validateViewportBounds)

  // Validate floating viewport bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      validateViewportBounds()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [validateViewportBounds])

  // Synchronize userFlowStore with window manager visibility state
  useEffect(() => {
    useFlowStore.setState({
      showSidebar: panels.sidebar.isVisible,
      showProperties: panels.properties.isVisible,
    })
  }, [panels.sidebar.isVisible, panels.properties.isVisible])

  // Map panel ID to panel content component
  const renderPanelContent = (id: PanelId) => {
    switch (id) {
      case 'sidebar':
        return <Sidebar />
      case 'properties':
        return <PropertiesPanel />
      default:
        return null
    }
  }

  // Filter visible panels by actual dock position
  const visiblePanels = Object.values(panels).filter((p) => p.isVisible)
  const leftDockPanels = visiblePanels.filter((p) => p.dockPosition === 'left')
  const rightDockPanels = visiblePanels.filter((p) => p.dockPosition === 'right')
  const bottomDockPanels = visiblePanels.filter((p) => p.dockPosition === 'bottom')
  const floatingPanels = visiblePanels.filter((p) => p.dockPosition === 'float')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: 'var(--color-bg-base)' }}>
      <TopBar onCodeOpen={() => setCodeOpen(true)} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ActivityBar />

        {/* Dynamic Left Dock Region */}
        {leftDockPanels.map((p) => (
          <div key={p.id} style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
            <DockablePanel id={p.id as PanelId}>
              {renderPanelContent(p.id as PanelId)}
            </DockablePanel>
            <ResizeHandle panelId={p.id as PanelId} side="left" />
          </div>
        ))}

        {/* Central Workspace Column (Canvas + Dynamic Bottom Dock Region) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Primary Center Workspace — ALWAYS occupies remaining available space */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <WorkspaceTabBar />
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {activeDocument?.type === 'schema' ? (
                <SchemaCanvas />
              ) : activeDocument?.type === 'code' ? (
                <InlineCodeEditor />
              ) : (
                <FlowCanvas />
              )}
            </div>
          </div>

          {/* Dynamic Bottom Dock Region */}
          {bottomDockPanels.map((p) => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', width: '100%', flexShrink: 0 }}>
              <ResizeHandle panelId={p.id as PanelId} side="bottom" />
              <DockablePanel id={p.id as PanelId}>
                {renderPanelContent(p.id as PanelId)}
              </DockablePanel>
            </div>
          ))}
        </div>

        {/* Dynamic Right Dock Region */}
        {rightDockPanels.map((p) => (
          <div key={p.id} style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
            <ResizeHandle panelId={p.id as PanelId} side="right" />
            <DockablePanel id={p.id as PanelId}>
              {renderPanelContent(p.id as PanelId)}
            </DockablePanel>
          </div>
        ))}
      </div>
      
      {/* IDE Status Bar */}
      <div style={{
        height: 24,
        background: '#0d1117',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: 11,
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-dim)',
        userSelect: 'none',
        zIndex: 50,
      }}>
        {/* Left Segment: VCS, Diagnostics, Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Git Branch */}
          <div
            title="Git Branch: master"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <GitBranch className="w-3 h-3 text-[#38bdf8]" />
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>master</span>
          </div>

          {/* Diagnostics / Problems */}
          <div
            title="Problems: 0 errors, 0 warnings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <AlertCircle className="w-3 h-3 text-[#10b981]" />
              <span style={{ color: '#94a3b8' }}>0</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <AlertTriangle className="w-3 h-3 text-[#f59e0b]" />
              <span style={{ color: '#94a3b8' }}>0</span>
            </div>
          </div>

          <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

          {/* Active Selection */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            {selectedLabel ? (
              <>
                <Layers className="w-3 h-3 text-[#38bdf8]" />
                <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{selectedLabel}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                <span style={{ color: '#94a3b8' }}>Ready</span>
              </>
            )}
          </div>
        </div>

        {/* Right Segment: Board Target, Document View, Simulation, Encoding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Target Board */}
          <div
            title={`Target Architecture: ${project?.hardware?.targetId || project?.platform || 'Arduino Uno (ATmega328P)'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Cpu className="w-3 h-3 text-[#00c4b4]" />
            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
              {project?.hardware?.targetId || (project?.platform ? project.platform.toUpperCase() : 'Arduino Uno (ATmega328P)')}
            </span>
          </div>

          <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

          {/* Active Canvas / View */}
          <div
            title={`Active Workspace: ${activeDocument?.title || 'Main Flow'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            <Workflow className="w-3 h-3 text-[#f59e0b]" />
            <span style={{ color: '#cbd5e1' }}>
              {String(activeDocument?.title || 'Main Flow').replace(/^(📦|🔓)\s*/, '')}
            </span>
            {subFlowStack.length > 0 && (
              <span style={{ color: '#38bdf8', fontSize: 10, fontWeight: 700 }}>
                (L{subFlowStack.length})
              </span>
            )}
          </div>

          <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

          {/* Simulation Status */}
          <div
            title={`Simulation Engine: ${simState.running ? 'Running' : 'Idle'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 3,
            }}
          >
            <Activity className="w-3 h-3" style={{ color: simState.running ? '#22c55e' : '#64748b' }} />
            <span style={{ color: simState.running ? '#22c55e' : '#94a3b8' }}>
              Sim: {simState.running ? 'Running' : 'Idle'}
            </span>
          </div>

          <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.1)', margin: '0 2px' }} />

          {/* Encoding */}
          <div
            style={{
              padding: '2px 8px',
              color: '#94a3b8',
              fontSize: 11,
            }}
          >
            UTF-8
          </div>
        </div>
      </div>

      {codeOpen && <CodePanel onClose={() => setCodeOpen(false)} />}
      <PreferencesModal />

      {/* Float Layer — portal target container */}
      <FloatLayer />
      {/* Floating panels */}
      {floatingPanels.map((p) => (
        <DockablePanel key={p.id} id={p.id as PanelId}>
          {renderPanelContent(p.id as PanelId)}
        </DockablePanel>
      ))}
    </div>
  )
}