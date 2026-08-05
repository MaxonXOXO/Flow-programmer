'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { Zap, Box, Code, X, Plus } from 'lucide-react'

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
        return `ƒ ${cleanName}`
      }
    }
    return doc.title
  }

  const handleAddNewFunction = () => {
    createFunctionNode()
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
                borderTop: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
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
              {/* Document Icon */}
              <span style={{
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
              }}>
                {doc.type === 'schema' ? (
                  <span style={{ color: isActive ? '#60a5fa' : 'var(--color-text-dim)', fontSize: 13, fontWeight: 700 }}>⎔</span>
                ) : doc.type === 'flow' ? (
                  <Zap className="w-3.5 h-3.5 text-[#fbbf24]" />
                ) : doc.type === 'function' ? (
                  <span style={{ color: '#a855f7', fontWeight: 800, fontSize: 12 }}>ƒ</span>
                ) : doc.type === 'subflow' ? (
                  <Box className="w-3.5 h-3.5 text-[#3b82f6]" />
                ) : doc.type === 'code' ? (
                  <Code className="w-3.5 h-3.5 text-[#e66e19]" />
                ) : (
                  <span style={{ color: '#22c55e' }}>▶</span>
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
