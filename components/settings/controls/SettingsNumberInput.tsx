'use client'

import React from 'react'
import SettingsCard from './SettingsCard'

interface SettingsNumberInputProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  isModified?: boolean
  requiresRestart?: boolean
  value: number
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}

export default function SettingsNumberInput({
  title,
  description,
  icon,
  badge,
  isModified = false,
  requiresRestart = false,
  value,
  min,
  max,
  step = 1,
  unit = '',
  disabled = false,
  onChange,
}: SettingsNumberInputProps) {
  return (
    <SettingsCard
      title={title}
      description={description}
      icon={icon}
      badge={badge}
      isModified={isModified}
      requiresRestart={requiresRestart}
      disabled={disabled}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val)) onChange(val)
          }}
          style={{
            width: 70,
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '4px 8px',
            color: 'var(--color-text-bright)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            textAlign: 'right',
          }}
        />
        {unit && (
          <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}>
            {unit}
          </span>
        )}
      </div>
    </SettingsCard>
  )
}
