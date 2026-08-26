'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'
import { useFlowStore } from '@/store/userFlowStore'
import { 
   Lightbulb, Square, Thermometer, Radio, Eye, Sun, 
   Settings, Wrench, Volume2, Zap, Tv, Monitor, Wifi, GripHorizontal,
   Flame, Droplets, Waves, Wind, Cpu, Activity
} from 'lucide-react'

import { ComponentDefinition } from '@/lib/registry/components/types'

// Neon category style mappings
const categoryStyles: Record<string, { border: string, bg: string, accent: string }> = {
  sensor:   { border: '#2fd18b', bg: 'rgba(47, 209, 139, 0.06)', accent: '#2fd18b' },
  actuator: { border: '#5fa3ff', bg: 'rgba(95, 163, 255, 0.06)', accent: '#5fa3ff' },
  display:  { border: '#ff5f9e', bg: 'rgba(255, 95, 158, 0.06)', accent: '#ff5f9e' },
  power:    { border: '#ffb13d', bg: 'rgba(255, 177, 61, 0.06)', accent: '#ffb13d' },
  comms:    { border: '#5fa3ff', bg: 'rgba(95, 163, 255, 0.06)', accent: '#5fa3ff' },
  communication: { border: '#5fa3ff', bg: 'rgba(95, 163, 255, 0.06)', accent: '#5fa3ff' },
  motor_driver:  { border: '#ffb13d', bg: 'rgba(255, 177, 61, 0.06)', accent: '#ffb13d' },
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
    case '🔥': return <Flame {...iconProps} />
    case '🌱': return <Droplets {...iconProps} />
    case '💧': return <Waves {...iconProps} />
    case '💨': return <Wind {...iconProps} />
    case '📳': return <Activity {...iconProps} />
    case '🔌': return <Cpu {...iconProps} />
    default: return <GripHorizontal {...iconProps} />
  }
}

export default function ComponentNode({ id, data, selected }: NodeProps) {
  const { schemaNodes, updateSchemaNodeData } = useFlowStore()
  
  // Accept ComponentDefinition from data.definition, fallback to legacy schema properties
  const definition = data.definition as ComponentDefinition | undefined

  const label = definition ? definition.name : (data.label as string)
  const componentType = definition ? definition.category : (data.componentType as string)
  const icon = definition ? (definition.icon || '🔌') : (data.icon as string)
  const pins = definition ? definition.pins : (data.pins as { id: string, label: string }[] || [])
  const params = data.params as Record<string, string> | undefined

  const styles = categoryStyles[componentType] || categoryStyles.sensor

  // Dynamic orientation calculation: Pins always face the central MCU board
  const thisNode = schemaNodes.find(n => n.id === id)
  const boardNode = schemaNodes.find(n => n.type === 'boardNode' || n.type === 'unoNode' || n.id === 'arduino-uno' || n.id === 'board')
  
  const compX = thisNode ? thisNode.position.x : 0
  const boardX = boardNode ? boardNode.position.x : 350

  // If component is to the LEFT of Board (compX < boardX), pins face RIGHT towards Board.
  // If component is to the RIGHT of Board (compX >= boardX), pins face LEFT towards Board.
  const pinsOnRight = compX < boardX

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
          {getComponentVectorIcon(icon, styles.accent)}
        </div>
        <div>
          <div style={{ color: 'var(--color-text-bright)', fontSize: 11, fontWeight: 700 }}>
            {label}
          </div>
          <div style={{ color: styles.accent, fontSize: 8.5, fontWeight: 600, textTransform: 'uppercase', marginTop: 1, fontFamily: 'var(--font-mono)' }}>
            {componentType}
          </div>
        </div>
      </div>

      {/* Pins section - Dynamic orientation facing Arduino Uno */}
      <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pins.map(pin => (
          <div
            key={pin.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: pinsOnRight ? 'flex-end' : 'flex-start',
              padding: '3px 10px',
              gap: 6,
              position: 'relative',
              height: 20,
            }}
          >
            {pinsOnRight ? (
              <>
                <span style={{ fontSize: 8, color: 'var(--color-text-dim)', marginRight: 'auto', fontFamily: 'var(--font-mono)' }}>
                  [{pin.id}]
                </span>
                <span style={{ fontSize: 9.5, color: 'var(--color-text-normal)', fontWeight: 600 }}>
                  {pin.label}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={pin.id}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translate(50%, -50%)',
                    width: 9,
                    height: 9,
                    background: '#0f172a',
                    border: '2px solid #ffd043',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: '0 0 6px rgba(255, 208, 67, 0.6)',
                    zIndex: 30,
                  }}
                />
              </>
            ) : (
              <>
                <Handle
                  type="source"
                  position={Position.Left}
                  id={pin.id}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 9,
                    height: 9,
                    background: '#0f172a',
                    border: '2px solid #ffd043',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: '0 0 6px rgba(255, 208, 67, 0.6)',
                    zIndex: 30,
                  }}
                />
                <span style={{ fontSize: 9.5, color: 'var(--color-text-normal)', fontWeight: 600 }}>
                  {pin.label}
                </span>
                <span style={{ fontSize: 8, color: 'var(--color-text-dim)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                  [{pin.id}]
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Parameters / Variant section */}
      {params && params.variant !== undefined && (
        <div style={{
          padding: '4px 10px 8px',
          borderTop: '1px solid rgba(255,255,255,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <span style={{ fontSize: 8.5, color: 'var(--color-text-dim)', fontWeight: 600 }}>
            VARIANT / MODE
          </span>
          <select
            value={params.variant}
            onChange={(e) => {
              updateSchemaNodeData(id, {
                ...data,
                params: { ...params, variant: e.target.value }
              })
            }}
            style={{
              width: '100%',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 3,
              padding: '2px 4px',
              fontSize: 10,
              color: 'var(--color-text-bright)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="Active Low">Active Low</option>
            <option value="Active High">Active High</option>
          </select>
        </div>
      )}
      
    </div>
  )
}