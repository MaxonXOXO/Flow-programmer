'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsDropdown from '../controls/SettingsDropdown'
import SettingsSlider from '../controls/SettingsSlider'
import SettingsCard from '../controls/SettingsCard'
import SettingsButton from '../controls/SettingsButton'
import { Sun, Palette, Sliders, Maximize2, Zap } from 'lucide-react'

export default function AppearanceSettings() {
  const { settings, updateSetting, resetCategory, isModified } = useSettingsStore()
  const app = settings.appearance

  const accentColors = [
    { id: 'blue', label: 'Neon Blue', hex: '#5fa3ff' },
    { id: 'orange', label: 'Amber Orange', hex: '#f59e0b' },
    { id: 'purple', label: 'Deep Purple', hex: '#a855f7' },
    { id: 'green', label: 'Emerald Green', hex: '#2fd18b' },
  ]

  return (
    <div>
      <SettingsSection
        title="Visual Theme & Customization"
        description="Customize IDE colors, scale, and motion preferences."
      >
        <SettingsDropdown
          title="Application Theme"
          description="Select overall color theme for Flow-IDE interface."
          icon={<Sun className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('appearance', 'theme')}
          value={app.theme}
          options={[
            { value: 'dark', label: 'Dark (Default)' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'Follow System' },
          ]}
          onChange={(val) => updateSetting('appearance', 'theme', val as any)}
        />

        <SettingsCard
          title="Accent Color"
          description="Primary highlight color used across active tabs, selection borders, and buttons."
          icon={<Palette className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('appearance', 'accentColor')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {accentColors.map((col) => {
              const isSelected = app.accentColor === col.id
              return (
                <button
                  key={col.id}
                  onClick={() => updateSetting('appearance', 'accentColor', col.id as any)}
                  title={col.label}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: col.hex,
                    border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: isSelected ? `0 0 10px ${col.hex}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              )
            })}
          </div>
        </SettingsCard>

        <SettingsSlider
          title="Interface Scale"
          description="Adjust overall text and icon display scale."
          icon={<Sliders className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('appearance', 'uiScale')}
          value={app.uiScale}
          min={80}
          max={130}
          step={5}
          unit="%"
          onChange={(val) => updateSetting('appearance', 'uiScale', val)}
        />

        <SettingsToggle
          title="Compact Mode"
          description="Reduce padding and header heights for high-density screen layouts."
          icon={<Maximize2 className="w-4 h-4 text-[#ff5f9e]" />}
          isModified={isModified('appearance', 'compactMode')}
          checked={app.compactMode}
          onChange={(checked) => updateSetting('appearance', 'compactMode', checked)}
        />

        <SettingsToggle
          title="Reduce Motion & Animations"
          description="Disable CSS transitions and animated flow particle lines."
          icon={<Zap className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('appearance', 'reduceMotion')}
          checked={app.reduceMotion}
          onChange={(checked) => updateSetting('appearance', 'reduceMotion', checked)}
        />

        {/* Future disabled placeholders */}
        <SettingsCard
          title="Custom Theme Packs"
          description="Load custom VS Code / JetBrains .json theme extensions."
          badge="Coming Soon"
          disabled
        />
      </SettingsSection>

      {/* Bottom Category Action */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'flex-end' }}>
        <SettingsButton
          title="Reset Appearance Category"
          description="Restore default values for all preferences in this category."
          buttonText="Restore Appearance Defaults"
          variant="secondary"
          onClick={() => resetCategory('appearance')}
        />
      </div>
    </div>
  )
}
