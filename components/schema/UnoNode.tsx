'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'

const DIGITAL_PINS = ['D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0']
const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
const POWER_PINS = ['5V', '3.3V', 'GND', 'VIN']
const PWM_PINS = ['D3', 'D5', 'D6', 'D9', 'D10', 'D11']

export default function UnoNode({ selected }: NodeProps) {
  return (
    <div style={{
      background: '#0d1a0d',
      border: `2px solid ${selected ? '#2fd18b' : '#1a3a1a'}`,
      borderRadius: 12,
      width: 280,
      fontFamily: 'monospace',
      boxShadow: selected
        ? '0 0 0 2px #2fd18b33, 0 8px 32px rgba(0,0,0,0.6)'
        : '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        background: '#1a3a1a',
        borderRadius: '10px 10px 0 0',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#2fd18b', fontWeight: 700, fontSize: 14 }}>Arduino Uno</div>
          <div style={{ color: '#4a7a4a', fontSize: 10, marginTop: 2 }}>ATmega328P · 16MHz</div>
        </div>
        <div style={{
          background: '#0d2b0d',
          border: '1px solid #2fd18b44',
          borderRadius: 6,
          padding: '3px 8px',
          fontSize: 10,
          color: '#2fd18b',
        }}>
          MCU
        </div>
      </div>

      {/* Pin layout */}
      <div style={{ display: 'flex', padding: '12px 0' }}>

        {/* Left side — Digital pins */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: '#2a4a2a',
            textAlign: 'center',
            marginBottom: 6,
            letterSpacing: '1px',
          }}>
            DIGITAL
          </div>
          {DIGITAL_PINS.map((pin, i) => {
            const isPWM = PWM_PINS.includes(pin)
            return (
              <div key={pin} style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '3px 8px 3px 0',
                justifyContent: 'flex-end',
                gap: 6,
              }}>
                {isPWM && (
                  <span style={{ fontSize: 8, color: '#f5a623', opacity: 0.7 }}>PWM</span>
                )}
                <span style={{ fontSize: 11, color: '#4a7a4a' }}>{pin}</span>
                <Handle
                  type="source"
                  position={Position.Left}
                  id={pin}
                  style={{
                    position: 'relative',
                    transform: 'none',
                    left: 'auto',
                    top: 'auto',
                    width: 10,
                    height: 10,
                    background: '#1a3a1a',
                    border: '2px solid #2fd18b',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Center divider */}
        <div style={{
          width: 1,
          background: '#1a3a1a',
          margin: '0 4px',
        }} />

        {/* Right side — Analog + Power */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: '#2a4a2a',
            textAlign: 'center',
            marginBottom: 6,
            letterSpacing: '1px',
          }}>
            ANALOG / PWR
          </div>
          {ANALOG_PINS.map(pin => (
            <div key={pin} style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '3px 0 3px 8px',
              gap: 6,
            }}>
              <Handle
                type="source"
                position={Position.Right}
                id={pin}
                style={{
                  position: 'relative',
                  transform: 'none',
                  right: 'auto',
                  top: 'auto',
                  width: 10,
                  height: 10,
                  background: '#1a2a3a',
                  border: '2px solid #3d8bff',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: '#3a6a8a' }}>{pin}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: '#1a3a1a', margin: '6px 8px' }} />

          {POWER_PINS.map(pin => {
            const color = pin === 'GND' ? '#e85050' : pin === '3.3V' ? '#f5a623' : '#2fd18b'
            return (
              <div key={pin} style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '3px 0 3px 8px',
                gap: 6,
              }}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={pin}
                  style={{
                    position: 'relative',
                    transform: 'none',
                    right: 'auto',
                    top: 'auto',
                    width: 10,
                    height: 10,
                    background: '#1a1a1a',
                    border: `2px solid ${color}`,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color }}>{pin}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}