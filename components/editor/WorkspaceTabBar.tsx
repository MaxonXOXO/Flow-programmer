'use client'

import { useFlowStore, SubflowDocument } from '@/store/userFlowStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { Zap, Box, FileCode, FileText, FileJson, X, Plus, Cpu, Braces, Lock, Unlock } from 'lucide-react'

export default function WorkspaceTabBar() {
  const { documents, activeDocumentId, setActiveDocument, closeDocument, openDocument, createFunctionNode, flowNodes, subFlows } = useFlowStore()

  const getDocumentDisplayTitle = (doc: typeof documents[0]) => {
    if (doc.type === 'function' && doc.targetId) {
      let fnNode = flowNodes.find(n => n.id === doc.targetId)
      if (!fnNode) {
        for (const sfId of Object.keys(subFlows)) {
          const found = subFlows[sfId].nodes.find(n => n.id === doc.targetId)
          if (found) { fnNode = found; break }
        }
      }
      const rawName = (fnNode?.data as any)?.params?.name || (fnNode?.data as any)?.label
      if (rawName) {
        const cleanName = String(rawName).replace(/\(\)$/, '')
        return `${cleanName}()`
      }
    }
    if (doc.type === 'subflow') {
      const subDoc = doc as SubflowDocument
      const title = subDoc.title || subDoc.packageId
      if (subDoc.readOnly === false || subDoc.unlocked) {
        return title.startsWith('🔓') ? title : `🔓 ${title.replace(/^📦\s*/, '')}`
      }
      return title.startsWith('📦') ? title : `📦 ${title}`
    }
    return String(doc.title).replace(/^(ƒ|<>|📄|⚙)\s*/, '')
  }

  const handleAddNewFunction = () => {
    createFunctionNode()
  }

  const getTabColor = (type: string, id: string) => {
    if (type === 'schema') return '#94a3b8' // Schema (slate/white)
    if (id === 'main_flow' || type === 'flow') return '#f59e0b' // Main Flow (amber yellow)
    if (type === 'function') return '#a855f7' // Function (purple)
    if (type === 'subflow') return '#38bdf8' // Component Subflow (sky blue)
    if (type === 'code' || id.startsWith('code_')) return '#f97316' // Code/Generated (orange)
    return '#3b82f6'
  }

  return (
    <div
      style={{
        height: 35,
        background: '#12141a',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 4,
        paddingRight: 8,
        userSelect: 'none',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 0 }}>
        {documents.map((doc) => {
          const isActive = activeDocumentId === doc.id
          const tabColor = getTabColor(doc.type, doc.id)
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDocument(doc.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                height: 35,
                padding: '0 12px',
                background: isActive ? 'var(--color-bg-base)' : 'transparent',
                borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                borderTop: isActive ? `2px solid ${tabColor}` : '2px solid transparent',
                color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-dim)',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.color = 'var(--color-text-normal)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-dim)'
                }
              }}
            >
              {/* Document Type Indicator Dot */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: tabColor,
                  opacity: isActive ? 1 : 0.5,
                  boxShadow: isActive ? `0 0 6px ${tabColor}` : 'none',
                  transition: 'all 0.15s',
                }}
              />

              {/* Document Icon */}
              <span style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
              }}>
                {doc.type === 'schema' ? (
                  <Cpu className="w-3.5 h-3.5 text-[#94a3b8]" />
                ) : doc.type === 'flow' ? (
                  <Zap className="w-3.5 h-3.5 text-[#f59e0b]" />
                ) : doc.type === 'function' ? (
                  <Braces className="w-3.5 h-3.5 text-[#a855f7]" />
                ) : doc.type === 'subflow' ? (
                  (doc as SubflowDocument).readOnly === false || (doc as SubflowDocument).unlocked ? (
                    <Unlock className="w-3.5 h-3.5 text-[#22c55e]" />
                  ) : (
                    <Box className="w-3.5 h-3.5 text-[#3b82f6]" />
                  )
                ) : doc.id === 'code_wiring' ? (
                  <FileText className="w-3.5 h-3.5 text-[#38bdf8]" />
                ) : doc.id === 'code_pinmap' ? (
                  <FileJson className="w-3.5 h-3.5 text-[#a855f7]" />
                ) : doc.type === 'code' ? (
                  <FileCode className="w-3.5 h-3.5 text-[#f97316]" />
                ) : (
                  <Box className="w-3.5 h-3.5 text-[#22c55e]" />
                )}
              </span>

              {/* Title */}
              <span>{getDocumentDisplayTitle(doc)}</span>

              {/* Dirty indicator */}
              {doc.dirty && (
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  marginLeft: 2,
                }} />
              )}

              {/* Close Button if closable */}
              {doc.closable !== false && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const confirmUnsaved = useSettingsStore.getState().settings.general.confirmUnsaved
                    if (doc.dirty && confirmUnsaved) {
                      const confirmed = window.confirm(`Tab "${getDocumentDisplayTitle(doc)}" has unsaved changes. Are you sure you want to close it?`)
                      if (!confirmed) return
                    }
                    closeDocument(doc.id)
                  }}
                  title="Close Tab"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-dim)',
                    fontSize: 10,
                    cursor: 'pointer',
                    borderRadius: 3,
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 2,
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 95, 95, 0.2)'
                    e.currentTarget.style.color = '#ef5f5f'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-dim)'
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* Plus (+) Button for opening/creating tab */}
        <button
          onClick={handleAddNewFunction}
          title="New Function Document"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            marginLeft: 6,
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--color-text-bright)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-dim)'
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
