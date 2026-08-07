'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface CustomSelectOption {
  value: string
  label: string
}

export interface CustomSelectProps {
  value: string
  options: CustomSelectOption[]
  onChange: (value: string) => void
  onOpenChange?: (open: boolean) => void
  placeholder?: string
  style?: React.CSSProperties
  dropdownZIndex?: number
}

export default function CustomSelect({
  value,
  options,
  onChange,
  onOpenChange,
  placeholder = 'Select option...',
  style,
  dropdownZIndex = 100000,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleOpen = (openState: boolean) => {
    setIsOpen(openState)
    onOpenChange?.(openState)
  }

  const selectedOption = options.find((opt) => opt.value === value)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggleOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        zIndex: isOpen ? 9999 : 'auto',
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => toggleOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'rgba(0, 0, 0, 0.25)',
          border: isOpen ? '1px solid var(--color-border-focus)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          padding: '5px 8px',
          color: selectedOption ? 'var(--color-text-bright)' : 'var(--color-text-dim)',
          fontSize: 11,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 1px var(--color-border-focus)' : 'none',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 text-[var(--color-text-dim)]"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: 6,
          }}
        />
      </button>

      {/* Options Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '100%',
            background: '#0d1017',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 6,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95)',
            zIndex: dropdownZIndex,
            maxHeight: 200,
            overflowY: 'auto',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  toggleOpen(false)
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#60a5fa' : 'var(--color-text-normal)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--color-accent)'
                    e.currentTarget.style.color = '#ffffff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-normal)'
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#60a5fa]" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
