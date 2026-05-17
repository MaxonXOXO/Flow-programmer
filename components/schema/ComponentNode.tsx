'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'

const typeColors: Record<string, { border: string, bg: string, accent: string }> = {
  sensor:   { border: '#2fd18b', bg: '#0d2b1a', accent: '#2fd18b' },
  actuator: { border: '#3d8bff', bg: '#0d1a2b', accent: '#3d8bff' },
  display:  { border: '#9b6cff', bg: '#1a0d2b', accent: '#9b6cff' },
  power:    { border: '#f5a623', bg: '#2b1f0a', accent: '#f5a623' },
  comms:    { border: '#26d4c8', bg: '#0a2b28', accent: '#26d4c8' },
}

export default function ComponentNode({ data, selected }: NodeProps) {
  const d = data as {
    label: string
    componentType: string
    pins: { id: string, label: string }[]
    icon: string
  }

  const colors = typeColors[d.componentType] || typeColors.sensor

  return (
    <div style={{
      background: colors.bg,
      border: `1.5px solid ${selected ? colors.accent : colors.border + '88'}`,
      borderRadius: 8,
      minWidth: 140,
      fontFamily: 'monospace',
      boxShadow: selected ? `0 0 0 2px ${colors.accent}22` : '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${colors.border}22`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>{d.icon}</span>
        <div>
          <div style={{ color: colors.accent, fontSize: 12, fontWeight: 600 }}>{d.label}</div>
          <div style={{ color: colors.accent + '66', fontSize: 10 }}>{d.componentType}</div>
        </div>
      </div>

      {/* Pins */}
      <div style={{ padding: '8px 0' }}>
        {d.pins.map(pin => (
          <div key={pin.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px 12px',
            gap: 8,
            position: 'relative',
          }}>
            <Handle
  type="target"
  position={Position.Right}
  id={pin.id}
  style={{
    position: 'relative',
    transform: 'none',
    right: 'auto',
    top: 'auto',
    width: 9,
    height: 9,
    background: colors.bg,
    border: `2px solid ${colors.accent}`,
    borderRadius: 2,
    flexShrink: 0,
  }}
/>
            <span style={{ fontSize: 11, color: colors.accent + 'aa' }}>{pin.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}