'use client'

import React, { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SettingsSearchProps {
  value: string
  onChange: (query: string) => void
}

export default function SettingsSearch({ value, onChange }: SettingsSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Search
        className="w-4 h-4 text-dim"
        style={{
          position: 'absolute',
          left: 12,
          color: 'var(--color-text-dim)',
          pointerEvents: 'none',
        }}
      />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search settings (e.g. grid, theme, board, zoom)..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: 'rgba(17, 20, 28, 0.95)',
          border: '1px solid #2a3550',
          borderRadius: 6,
          padding: '8px 60px 8px 34px',
          color: 'var(--color-text-bright)',
          fontSize: 11.5,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent-blue)'
          e.currentTarget.style.boxShadow = '0 0 12px rgba(96, 165, 250, 0.2)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#2a3550'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
        }}
      />
      <div style={{
        position: 'absolute',
        right: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {value ? (
          <button
            onClick={() => onChange('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ff5f9e'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-dim)',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '1px 5px',
            borderRadius: 4,
            pointerEvents: 'none',
          }}>
            Ctrl+K
          </span>
        )}
      </div>
    </div>
  )
}
