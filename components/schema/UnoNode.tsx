'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'

const DIGITAL_PINS = ['D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0']
const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
const POWER_PINS = ['5V', '3.3V', 'GND', 'VIN']
const PWM_PINS = ['D3', 'D5', 'D6', 'D9', 'D10', 'D11']

export default function UnoNode({ selected }: NodeProps) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(7, 18, 14, 0.85), rgba(4, 10, 8, 0.95))',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1.5px solid ${selected ? '#2fd18b' : 'rgba(47, 209, 139, 0.15)'}`,
      borderRadius: 10,
      width: 290,
      fontFamily: 'var(--font-mono)',
      boxShadow: selected
        ? '0 0 24px rgba(47, 209, 139, 0.2), 0 0 0 1px #2fd18b, 0 16px 40px rgba(0,0,0,0.8)'
        : '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>

      {/* USB Port Outline - sticking out on the top left */}
      <div style={{
        position: 'absolute',
        left: -16,
        top: 36,
        width: 16,
        height: 28,
        background: 'linear-gradient(90deg, #64748b, #94a3b8)',
        border: '1.5px solid #142c22',
        borderRight: 'none',
        borderRadius: '3px 0 0 3px',
        boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.3), inset -2px 0 4px rgba(0,0,0,0.4), -4px 4px 8px rgba(0,0,0,0.5)',
        zIndex: -1,
      }} />

      {/* Power barrel jack outline - sticking out on the bottom left */}
      <div style={{
        position: 'absolute',
        left: -14,
        bottom: 25,
        width: 14,
        height: 24,
        background: 'linear-gradient(90deg, #0f172a, #1e293b)',
        border: '1.5px solid #142c22',
        borderRight: 'none',
        borderRadius: '3px 0 0 3px',
        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8), -4px 4px 8px rgba(0,0,0,0.5)',
        zIndex: -1,
      }} />

      {/* Silkscreen Brand Border */}
      <div style={{
        position: 'absolute',
        inset: 4,
        border: '1px solid rgba(47,209,139,0.06)',
        borderRadius: 7,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(47, 209, 139, 0.1) 1px, transparent 1px)',
        backgroundSize: '12px 12px',
      }} />

      {/* PCB Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(20, 44, 34, 0.8), rgba(13, 33, 25, 0.4))',
        borderRadius: '8px 8px 0 0',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(47, 209, 139, 0.15)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div>
          <div style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.5px',
            textShadow: '0 0 12px rgba(47, 209, 139, 0.4)'
          }}>
            ARDUINO UNO
          </div>
          <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 1, fontWeight: 500 }}>
            ATmega328P <span style={{ color: '#2fd18b' }}>·</span> 16 MHz Core
          </div>
        </div>
        <div style={{
          background: 'rgba(47, 209, 139, 0.1)',
          border: '1px solid rgba(47, 209, 139, 0.3)',
          boxShadow: 'inset 0 0 8px rgba(47, 209, 139, 0.1)',
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 8.5,
          fontWeight: 700,
          color: '#2fd18b',
        }}>
          MCU BOARD
        </div>
      </div>

      {/* Pins layout section */}
      <div style={{ display: 'flex', padding: '10px 0', position: 'relative', zIndex: 1 }}>

        {/* Left Side: Digital Header Pins */}
        <div style={{ flex: 1, borderRight: '1px dashed rgba(255,255,255,0.05)' }}>
          <div style={{
            fontSize: 9,
            color: '#478566',
            textAlign: 'left',
            paddingLeft: 12,
            marginBottom: 8,
            letterSpacing: '1px',
            fontWeight: 800,
          }}>
            DIGITAL I/O
          </div>
          {DIGITAL_PINS.map(pin => {
            const isPWM = PWM_PINS.includes(pin)
            return (
              <div key={pin} style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '3px 0 3px 12px',
                justifyContent: 'flex-start',
                height: 20,
              }}>
                <span style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 600 }}>{pin}</span>
                {isPWM && (
                  <span style={{ fontSize: 6.5, color: '#fbbf24', opacity: 0.9, fontWeight: 700, marginLeft: 4 }}>PWM</span>
                )}

                {/* Handle positioned exactly on the left card border */}
                <Handle
                  type="source"
                  position={Position.Left}
                  id={pin}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 10,
                    height: 10,
                    background: '#0f172a',
                    border: '2px solid #fbbf24',
                    borderRadius: '50%',
                    flexShrink: 0,
                    boxShadow: '0 0 6px rgba(251, 191, 36, 0.4)',
                    zIndex: 20,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Right Side: Analog & Power Headers */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: '#478566',
            textAlign: 'right',
            paddingRight: 12,
            marginBottom: 8,
            letterSpacing: '1px',
            fontWeight: 800,
          }}>
            ANALOG / PWR
          </div>

          {/* Analog Inputs */}
          {ANALOG_PINS.map(pin => (
            <div key={pin} style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '3px 12px 3px 0',
              justifyContent: 'flex-end',
              height: 20,
            }}>
              <span style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 600 }}>{pin}</span>

              {/* Handle positioned exactly on the right card border */}
              <Handle
                type="source"
                position={Position.Right}
                id={pin}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translate(50%, -50%)',
                  width: 10,
                  height: 10,
                  background: '#0f172a',
                  border: '2px solid #60a5fa',
                  borderRadius: '50%',
                  flexShrink: 0,
                  boxShadow: '0 0 6px rgba(96, 165, 250, 0.4)',
                  zIndex: 20,
                }}
              />
            </div>
          ))}

          {/* Copper Silkscreen Divider */}
          <div style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            margin: '6px 8px',
          }} />

          {/* Power Pins */}
          {POWER_PINS.map(pin => {
            const pinConfig = {
              'GND': { color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
              '3.3V': { color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
              '5V': { color: '#2fd18b', glow: 'rgba(47, 209, 139, 0.4)' },
              'VIN': { color: '#2fd18b', glow: 'rgba(47, 209, 139, 0.4)' }
            }[pin] || { color: '#2fd18b', glow: 'rgba(47, 209, 139, 0.4)' }

            return (
              <div key={pin} style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '3px 12px 3px 0',
                justifyContent: 'flex-end',
                height: 20,
              }}>
                <span style={{ fontSize: 10.5, color: pinConfig.color, fontWeight: 700 }}>{pin}</span>

                {/* Handle positioned exactly on the right card border */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={pin}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translate(50%, -50%)',
                    width: 10,
                    height: 10,
                    background: '#0f172a',
                    border: `2px solid ${pinConfig.color}`,
                    borderRadius: '50%',
                    flexShrink: 0,
                    boxShadow: `0 0 6px ${pinConfig.glow}`,
                    zIndex: 20,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}