'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { useState } from 'react'
import { SlidersHorizontal, Info, Hammer, Settings, Move, Link } from 'lucide-react'

export default function PropertiesPanel() {
  const { selectedNodeId, flowNodes, schemaNodes, updateFlowNodeData, updateSchemaNodeData, activeCanvas } = useFlowStore()
  
  // Track open states for property accordions
  const [openSections, setOpenSections] = useState({
    identity: true,
    params: true,
    pins: true,
    transform: true,
  })

  const nodes = activeCanvas === 'schema' ? schemaNodes : flowNodes
  const node = nodes.find(n => n.id === selectedNodeId)

  const toggleSection = (sec: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }))
  }

  if (!node) {
    return (
      <div style={{
        width: 240,
        height: '100%',
        background: 'var(--color-bg-panel)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed #3e3e3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
        }}>
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <div style={{ 
          fontSize: 11, 
          color: 'var(--color-text-dim)', 
          textAlign: 'center', 
          lineHeight: 1.5,
          maxWidth: 160,
        }}>
          Select a canvas node to inspect properties.
        </div>
      </div>
    )
  }

  const data = node.data as Record<string, any>
  const params = data.params as Record<string, string> || {}
  const pins = data.pins as { id: string, label: string }[] || []
  const nodeType = data.nodeType || data.componentType || 'node'

  return (
    <div style={{
      width: 240,
      height: '100%',
      background: 'var(--color-bg-panel)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflowY: 'auto',
    }}>
      {/* Panel Main Header */}
      <div style={{
        padding: '10px 12px',
        background: '#1b1b1b',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          background: 'rgba(230, 126, 34, 0.08)',
          border: '1px solid rgba(230, 126, 34, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-accent)',
          fontSize: 11,
          fontWeight: 600,
        }}>
          {node.type === 'unoNode' ? 'U' : 'N'}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-bright)' }}>
            {data.label}
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-dim)', textTransform: 'uppercase', marginTop: 1, fontFamily: 'monospace' }}>
            {nodeType}
          </div>
        </div>
      </div>

      {/* Accordion 1: Identity */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div 
          onClick={() => toggleSection('identity')}
          style={{
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-normal)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info className="w-3.5 h-3.5 text-[#e67e22]" /> IDENTITY
          </span>
          <span style={{ color: '#555', fontSize: 10 }}>{openSections.identity ? '▼' : '▶'}</span>
        </div>
        {openSections.identity && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--color-text-dim)', marginBottom: 4 }}>NODE ID</div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: 'var(--color-accent-blue)',
                background: '#1a1a1a',
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
              }}>
                {node.id}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Parameters */}
      {Object.keys(params).length > 0 && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div 
            onClick={() => toggleSection('params')}
            style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-normal)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings className="w-3.5 h-3.5 text-[#3d8bff]" /> PARAMETERS
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{openSections.params ? '▼' : '▶'}</span>
          </div>
          {openSections.params && (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(params).map(([key, val]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 4, textTransform: 'capitalize' }}>
                    {key}
                  </div>
                  <input
                    value={val}
                    onChange={e => {
                      const updater = activeCanvas === 'schema' ? updateSchemaNodeData : updateFlowNodeData
                      updater(node.id, {
                        ...data,
                        params: { ...params, [key]: e.target.value }
                      })
                    }}
                    style={{
                      width: '100%',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 4,
                      padding: '4px 8px',
                      color: 'var(--color-text-bright)',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      outline: 'none',
                      transition: 'border-color 0.1s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-border-focus)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accordion 3: Pins (Schema view only) */}
      {pins.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div 
            onClick={() => toggleSection('pins')}
            style={{
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-text-normal)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link className="w-3.5 h-3.5 text-[#2ecc71]" /> CONNECTORS
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{openSections.pins ? '▼' : '▶'}</span>
          </div>
          {openSections.pins && (
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pins.map(pin => (
                <div key={pin.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  fontSize: 10.5,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.01)',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                    {pin.id}
                  </span>
                  <span style={{ color: 'var(--color-text-normal)', fontWeight: 600 }}>
                    {pin.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accordion 4: Position (Transform) */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div 
          onClick={() => toggleSection('transform')}
          style={{
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-normal)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Move className="w-3.5 h-3.5 text-[#e74c3c]" /> TRANSFORM
          </span>
          <span style={{ color: '#555', fontSize: 10 }}>{openSections.transform ? '▼' : '▶'}</span>
        </div>
        {openSections.transform && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: '#e74c3c',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-dim)', fontWeight: 600 }}>LOC X</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--color-text-bright)',
                  background: 'var(--color-bg-input)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}>
                  {Math.round(node.position.x)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: '#2ecc71',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-dim)', fontWeight: 600 }}>LOC Y</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--color-text-bright)',
                  background: 'var(--color-bg-input)',
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}>
                  {Math.round(node.position.y)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}