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

  const { selectedNodeId, simState, project, documents, activeDocumentId, activeCanvas, subFlowStack } = useFlowStore()
  const activeDocument = documents.find(d => d.id === activeDocumentId) || documents[0]

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
      
      {/* Bottom Status Bar (Blender/Photoshop Style) */}
      <div style={{
        height: 22,
        background: '#151515',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        fontSize: 10,
        color: 'var(--color-text-dim)',
        userSelect: 'none',
        zIndex: 50,
      }}>
        {/* Left: Selection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            background: selectedNodeId ? 'var(--color-accent)' : '#2b2b2b',
            color: selectedNodeId ? '#151515' : 'var(--color-text-dim)',
            padding: '1px 5px',
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 9,
            transition: 'all 0.15s',
          }}>
            {selectedNodeId ? 'SELECT' : 'READY'}
          </span>
          <span style={{ fontFamily: 'monospace' }}>
            {selectedNodeId ? `Active Node: ${selectedNodeId}` : 'No node selected'}
          </span>
        </div>

        {/* Center: System specs */}
        <div>
          Workspace: <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{project?.name || 'Loading'}</span>
          <span style={{ margin: '0 6px' }}>|</span>
          Target: <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{project?.platform ? project.platform.toUpperCase() : 'ARDUINO'}</span>
          <span style={{ margin: '0 6px' }}>|</span>
          View: <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{(activeDocument?.title || activeCanvas || '').toUpperCase()}</span>
          {subFlowStack.length > 0 && (
            <>
              <span style={{ margin: '0 6px' }}>|</span>
              Depth: <span style={{ color: '#5fa3ff', fontWeight: 600 }}>SUB-FLOW L{subFlowStack.length}</span>
            </>
          )}
        </div>

        {/* Right: Simulation State & Help Tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontStyle: 'italic' }}>
            Tip: Drag components to canvas & connect solder joint handles
          </span>
          <span style={{
            background: simState.running ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${simState.running ? '#2ecc71' : '#333'}`,
            color: simState.running ? '#2ecc71' : 'var(--color-text-dim)',
            padding: '0 6px',
            borderRadius: 3,
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 9,
          }}>
            SIM: {simState.running ? 'ACTIVE' : 'IDLE'}
          </span>
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