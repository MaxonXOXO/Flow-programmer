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

export default function EditorPage() {
  const { setProject } = useFlowStore()
  const router = useRouter()
  const [codeOpen, setCodeOpen] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('fp_project')
    if (!raw) { router.push('/'); return }
    setProject(JSON.parse(raw))
  }, [router, setProject])

  const { selectedNodeId, simState, project, documents, activeDocumentId, activeCanvas, showSidebar, showProperties, subFlowStack, schemaNodes, schemaEdges, flowNodes, flowEdges } = useFlowStore()
  const activeDocument = documents.find(d => d.id === activeDocumentId) || documents[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: 'var(--color-bg-base)' }}>
      <TopBar onCodeOpen={() => setCodeOpen(true)} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ActivityBar />
        {showSidebar && <Sidebar />}
        
        {/* Center Canvas Area with VS Code Style Tab Bar at Top */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

        {showProperties && <PropertiesPanel />}
      </div>
      
      {/* ── Status Bar (VS Code / JetBrains Style) ──────────────────────────── */}
      <div style={{
        height: 24,
        background: '#0d1017',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: 11,
        color: 'var(--color-text-dim)',
        fontFamily: 'var(--font-mono)',
        userSelect: 'none',
        zIndex: 50,
        gap: 8,
      }}>
        {/* ── Left Cluster ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0, flexShrink: 0 }}>
          {/* Mode badge (accent color like VS Code branch bar) */}
          <div style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 8px',
            marginLeft: -8,
            background: selectedNodeId
              ? 'var(--color-accent)'
              : simState.running
              ? '#2ecc71'
              : 'var(--color-accent)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 10.5,
            letterSpacing: '0.3px',
            cursor: 'default',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M13 3.5C13 4.88 11.88 6 10.5 6C9.97 6 9.49 5.83 9.09 5.55L6.55 9.09C6.83 9.49 7 9.97 7 10.5C7 11.88 5.88 13 4.5 13C3.12 13 2 11.88 2 10.5C2 9.12 3.12 8 4.5 8C5.03 8 5.51 8.17 5.91 8.45L8.45 4.91C8.17 4.51 8 4.03 8 3.5C8 2.12 9.12 1 10.5 1C11.88 1 13 2.12 13 3.5Z" fill="currentColor" opacity="0.9"/>
            </svg>
            {selectedNodeId ? 'EDITING' : simState.running ? 'SIMULATING' : 'READY'}
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />

          {/* Git-style branch indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-normal)', cursor: 'default' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" opacity="0.7">
              <path d="M11.75 5a.75.75 0 01.75.75v.5c0 .414-.336.75-.75.75h-.5a.75.75 0 01-.75-.75v-.5a.75.75 0 01.75-.75h.5zm-7.5 0a.75.75 0 01.75.75v.5c0 .414-.336.75-.75.75h-.5A.75.75 0 013.5 6.25v-.5A.75.75 0 014.25 5h.5zM8 12.25a.75.75 0 01-.75-.75V9.5a.75.75 0 011.5 0v2a.75.75 0 01-.75.75zM5 7.5v1A1.5 1.5 0 006.5 10H7v1.5a.75.75 0 001.5 0V10h.5A1.5 1.5 0 0010.5 8.5v-1H12V5.75A1.75 1.75 0 0010.25 4h-.5A1.75 1.75 0 008 5.75V7.5H7V5.75A1.75 1.75 0 005.25 4h-.5A1.75 1.75 0 003 5.75V7.5h2z"/>
            </svg>
            <span style={{ fontSize: 10.5 }}>main</span>
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />

          {/* Node count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'default' }}>
            <span style={{ fontSize: 10.5 }}>
              {(() => {
                const nodes = activeCanvas === 'schema' ? schemaNodes : (subFlowStack.length > 0 ? (useFlowStore.getState().subFlows[subFlowStack[subFlowStack.length - 1]]?.nodes || []) : flowNodes)
                const edges = activeCanvas === 'schema' ? schemaEdges : (subFlowStack.length > 0 ? (useFlowStore.getState().subFlows[subFlowStack[subFlowStack.length - 1]]?.edges || []) : flowEdges)
                return `${nodes.length} nodes · ${edges.length} connections`
              })()}
            </span>
          </div>
        </div>

        {/* ── Center Cluster ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 10.5,
          color: 'var(--color-text-dim)',
          flex: 1,
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <span>
            <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{project?.name || 'untitled'}</span>
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
              <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
              <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
            </svg>
            <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>{project?.platform?.toUpperCase() || 'ARDUINO UNO'}</span>
          </span>
          {selectedNodeId && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ color: '#5fa3ff' }}>{selectedNodeId}</span>
            </>
          )}
        </div>

        {/* ── Right Cluster ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0, flexShrink: 0 }}>
          {/* Active View */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px', cursor: 'default' }}>
            <span style={{ fontSize: 10.5 }}>
              {(activeDocument?.title || (activeCanvas === 'schema' ? 'Schematic' : 'Flow Canvas')).toUpperCase()}
            </span>
          </div>

          {/* Sub-flow depth indicator */}
          {subFlowStack.length > 0 && (
            <>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '0 5px',
                color: '#5fa3ff', fontSize: 10.5, fontWeight: 600,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 004 4h12"/>
                </svg>
                L{subFlowStack.length}
              </div>
            </>
          )}

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

          {/* Simulation status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px',
            color: simState.running ? '#2ecc71' : 'var(--color-text-dim)',
            cursor: 'default',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: simState.running ? '#2ecc71' : 'rgba(255,255,255,0.2)',
              boxShadow: simState.running ? '0 0 6px #2ecc71' : 'none',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 10.5 }}>{simState.running ? 'SIM' : 'IDLE'}</span>
          </div>

          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

          {/* Build version */}
          <div style={{ padding: '0 4px', fontSize: 10, opacity: 0.5, cursor: 'default' }}>
            v1.5.0
          </div>
        </div>
      </div>

      {codeOpen && <CodePanel onClose={() => setCodeOpen(false)} />}
      <PreferencesModal />
    </div>
  )
}