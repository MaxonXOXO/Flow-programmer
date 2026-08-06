'use client'

import React, { useState } from 'react'
import SettingsCard from './SettingsCard'

interface SettingsSliderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  isModified?: boolean
  requiresRestart?: boolean
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  disabled?: boolean
  onChange: (value: number) => void
}

export default function SettingsSlider({
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
}: SettingsSliderProps) {
  const [isFocused, setIsFocused] = useState(false)
  const percentage = Math.round(((value - min) / (max - min)) * 100)

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              width: 120,
              height: 4,
              borderRadius: 2,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, var(--color-accent-blue) 0%, var(--color-accent-blue) ${percentage}%, rgba(255, 255, 255, 0.15) ${percentage}%, rgba(255, 255, 255, 0.15) 100%)`,
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 750,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-accent-blue)',
            minWidth: 46,
            textAlign: 'right',
            background: 'rgba(96, 165, 250, 0.12)',
            border: isFocused ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid rgba(96, 165, 250, 0.2)',
            padding: '3px 7px',
            borderRadius: 5,
            boxShadow: isFocused ? '0 0 10px rgba(96, 165, 250, 0.25)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          {value}{unit}
        </span>
      </div>
    </SettingsCard>
  )
}
