'use client'

import React from 'react'
import SettingsCard from './SettingsCard'

interface SettingsButtonProps {
  title: string
  description?: string
  icon?: React.ReactNode
  buttonText: string
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  onClick: () => void
}

export default function SettingsButton({
  title,
  description,
  icon,
  buttonText,
  variant = 'secondary',
  disabled = false,
  onClick,
}: SettingsButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--color-accent)',
          border: '1px solid var(--color-accent-blue)',
          color: '#ffffff',
        }
      case 'danger':
        return {
          background: 'rgba(239, 95, 95, 0.12)',
          border: '1px solid rgba(239, 95, 95, 0.3)',
          color: '#ef5f5f',
        }
      case 'secondary':
      default:
        return {
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--color-text-bright)',
        }
    }
  }

  const vStyles = getVariantStyles()

  return (
    <SettingsCard
      title={title}
      description={description}
      icon={icon}
      disabled={disabled}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...vStyles,
          padding: '5px 12px',
          borderRadius: 5,
          fontSize: 10.5,
          fontWeight: 650,
          fontFamily: 'var(--font-sans)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          outline: 'none',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!disabled) {
            e.currentTarget.style.opacity = '0.85'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={e => {
          if (!disabled) {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'none'
          }
        }}
      >
        {buttonText}
      </button>
    </SettingsCard>
  )
}
