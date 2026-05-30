'use client'

import { Handle, Position, NodeProps } from '@xyflow/react'

const DIGITAL_PINS = ['D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0']
const ANALOG_PINS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
const POWER_PINS = ['5V', '3.3V', 'GND', 'VIN']
const PWM_PINS = ['D3', 'D5', 'D6', 'D9', 'D10', 'D11']

export default function UnoNode({ selected }: NodeProps) {
  return (
    <div style={{
      background: '#07120e',
      border: `1.5px solid ${selected ? '#2fd18b' : '#142c22'}`,
      borderRadius: 10,
      width: 290,
      fontFamily: 'var(--font-mono)',
      boxShadow: selected
        ? '0 0 16px rgba(47, 209, 139, 0.3), 0 0 0 1px #2fd18b, 0 12px 32px rgba(0,0,0,0.6)'
        : '0 6px 20px rgba(0,0,0,0.5)',
      position: 'relative',
    }}>
      
      {/* USB Port Outline - sticking out on the top left */}
      <div style={{
        position: 'absolute',
        left: -16,
        top: 36,
        width: 16,
        height: 28,
        background: '#a5b3cd',
        border: '1.5px solid #142c22',
        borderRight: 'none',
        borderRadius: '3px 0 0 3px',
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.6)',
        zIndex: -1,
      }} />

      {/* Power barrel jack outline - sticking out on the bottom left */}
      <div style={{
        position: 'absolute',
        left: -14,
        bottom: 25,
        width: 14,
        height: 24,
        background: '#15171c',
        border: '1.5px solid #142c22',
        borderRight: 'none',
        borderRadius: '3px 0 0 3px',
        zIndex: -1,
      }} />

      {/* Silkscreen Brand Border */}
      <div style={{
        position: 'absolute',
        inset: 4,
        border: '1px solid rgba(47,209,139,0.06)',
        borderRadius: 7,
        pointerEvents: 'none',
      }} />

      {/* PCB Header */}
      <div style={{
        background: '#0d2119',
        borderRadius: '8px 8px 0 0',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #143226',
      }}>
        <div>
          <div style={{ color: '#2fd18b', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px' }}>
            ARDUINO UNO
          </div>
          <div style={{ color: '#546484', fontSize: 9, marginTop: 1, fontWeight: 500 }}>
            ATmega328P · 16 MHz Core
          </div>
        </div>
        <div style={{
          background: 'rgba(47, 209, 139, 0.08)',
          border: '1px solid rgba(47, 209, 139, 0.2)',
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
      <div style={{ display: 'flex', padding: '10px 0', position: 'relative' }}>
        
        {/* Left Side: Digital Header Pins */}
        <div style={{ flex: 1, borderRight: '1px dashed rgba(255,255,255,0.04)' }}>
          <div style={{
            fontSize: 9,
            color: '#1c4a37',
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
                padding: '3px 0 3px 12px', // Keep padding left to offset text from handles
                justifyContent: 'flex-start',
                height: 20,
              }}>
                <span style={{ fontSize: 10.5, color: '#a5b3cd', fontWeight: 600 }}>{pin}</span>
                {isPWM && (
                  <span style={{ fontSize: 6.5, color: '#ffb13d', opacity: 0.8, fontWeight: 700, marginLeft: 4 }}>PWM</span>
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
                    width: 8,
                    height: 8,
                    background: '#ffd043', // Gold solder pad
                    border: '1px solid #111',
                    borderRadius: 1, // square copper pad
                    flexShrink: 0,
                    boxShadow: '0 0 3px rgba(255,208,67,0.5)',
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
            color: '#1a3350',
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
              padding: '3px 12px 3px 0', // Keep padding right to offset text from handles
              justifyContent: 'flex-end',
              height: 20,
            }}>
              <span style={{ fontSize: 10.5, color: '#a5b3cd', fontWeight: 600 }}>{pin}</span>
              
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
                  width: 8,
                  height: 8,
                  background: '#5fa3ff', // Neon Blue
                  border: '1px solid #111',
                  borderRadius: 1, // square copper pad
                  flexShrink: 0,
                  boxShadow: '0 0 3px rgba(95,163,255,0.5)',
                  zIndex: 20,
                }}
              />
            </div>
          ))}

          {/* Copper Silkscreen Divider */}
          <div style={{ 
            height: 1, 
            background: 'rgba(255,255,255,0.05)', 
            margin: '6px 8px',
          }} />

          {/* Power Pins */}
          {POWER_PINS.map(pin => {
            const color = pin === 'GND' ? '#ff5f9e' : pin === '3.3V' ? '#ffb13d' : '#2fd18b'
            return (
              <div key={pin} style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '3px 12px 3px 0', // Keep padding right to offset text from handles
                justifyContent: 'flex-end',
                height: 20,
              }}>
                <span style={{ fontSize: 10.5, color, fontWeight: 700 }}>{pin}</span>
                
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
                    width: 8,
                    height: 8,
                    background: color,
                    border: '1px solid #111',
                    borderRadius: 1, // square copper pad
                    flexShrink: 0,
                    boxShadow: `0 0 3px ${color}55`,
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