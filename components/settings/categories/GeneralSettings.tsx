'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsDropdown from '../controls/SettingsDropdown'
import SettingsNumberInput from '../controls/SettingsNumberInput'
import SettingsButton from '../controls/SettingsButton'
import { Monitor, RefreshCw, Save, AlertTriangle, ListFilter, RotateCcw } from 'lucide-react'

export default function GeneralSettings() {
  const { settings, updateSetting, resetCategory, isModified } = useSettingsStore()
  const gen = settings.general

  return (
    <div>
      <SettingsSection
        title="Application Workspace"
        description="Configure global application behavior and startup views."
      >
        <SettingsDropdown
          title="Startup Workspace"
          description="Default view when launching Flow-IDE."
          icon={<Monitor className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('general', 'startupWorkspace')}
          value={gen.startupWorkspace}
          options={[
            { value: 'editor', label: 'Flow Editor Canvas' },
            { value: 'splash', label: 'Welcome Splash Screen' },
          ]}
          onChange={(val) => updateSetting('general', 'startupWorkspace', val as any)}
        />

        <SettingsToggle
          title="Auto Save Projects"
          description="Automatically persist visual nodes and schematic connections."
          icon={<Save className="w-4 h-4 text-[#2fd18b]" />}
          isModified={isModified('general', 'autoSave')}
          checked={gen.autoSave}
          onChange={(checked) => updateSetting('general', 'autoSave', checked)}
        />

        <SettingsToggle
          title="Check For Updates Automatically"
          description="Notify when a new version of Flow-IDE or hardware libraries are available."
          icon={<RefreshCw className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('general', 'checkForUpdates')}
          checked={gen.checkForUpdates}
          onChange={(checked) => updateSetting('general', 'checkForUpdates', checked)}
        />

        <SettingsToggle
          title="Confirm Before Closing Unsaved Projects"
          description="Prompt for confirmation when closing modified canvas tabs."
          icon={<AlertTriangle className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('general', 'confirmUnsaved')}
          checked={gen.confirmUnsaved}
          onChange={(checked) => updateSetting('general', 'confirmUnsaved', checked)}
        />

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
