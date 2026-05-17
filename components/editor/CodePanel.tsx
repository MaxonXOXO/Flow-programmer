'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFlowStore } from '@/store/userFlowStore'
import { generateArduinoCode } from '@/lib/codegen/generateArduino'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function CodePanel({ onClose }: { onClose: () => void }) {
  const { schemaNodes, schemaEdges, flowNodes, flowEdges } = useFlowStore()
  const [code, setCode] = useState('')

  useEffect(() => {
    const generated = generateArduinoCode(schemaNodes, schemaEdges, flowNodes, flowEdges)
    setCode(generated)
  }, [schemaNodes, schemaEdges, flowNodes, flowEdges])

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sketch.ino'
    a.click()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '70vw',
        height: '80vh',
        background: '#111318',
        border: '1px solid #2a3040',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #2a3040',
          gap: 12,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#5fa3ff' }}>
            sketch.ino
          </span>
          <span style={{
            fontSize: 10,
            background: '#0d2b1a',
            color: '#2fd18b',
            padding: '2px 8px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}>
            Arduino Uno
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleExport}
            style={{
              background: '#2fd18b',
              border: 'none',
              color: '#0b0d11',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ↓ Export .ino
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2a3040',
              color: '#8a94b0',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1 }}>
          <MonacoEditor
            height="100%"
            language="cpp"
            theme="vs-dark"
            value={code}
            onChange={val => setCode(val || '')}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              padding: { top: 16 },
            }}
          />
        </div>
      </div>
    </div>
  )
}