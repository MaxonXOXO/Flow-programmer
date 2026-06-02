'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FlowCanvas from '@/components/editor/FlowCanvas'
import Sidebar from '@/components/editor/Sidebar'
import TopBar from '@/components/editor/TopBar'
import SchemaCanvas from '@/components/schema/SchemaCanvas'
import { useFlowStore } from '@/store/userFlowStore'
import PropertiesPanel from '@/components/editor/PropertiesPanel'
import CodePanel from '@/components/editor/CodePanel'

export default function EditorPage() {
  const { setProject } = useFlowStore()
  const router = useRouter()
  const [codeOpen, setCodeOpen] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('fp_project')
    if (!raw) { router.push('/'); return }
    setProject(JSON.parse(raw))
  }, [router, setProject])

  const { selectedNodeId, simState, project, activeCanvas, showSidebar, showProperties, subFlowStack } = useFlowStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: 'var(--color-bg-base)' }}>
      <TopBar onCodeOpen={() => setCodeOpen(true)} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showSidebar && <Sidebar />}
        <div style={{ flex: 1 }}>
          {activeCanvas === 'schema' ? <SchemaCanvas /> : <FlowCanvas />}
        </div>
        {showProperties && <PropertiesPanel />}
      </div>
      
      {/* Bottom Status Bar (Blender/Photoshop Style) */}
      <div style={{
        height: 22,
        background: '#151515',
        borderTop: '1px solid var(--color-border)',
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
          Target: <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{project?.platform.toUpperCase() || 'Arduino'}</span>
          <span style={{ margin: '0 6px' }}>|</span>
          View: <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{activeCanvas.toUpperCase()}</span>
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
    </div>
  )
}