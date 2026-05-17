'use client'

import { useFlowStore } from '@/store/userFlowStore'

export default function PropertiesPanel() {
  const { selectedNodeId, flowNodes, schemaNodes, updateFlowNodeData, activeCanvas } = useFlowStore()

  const nodes = activeCanvas === 'schema' ? schemaNodes : flowNodes
  const node = nodes.find(n => n.id === selectedNodeId)

  if (!node) {
    return (
      <div style={{
        width: 240,
        height: '100%',
        background: '#111318',
        borderLeft: '1px solid #2a3040',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: 24, opacity: 0.3 }}>◱</div>
        <div style={{ fontSize: 12, color: '#4a5270', textAlign: 'center', lineHeight: 1.6 }}>
          Select a node to<br />inspect properties
        </div>
      </div>
    )
  }

  const data = node.data as Record<string, any>
  const params = data.params as Record<string, string> || {}
  const pins = data.pins as { id: string, label: string }[] || []

  return (
    <div style={{
      width: 240,
      height: '100%',
      background: '#111318',
      borderLeft: '1px solid #2a3040',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #2a3040',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>{data.icon || '◱'}</span>
        <div>
          <div style={{ fontSize: 13, color: '#e4e8f4', fontWeight: 600 }}>{data.label}</div>
          <div style={{ fontSize: 10, color: '#4a5270', marginTop: 2 }}>
            {data.nodeType || data.componentType || 'node'}
          </div>
        </div>
      </div>

      {/* Node ID */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a3040' }}>
        <div style={{ fontSize: 10, color: '#4a5270', marginBottom: 4, letterSpacing: '0.8px' }}>
          NODE ID
        </div>
        <div style={{
          fontSize: 11,
          color: '#26d4c8',
          background: '#0a2b28',
          padding: '4px 8px',
          borderRadius: 4,
        }}>
          {node.id}
        </div>
      </div>

      {/* Params */}
      {Object.keys(params).length > 0 && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a3040' }}>
          <div style={{ fontSize: 10, color: '#4a5270', marginBottom: 10, letterSpacing: '0.8px' }}>
            PARAMETERS
          </div>
          {Object.entries(params).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: '#4a5270', marginBottom: 4 }}>{key}</div>
              <input
                value={val}
                onChange={e => {
                  updateFlowNodeData(node.id, {
                    ...data,
                    params: { ...params, [key]: e.target.value }
                  })
                }}
                style={{
                  width: '100%',
                  background: '#0b0d11',
                  border: '1px solid #2a3040',
                  borderRadius: 5,
                  padding: '6px 8px',
                  color: '#e4e8f4',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#3d8bff'}
                onBlur={e => e.target.style.borderColor = '#2a3040'}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pins (schema nodes) */}
      {pins.length > 0 && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a3040' }}>
          <div style={{ fontSize: 10, color: '#4a5270', marginBottom: 10, letterSpacing: '0.8px' }}>
            PINS
          </div>
          {pins.map(pin => (
            <div key={pin.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: 11,
              color: '#8a94b0',
              borderBottom: '1px solid #1e2330',
            }}>
              <span style={{ color: '#4a5270' }}>{pin.id}</span>
              <span>{pin.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Position */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: '#4a5270', marginBottom: 8, letterSpacing: '0.8px' }}>
          POSITION
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#4a5270', marginBottom: 3 }}>X</div>
            <div style={{
              background: '#0b0d11',
              border: '1px solid #2a3040',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 11,
              color: '#8a94b0',
            }}>
              {Math.round(node.position.x)}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#4a5270', marginBottom: 3 }}>Y</div>
            <div style={{
              background: '#0b0d11',
              border: '1px solid #2a3040',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 11,
              color: '#8a94b0',
            }}>
              {Math.round(node.position.y)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}