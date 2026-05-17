'use client'

import { useFlowStore } from '@/store/userFlowStore'

export default function TopBar({ onCodeOpen }: { onCodeOpen: () => void }) {

  const { simState, setSimState, resetSim, project, activeCanvas, setActiveCanvas } = useFlowStore()


  return (
    <div style={{
      height: 44,
      background: '#111318',
      borderBottom: '1px solid #2a3040',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'monospace',
        fontWeight: 600,
        fontSize: 14,
        color: '#5fa3ff',
        letterSpacing: -0.5,
        marginRight: 4,
      }}>
        ⟨<span style={{ color: '#2fd18b' }}>flow</span>⟩
      </div>

      <div style={{ width: 1, height: 22, background: '#2a3040' }} />

      {/* Project name */}
      {project && (
        <div style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#4a5270',
        }}>
          {project.name}
          <span style={{
            marginLeft: 8,
            background: '#0d2b1a',
            color: '#2fd18b',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
          }}>
            {project.platform}
          </span>
        </div>
      )}

      <div style={{ width: 1, height: 22, background: '#2a3040' }} />

      {/* Canvas tabs */}
      <div style={{
        display: 'flex',
        background: '#0b0d11',
        border: '1px solid #2a3040',
        borderRadius: 7,
        padding: 3,
        gap: 2,
      }}>
        {(['schema', 'flow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveCanvas(tab)}
            style={{
              padding: '4px 14px',
              borderRadius: 5,
              border: 'none',
              background: activeCanvas === tab ? '#1e2d4a' : 'transparent',
              color: activeCanvas === tab ? '#5fa3ff' : '#4a5270',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'schema' ? '⎔ Schema' : '⟳ Flow'}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 22, background: '#2a3040' }} />

      {/* Run controls — only show in flow mode */}
      {activeCanvas === 'flow' && (
        <>
          <button
            onClick={() => setSimState({ running: true })}
            style={{
              background: '#1ab070',
              border: '1px solid #1ab070',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ▶ Run
          </button>

          <button
            onClick={() => resetSim()}
            style={{
              background: '#1e2330',
              border: '1px solid #2a3040',
              color: '#8a94b0',
              fontFamily: 'monospace',
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ■ Stop
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: simState.running ? '#2fd18b' : '#4a5270',
              boxShadow: simState.running ? '0 0 6px #2fd18b' : 'none',
            }} />
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4a5270' }}>
              {simState.running ? 'running' : 'idle'}
            </span>
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Right side */}
      <button
  onClick={onCodeOpen}
  style={{
    background: '#1e2330',
    border: '1px solid #2a3040',
    color: '#8a94b0',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '5px 14px',
    borderRadius: 6,
    cursor: 'pointer',
  }}
>
  {'{ }'} Code
</button>

      <button
        onClick={() => { localStorage.removeItem('fp_project'); window.location.href = '/' }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#4a5270',
          fontFamily: 'monospace',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        ← Exit
      </button>
    </div>
  )

  

  
}
