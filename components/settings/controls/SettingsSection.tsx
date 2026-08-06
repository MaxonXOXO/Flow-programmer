'use client'

import React from 'react'

interface SettingsSectionProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function SettingsSection({
  title,
  description,
  action,
  children,
}: SettingsSectionProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div>
          <h3 style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: 'var(--color-text-bright)',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {title}
          </h3>
          {description && (
            <p style={{
              fontSize: 11,
              color: 'var(--color-text-dim)',
              marginTop: 4,
              margin: 0,
              lineHeight: 1.4,
            }}>
              {description}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Cards container with 10px breathing room */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}
