'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'
import { 
  Lightbulb, Square, Thermometer, Radio, Eye, Sun, 
  Settings, Wrench, Volume2, Zap, Tv, Monitor, Wifi, GripHorizontal
} from 'lucide-react'

// Neon category style mappings
const categoryStyles: Record<string, { border: string, bg: string, accent: string }> = {
  sensor:   { border: '#2fd18b', bg: 'rgba(47, 209, 139, 0.06)', accent: '#2fd18b' },
  actuator: { border: '#5fa3ff', bg: 'rgba(95, 163, 255, 0.06)', accent: '#5fa3ff' },
  display:  { border: '#ff5f9e', bg: 'rgba(255, 95, 158, 0.06)', accent: '#ff5f9e' },
  power:    { border: '#ffb13d', bg: 'rgba(255, 177, 61, 0.06)', accent: '#ffb13d' },
  comms:    { border: '#5fa3ff', bg: 'rgba(95, 163, 255, 0.06)', accent: '#5fa3ff' },
}

function getComponentVectorIcon(emoji: string, color: string) {
  const iconProps = { className: 'w-4 h-4', style: { color } }
  switch(emoji) {
    case '💡': return <Lightbulb {...iconProps} />
    case '⬛': return <Square {...iconProps} />
    case '🌡': return <Thermometer {...iconProps} />
    case '📡': return <Radio {...iconProps} />
    case '👁': return <Eye {...iconProps} />
    case '☀': return <Sun {...iconProps} />
    case '⚙': return <Settings {...iconProps} />
    case '🔧': return <Wrench {...iconProps} />
    case '🔔': return <Volume2 {...iconProps} />
    case '⚡': return <Zap {...iconProps} />
    case '📺': return <Tv {...iconProps} />
    case '🖥': return <Monitor {...iconProps} />
    case '📶': return <Wifi {...iconProps} />
    default: return <GripHorizontal {...iconProps} />
  }
}

export default function ComponentNode({ data, selected }: NodeProps) {
  const d = data as {
    label: string
    componentType: string
    pins: { id: string, label: string }[]
    icon: string
  }

  const styles = categoryStyles[d.componentType] || categoryStyles.sensor

  return (
    <div style={{
      background: 'var(--color-bg-panel)',
      border: `1px solid ${selected ? 'var(--color-accent-blue)' : styles.border + '55'}`,
      borderRadius: 6,
      minWidth: 155,
      fontFamily: 'var(--font-sans)',
      boxShadow: selected 
        ? '0 0 14px rgba(95, 163, 255, 0.3), 0 0 0 1px var(--color-accent-blue)' 
        : '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      
      {/* Header Bar */}
      <div style={{
        padding: '8px 10px',
        background: styles.bg,
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {getComponentVectorIcon(d.icon, styles.accent)}
        </div>
        <div>
          <div style={{ color: 'var(--color-text-bright)', fontSize: 11, fontWeight: 700 }}>
            {d.label}
          </div>
          <div style={{ color: styles.accent, fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
            {d.componentType}
          </div>
        </div>
      </div>

      {/* Pins section */}
      <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {d.pins.map(pin => (
          <div key={pin.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '3px 10px',
            gap: 8,
            position: 'relative',
            height: 20,
          }}>
            <Handle
              type="target"
              position={Position.Left}
              id={pin.id}
              style={{
                position: 'relative',
                transform: 'none',
                left: 'auto',
                top: 'auto',
                width: 7,
                height: 7,
                background: '#ffd043', // Gold solder joint pad
                border: '1px solid #111',
                borderRadius: 1, // square copper pad
                flexShrink: 0,
                boxShadow: '0 0 3px rgba(255,208,67,0.5)',
              }}
            />
            <span style={{ fontSize: 9.5, color: 'var(--color-text-normal)' }}>{pin.label}</span>
            <span style={{ fontSize: 8, color: 'var(--color-text-dim)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              [{pin.id}]
            </span>
          </div>
        ))}
      </div>
      
    </div>
  )
}