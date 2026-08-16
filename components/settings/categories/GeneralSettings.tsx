'use client'

import React, { useRef, useState } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsDropdown from '../controls/SettingsDropdown'
import SettingsNumberInput from '../controls/SettingsNumberInput'
import SettingsButton from '../controls/SettingsButton'
import SettingsCard from '../controls/SettingsCard'
import { Monitor, RefreshCw, Save, AlertTriangle, ListFilter, RotateCcw, Download, Upload, Check } from 'lucide-react'

export default function GeneralSettings() {
  const { settings, updateSetting, resetCategory, isModified, exportYamlSettings, importYamlSettings } = useSettingsStore()
  const gen = settings.general
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importedMessage, setImportedMessage] = useState<string | null>(null)

  const handleExportYaml = () => {
    const yamlText = exportYamlSettings()
    const blob = new Blob([yamlText], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'settings.yaml'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportYaml = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const success = importYamlSettings(text)
        if (success) {
          setImportedMessage('settings.yaml imported successfully!')
          setTimeout(() => setImportedMessage(null), 3000)
        } else {
          setImportedMessage('Failed to parse YAML file.')
          setTimeout(() => setImportedMessage(null), 3000)
        }
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <SettingsSection
        title="Application Workspace"
        description="Configure global application behavior, startup views, and YAML configuration file persistence."
      >
        {/* Startup Workspace */}
        <SettingsDropdown
          title="Startup Workspace"
          description="Default view when launching Flow-IDE (Flow Editor Canvas or Welcome Splash Screen)."
          icon={<Monitor className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('general', 'startupWorkspace')}
          value={gen.startupWorkspace}
          options={[
            { value: 'editor', label: 'Flow Editor Canvas' },
            { value: 'splash', label: 'Welcome Splash Screen' },
          ]}
          onChange={(val) => updateSetting('general', 'startupWorkspace', val as any)}
        />

        {/* Confirm Before Closing Unsaved Projects */}
        <SettingsToggle
          title="Confirm Before Closing Unsaved Projects"
          description="Prompt for confirmation when closing modified canvas tabs or exiting the app."
          icon={<AlertTriangle className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('general', 'confirmUnsaved')}
          checked={gen.confirmUnsaved}
          onChange={(checked) => updateSetting('general', 'confirmUnsaved', checked)}
        />

        {/* Auto Save Projects */}
        <SettingsToggle
          title="Auto Save Projects"
          description="Automatically persist visual nodes and schematic connections."
          icon={<Save className="w-4 h-4 text-[#2fd18b]" />}
          isModified={isModified('general', 'autoSave')}
          checked={gen.autoSave}
          onChange={(checked) => updateSetting('general', 'autoSave', checked)}
        />

        {/* Check For Updates */}
        <SettingsToggle
          title="Check For Updates Automatically"
          description="Notify when a new version of Flow-IDE or hardware libraries are available."
          icon={<RefreshCw className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('general', 'checkForUpdates')}
          checked={gen.checkForUpdates}
          onChange={(checked) => updateSetting('general', 'checkForUpdates', checked)}
        />

        {/* History Limit */}
        <SettingsNumberInput
          title="Recent Projects History Limit"
          description="Maximum number of recent projects displayed on the start page."
          icon={<ListFilter className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('general', 'recentLimit')}
          value={gen.recentLimit}
          min={3}
          max={20}
          unit="projects"
          onChange={(val) => updateSetting('general', 'recentLimit', val)}
        />

        {/* YAML Configuration Management */}
        <SettingsCard
          title="YAML Configuration Management"
          description="Flow-IDE reads and writes preferences directly in YAML format (settings.yaml). Export or import your settings file."
          icon={<Download className="w-4 h-4 text-[#5fa3ff]" />}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".yaml,.yml"
              style={{ display: 'none' }}
              onChange={handleImportYaml}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-bright)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <Upload className="w-3.5 h-3.5 text-[#5fa3ff]" />
              Import settings.yaml
            </button>

            <button
              onClick={handleExportYaml}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: 'rgba(95, 163, 255, 0.16)',
                border: '1px solid rgba(95, 163, 255, 0.3)',
                color: '#5fa3ff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(95, 163, 255, 0.26)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(95, 163, 255, 0.16)'}
            >
              <Download className="w-3.5 h-3.5" />
              Export settings.yaml
            </button>

            {importedMessage && (
              <span style={{ fontSize: 11, color: '#2fd18b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check className="w-3.5 h-3.5" />
                {importedMessage}
              </span>
            )}
          </div>
        </SettingsCard>

        {/* Reset Category */}
        <SettingsButton
          title="Reset General Category"
          description="Restore default values for all preferences in this category."
          icon={<RotateCcw className="w-4 h-4 text-[#ff5f9e]" />}
          buttonText="Restore General Defaults"
          variant="secondary"
          onClick={() => resetCategory('general')}
        />
      </SettingsSection>
    </div>
  )
}
