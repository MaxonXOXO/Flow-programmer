'use client'

import React, { useMemo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { useFlowStore } from '@/store/userFlowStore'
import { getBoardDefinition, getMCU, pinSupports, CanonicalBoardDefinition, BoardPinDefinition } from '@/lib/registry/boards'
import ArduinoIcon from '@/components/Customkit/ArduinoIcon'
import { Cpu, Zap, Activity } from 'lucide-react'

// Helper to determine pin theme colors
function getPinVisuals(boardId: string, pinId: string, pinDef?: BoardPinDefinition) {
  const isGround = pinSupports(boardId, pinId, 'ground')
  const isPower5V = pinSupports(boardId, pinId, 'power_5v') || pinSupports(boardId, pinId, 'power_vin')
  const isPower3V3 = pinSupports(boardId, pinId, 'power_3v3')
  const isPower = isPower5V || isPower3V3 || pinSupports(boardId, pinId, 'power')
  const isPWM = pinSupports(boardId, pinId, 'pwm')
  const isAnalog = pinSupports(boardId, pinId, 'analog')
  const isDAC = pinSupports(boardId, pinId, 'dac')
  const isI2C = pinSupports(boardId, pinId, 'i2c_sda') || pinSupports(boardId, pinId, 'i2c_scl')
  const isSPI = pinSupports(boardId, pinId, 'spi_sck') || pinSupports(boardId, pinId, 'spi_mosi') || pinSupports(boardId, pinId, 'spi_miso')
  const isUART = pinSupports(boardId, pinId, 'uart_tx') || pinSupports(boardId, pinId, 'uart_rx')
  const isTouch = pinSupports(boardId, pinId, 'touch')

  if (isGround) {
    return {
      textColor: '#f43f5e',
      handleColor: '#f43f5e',
      handleGlow: 'rgba(244, 63, 94, 0.4)',
      badge: null,
      badgeColor: null,
    }
  }

  if (isPower5V) {
    return {
      textColor: '#2fd18b',
      handleColor: '#2fd18b',
      handleGlow: 'rgba(47, 209, 139, 0.4)',
      badge: '5V',
      badgeColor: '#2fd18b',
    }
  }

  if (isPower3V3) {
    return {
      textColor: '#fbbf24',
      handleColor: '#fbbf24',
      handleGlow: 'rgba(251, 191, 36, 0.4)',
      badge: '3.3V',
      badgeColor: '#fbbf24',
    }
  }

  if (isPower) {
    return {
      textColor: '#2fd18b',
      handleColor: '#2fd18b',
      handleGlow: 'rgba(47, 209, 139, 0.4)',
      badge: 'PWR',
      badgeColor: '#2fd18b',
    }
  }

  // Badges for special signals
  let badge: string | null = null
  let badgeColor = '#60a5fa'

  if (isDAC) {
    badge = 'DAC'
    badgeColor = '#c084fc'
  } else if (isPWM) {
    badge = 'PWM'
    badgeColor = '#fbbf24'
  } else if (isAnalog) {
    badge = 'ADC'
    badgeColor = '#60a5fa'
  } else if (isI2C) {
    badge = 'I2C'
    badgeColor = '#22d3ee'
  } else if (isSPI) {
    badge = 'SPI'
    badgeColor = '#34d399'
  } else if (isUART) {
    badge = 'UART'
    badgeColor = '#fb923c'
  } else if (isTouch) {
    badge = 'TOUCH'
    badgeColor = '#f472b6'
  }

  return {
    textColor: isAnalog ? '#93c5fd' : '#cbd5e1',
    handleColor: isPWM ? '#fbbf24' : isAnalog ? '#60a5fa' : '#38bdf8',
    handleGlow: isPWM ? 'rgba(251, 191, 36, 0.4)' : isAnalog ? 'rgba(96, 165, 250, 0.4)' : 'rgba(56, 189, 248, 0.3)',
    badge,
    badgeColor,
  }
}

export default function BoardNode({ id, data, selected }: NodeProps) {
  const project = useFlowStore((s) => s.project)

  // 1. Authoritative Board Resolution from Node Data or Project Hardware Config
  const boardId = useMemo(() => {
    const rawId = (data?.boardId as string) || (data?.platform as string) || project?.hardware?.boardId || project?.platform || 'arduino_uno'
    return rawId
  }, [data, project])

  const board: CanonicalBoardDefinition = useMemo(() => {
    return getBoardDefinition(boardId) || getBoardDefinition('arduino_uno')!
  }, [boardId])

  const mcu = useMemo(() => {
    return getMCU(board.mcuId)
  }, [board])

  // 2. Compute Layout Groups (Left / Right)
  const { leftGroups, rightGroups } = useMemo(() => {
    if (board.defaultLayout?.pinGroups && board.defaultLayout.pinGroups.length > 0) {
      const left: Array<{ name: string; pinIds: string[] }> = []
      const right: Array<{ name: string; pinIds: string[] }> = []

      board.defaultLayout.pinGroups.forEach((group) => {
        if (group.side === 'left') {
          left.push({ name: group.name, pinIds: group.pinIds })
        } else {
          right.push({ name: group.name, pinIds: group.pinIds })
        }
      })

      return { leftGroups: left, rightGroups: right }
    }

    // Default heuristic partitioning if no layout is defined
    const allPinIds = Object.keys(board.pins)
    const leftPins: string[] = []
    const rightPins: string[] = []

    allPinIds.forEach((pinId) => {
      const isPowerOrAnalog =
        pinSupports(board.id, pinId, 'analog') ||
        pinSupports(board.id, pinId, 'power') ||
        pinSupports(board.id, pinId, 'ground')

      if (isPowerOrAnalog) {
        rightPins.push(pinId)
      } else {
        leftPins.push(pinId)
      }
    })

    return {
      leftGroups: [{ name: 'Digital I/O', pinIds: leftPins }],
      rightGroups: [{ name: 'Analog / Power', pinIds: rightPins }],
    }
  }, [board])

  const cardWidth = board.defaultLayout?.width || 310
  const isArduino = board.id.toLowerCase().includes('arduino')
  const mcuName = mcu?.name || (typeof board.mcu === 'string' ? board.mcu : (board.mcu?.name || 'Microcontroller'))
  const frequency = board.frequency || (mcu ? `${Math.round(mcu.clockFrequencyHz / 1_000_000)}MHz` : '16MHz')

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(7, 18, 14, 0.9), rgba(4, 10, 8, 0.97))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.5px solid ${selected ? '#2fd18b' : 'rgba(47, 209, 139, 0.18)'}`,
        borderRadius: 10,
        width: cardWidth,
        fontFamily: 'var(--font-mono)',
        boxShadow: selected
          ? '0 0 24px rgba(47, 209, 139, 0.25), 0 0 0 1px #2fd18b, 0 16px 40px rgba(0,0,0,0.85)'
          : '0 8px 32px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.06)',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Silkscreen Grid Texture */}
      <div
        style={{
          position: 'absolute',
          inset: 4,
          border: '1px solid rgba(47,209,139,0.06)',
          borderRadius: 7,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(47, 209, 139, 0.1) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />

      {/* PCB Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(20, 44, 34, 0.85), rgba(13, 33, 25, 0.45))',
          borderRadius: '8px 8px 0 0',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(47, 209, 139, 0.15)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isArduino ? (
            <ArduinoIcon size={20} color="#2fd18b" />
          ) : (
            <Cpu className="w-5 h-5 text-[#2fd18b]" />
          )}
          <div>
            <div
              style={{
                color: '#fff',
                fontWeight: 800,
                fontSize: 12.5,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(47, 209, 139, 0.4)',
              }}
            >
              {board.name}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 8.5, marginTop: 1, fontWeight: 500 }}>
              {mcuName} <span style={{ color: '#2fd18b' }}>·</span> {frequency} Core
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(47, 209, 139, 0.1)',
            border: '1px solid rgba(47, 209, 139, 0.3)',
            boxShadow: 'inset 0 0 8px rgba(47, 209, 139, 0.1)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 8,
            fontWeight: 700,
            color: '#2fd18b',
            textTransform: 'uppercase',
          }}
        >
          {board.architecture || mcu?.architecture || 'BOARD'}
        </div>
      </div>

      {/* Dual Column Pin Layout */}
      <div style={{ display: 'flex', padding: '10px 0', position: 'relative', zIndex: 1 }}>
        {/* Left Side Header Pins */}
        <div style={{ flex: 1, borderRight: '1px dashed rgba(255,255,255,0.06)' }}>
          {leftGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: gIdx < leftGroups.length - 1 ? 8 : 0 }}>
              <div
                style={{
                  fontSize: 8.5,
                  color: '#478566',
                  textAlign: 'left',
                  paddingLeft: 12,
                  marginBottom: 6,
                  letterSpacing: '0.8px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {group.name}
              </div>

              {group.pinIds.map((pinId) => {
                const pinDef = board.pins[pinId]
                if (!pinDef && !board.pins[pinId]) return null
                const visuals = getPinVisuals(board.id, pinId, pinDef)
                const pinLabel = pinDef?.label || pinId

                return (
                  <div
                    key={pinId}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2.5px 0 2.5px 12px',
                      justifyContent: 'flex-start',
                      height: 20,
                    }}
                  >
                    <span style={{ fontSize: 10, color: visuals.textColor, fontWeight: 600 }}>{pinLabel}</span>
                    {visuals.badge && (
                      <span
                        style={{
                          fontSize: 6.5,
                          color: visuals.badgeColor || '#fbbf24',
                          opacity: 0.9,
                          fontWeight: 700,
                          marginLeft: 4,
                          background: `${visuals.badgeColor || '#fbbf24'}18`,
                          padding: '1px 3px',
                          borderRadius: 3,
                          border: `1px solid ${visuals.badgeColor || '#fbbf24'}33`,
                        }}
                      >
                        {visuals.badge}
                      </span>
                    )}

                    {/* Left Handle */}
                    <Handle
                      type="source"
                      position={Position.Left}
                      id={pinId}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 9,
                        height: 9,
                        background: '#0f172a',
                        border: `2px solid ${visuals.handleColor}`,
                        borderRadius: '50%',
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${visuals.handleGlow}`,
                        zIndex: 20,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Right Side Header Pins */}
        <div style={{ flex: 1 }}>
          {rightGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: gIdx < rightGroups.length - 1 ? 8 : 0 }}>
              <div
                style={{
                  fontSize: 8.5,
                  color: '#478566',
                  textAlign: 'right',
                  paddingRight: 12,
                  marginBottom: 6,
                  letterSpacing: '0.8px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {group.name}
              </div>

              {group.pinIds.map((pinId) => {
                const pinDef = board.pins[pinId]
                if (!pinDef && !board.pins[pinId]) return null
                const visuals = getPinVisuals(board.id, pinId, pinDef)
                const pinLabel = pinDef?.label || pinId

                return (
                  <div
                    key={pinId}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2.5px 12px 2.5px 0',
                      justifyContent: 'flex-end',
                      height: 20,
                    }}
                  >
                    {visuals.badge && (
                      <span
                        style={{
                          fontSize: 6.5,
                          color: visuals.badgeColor || '#fbbf24',
                          opacity: 0.9,
                          fontWeight: 700,
                          marginRight: 4,
                          background: `${visuals.badgeColor || '#fbbf24'}18`,
                          padding: '1px 3px',
                          borderRadius: 3,
                          border: `1px solid ${visuals.badgeColor || '#fbbf24'}33`,
                        }}
                      >
                        {visuals.badge}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: visuals.textColor, fontWeight: 600 }}>{pinLabel}</span>

                    {/* Right Handle */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={pinId}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translate(50%, -50%)',
                        width: 9,
                        height: 9,
                        background: '#0f172a',
                        border: `2px solid ${visuals.handleColor}`,
                        borderRadius: '50%',
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${visuals.handleGlow}`,
                        zIndex: 20,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
