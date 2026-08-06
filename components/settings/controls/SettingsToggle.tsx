'use client'

import React from 'react'
import SettingsCard from './SettingsCard'

interface SettingsToggleProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  isModified?: boolean
  requiresRestart?: boolean
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export default function SettingsToggle({
  title,
  description,
  icon,
  badge,
  isModified = false,
  requiresRestart = false,
  checked,
  disabled = false,
  onChange,
}: SettingsToggleProps) {
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
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: checked ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.12)',
          border: 'none',
          padding: 3,
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          alignItems: 'center',
          outline: 'none',
          boxShadow: checked ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = checked 
            ? '0 0 0 2px #5fa3ff, 0 0 12px rgba(59, 130, 246, 0.5)' 
            : '0 0 0 2px rgba(255, 255, 255, 0.2)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = checked ? '0 0 12px rgba(59, 130, 246, 0.5)' : 'none'
        }}
        onMouseDown={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#ffffff',
            transform: checked ? 'translateX(16px)' : 'translateX(0px)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
          }}
        />
      </button>
    </SettingsCard>
  )
}
