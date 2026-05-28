'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'

interface BaseNodeData {
  label: string
  params?: Record<string, string>
  nodeType?: string
  icon?: string
}

const typeColors: Record<string, any> = {
  start:     { bg: '#0d2b1a', border: '#2fd18b', accent: '#2fd18b', badge: '#0a2216' },
  end:       { bg: '#0d1a2b', border: '#3d8bff', accent: '#3d8bff', badge: '#0a1628' },
  condition: { bg: '#2b1f0a', border: '#f5a623', accent: '#f5a623', badge: '#231a08' },
  loop:      { bg: '#1a0d2b', border: '#9b6cff', accent: '#9b6cff', badge: '#150a23' },
  variable:  { bg: '#0a2b28', border: '#26d4c8', accent: '#26d4c8', badge: '#082320' },
  function:  { bg: '#2b0d0d', border: '#e85050', accent: '#e85050', badge: '#230a0a' },
  print:     { bg: '#0d2b1a', border: '#2fd18b', accent: '#2fd18b', badge: '#0a2216' },
  sensor:    { bg: '#0d2b1a', border: '#5effc3', accent: '#5effc3', badge: '#0a2216' },
  delay:     { bg: '#1a1e2b', border: '#8a94b0', accent: '#8a94b0', badge: '#141720' },
  gpio:      { bg: '#0d1a2b', border: '#3d8bff', accent: '#3d8bff', badge: '#0a1628' },
  api:       { bg: '#2b0d0d', border: '#e85050', accent: '#e85050', badge: '#230a0a' },
  input:     { bg: '#0d1a2b', border: '#3d8bff', accent: '#3d8bff', badge: '#0a1628' },
}

// Define named ports for each node type
const NODE_PORTS: Record<string, { ins: string[], outs: string[] }> = {
  start:     { ins: [],               outs: ['flow'] },
  end:       { ins: ['flow'],         outs: [] },
  variable:  { ins: ['flow'],         outs: ['flow'] },
  print:     { ins: ['flow'],         outs: ['flow'] },
  delay:     { ins: ['flow'],         outs: ['flow'] },
  gpio:      { ins: ['flow'],         outs: ['flow'] },
  sensor:    { ins: ['flow'],         outs: ['flow'] },
  input:     { ins: ['flow'],         outs: ['flow'] },
  function:  { ins: ['flow'],         outs: ['flow'] },
  condition: { ins: ['flow'],         outs: ['true', 'false'] },
  loop:      { ins: ['flow'],         outs: ['body', 'done'] },
  api:       { ins: ['flow'],         outs: ['flow'] },
}

export default function BaseNode({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData
  const colors = typeColors[nodeData.nodeType || 'start'] || typeColors.start
  const params = nodeData.params || {}
  const ports = NODE_PORTS[nodeData.nodeType || 'start'] || { ins: ['flow'], outs: ['flow'] }

  const portColor = (port: string) => {
    if (port === 'true') return '#2fd18b'
    if (port === 'false') return '#e85050'
    if (port === 'body') return '#9b6cff'
    if (port === 'done') return '#3d8bff'
    return colors.accent
  }

  return (
    <div style={{
      background: colors.bg,
      border: `1.5px solid ${selected ? colors.accent : colors.border}`,
      borderRadius: 10,
      minWidth: 200,
      fontFamily: 'var(--font-sans, sans-serif)',
      boxShadow: selected ? `0 0 0 2px ${colors.accent}33` : '0 4px 20px rgba(0,0,0,0.4)',
      position: 'relative',
    }}>

      {/* Input ports — left side */}
      <div style={{
        position: 'absolute',
        left: -1,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
        transform: 'translateX(-50%)',
      }}>
        {ports.ins.map(port => (
          <div key={port} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Handle
              type="target"
              position={Position.Left}
              id={port}
              style={{
                position: 'relative',
                transform: 'none',
                left: 'auto',
                top: 'auto',
                width: 10,
                height: 10,
                background: portColor(port),
                border: 'none',
                borderRadius: 2,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 12px 8px',
        borderBottom: Object.keys(params).length > 0 ? `1px solid ${colors.border}22` : 'none',
        borderRadius: '9px 9px 0 0',
      }}>
        <div style={{
          background: colors.badge,
          color: colors.accent,
          borderRadius: 5,
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontFamily: 'monospace',
        }}>
          {nodeData.icon || '●'}
        </div>
        <span style={{ color: '#e4e8f4', fontWeight: 500, fontSize: 13, flex: 1 }}>
          {nodeData.label}
        </span>
        <span style={{
          background: colors.badge,
          color: colors.accent,
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 4,
          fontFamily: 'monospace',
        }}>
          {nodeData.nodeType}
        </span>
      </div>

      {/* Params */}
      {Object.keys(params).length > 0 && (
        <div style={{ padding: '10px 12px' }}>
          {Object.entries(params).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 6 }}>
              <div style={{
                fontSize: 11,
                color: '#4a5270',
                fontFamily: 'monospace',
                marginBottom: 3,
              }}>
                {key}
              </div>
              <div style={{
                background: '#0a0a0f',
                border: '1px solid #2a3040',
                borderRadius: 5,
                padding: '4px 8px',
                fontSize: 12,
                color: '#e4e8f4',
                fontFamily: 'monospace',
              }}>
                {val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Output ports — right side with labels */}
      <div style={{
        position: 'absolute',
        right: -1,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
        transform: 'translateX(50%)',
      }}>
        {ports.outs.map(port => (
          <div key={port} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexDirection: 'row-reverse',
          }}>
            <Handle
              type="source"
              position={Position.Right}
              id={port}
              style={{
                position: 'relative',
                transform: 'none',
                right: 'auto',
                top: 'auto',
                width: 10,
                height: 10,
                background: portColor(port),
                border: 'none',
                borderRadius: 2,
              }}
            />
            {ports.outs.length > 1 && (
              <span style={{
                fontSize: 9,
                color: portColor(port),
                fontFamily: 'monospace',
                marginRight: 4,
              }}>
                {port}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}