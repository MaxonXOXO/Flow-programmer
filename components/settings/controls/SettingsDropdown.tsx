'use client'

import React from 'react'
import SettingsCard from './SettingsCard'
import CustomSelect from '@/components/ui/CustomSelect'

interface OptionItem {
  value: string
  label: string
}

interface SettingsDropdownProps {
  title: string
  description?: string
  icon?: React.ReactNode
  badge?: string
  isModified?: boolean
  requiresRestart?: boolean
  value: string
  options: OptionItem[]
  disabled?: boolean
  width?: number | string
  onChange: (newVal: string) => void
}

export default function SettingsDropdown({
  title,
  description,
  icon,
  badge,
  isModified = false,
  requiresRestart = false,
  value,
  options,
  disabled = false,
  width = 150,
  onChange,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <SettingsCard
      title={title}
      description={description}
      icon={icon}
      badge={badge}
      isModified={isModified}
      requiresRestart={requiresRestart}
      disabled={disabled}
      style={{ zIndex: isOpen ? 100 : 1 }}
    >
      <div style={{ width: typeof width === 'number' ? `${width}px` : width }}>
        <CustomSelect
          value={value}
          options={options}
          onChange={onChange}
          onOpenChange={setIsOpen}
        />
      </div>
    </SettingsCard>
  )
}
