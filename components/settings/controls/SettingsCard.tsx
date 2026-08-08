'use client'

import React, { useState } from 'react'

interface SettingsCardProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  isModified?: boolean
  requiresRestart?: boolean
  disabled?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
}

export default function SettingsCard({
  title,
  description,
  icon,
  badge,
  isModified = false,
  requiresRestart = false,
  disabled = false,
  children,
  style,
}: SettingsCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      style={{
        position: 'relative',
        background: disabled
          ? 'rgba(18, 21, 28, 0.45)'
          : isHovered
          ? 'rgba(28, 33, 44, 0.85)'
          : 'rgba(21, 24, 32, 0.7)',
        border: disabled
          ? '1px dashed rgba(255, 255, 255, 0.06)'
          : isHovered
          ? '1px solid rgba(95, 163, 255, 0.35)'
          : '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transform: isHovered && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: isHovered && !disabled
          ? '0 6px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(95, 163, 255, 0.08)'
          : '0 2px 6px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
        {icon && (
          <div style={{
            color: disabled ? 'var(--color-text-dim)' : 'var(--color-accent-blue)',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {title && (
              <span style={{
                fontSize: 12,
                fontWeight: 650,
                color: disabled ? 'var(--color-text-dim)' : 'var(--color-text-bright)',
              }}>
                {title}
              </span>
            )}

            {/* Modified Dot Indicator */}
            {isModified && !disabled && (
              <span
                title="Modified from default preference"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#60a5fa',
                  display: 'inline-block',
                }}
              />
            )}

            {/* Requires Restart Badge */}
            {requiresRestart && (
              <span style={{
                fontSize: 8.5,
                fontWeight: 750,
                color: '#ffb13d',
                background: 'rgba(255, 177, 61, 0.12)',
                border: '1px solid rgba(255, 177, 61, 0.3)',
                padding: '1px 6px',
                borderRadius: 4,
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
              }}>
                Requires Restart
              </span>
            )}

            {/* Status / Coming Soon Badge */}
            {badge && (
              <span style={{
                fontSize: 8.5,
                fontWeight: 700,
                color: disabled ? 'var(--color-text-dim)' : 'var(--color-text-bright)',
                background: disabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1px 6px',
                borderRadius: 4,
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
              }}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p style={{ fontSize: 10.5, color: 'var(--color-text-dim)', marginTop: 3, margin: 0, lineHeight: 1.35 }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  )
}
