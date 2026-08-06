'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsSlider from '../controls/SettingsSlider'
import SettingsButton from '../controls/SettingsButton'
import SettingsCard from '../controls/SettingsCard'
import { Layout, Sidebar, Layers, RotateCcw, Map } from 'lucide-react'

export default function EditorSettings() {
  const { settings, updateSetting, restoreDefaultLayout, resetCategory, isModified } = useSettingsStore()
  const ed = settings.editor

  return (
    <div>
      <SettingsSection
        title="Workspace & Layout Dimensions"
        description="Configure sidebar widths, panel heights, and workspace behaviors."
      >
        <SettingsSlider
          title="Project Explorer Width"
          description="Default pixel width for the left Explorer sidebar."
          icon={<Sidebar className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('editor', 'explorerWidth')}
          value={ed.explorerWidth}
          min={180}
          max={400}
          step={10}
          unit="px"
          onChange={(val) => updateSetting('editor', 'explorerWidth', val)}
        />

        <SettingsSlider
          title="Properties Panel Width"
          description="Default pixel width for the right Inspector panel."
          icon={<Layers className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('editor', 'propertiesWidth')}
          value={ed.propertiesWidth}
          min={200}
          max={450}
          step={10}
          unit="px"
          onChange={(val) => updateSetting('editor', 'propertiesWidth', val)}
        />

        <SettingsSlider
          title="Bottom Panel Height"
          description="Default height for the Code Output and Serial Monitor panel."
          icon={<Layout className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('editor', 'bottomPanelHeight')}
          value={ed.bottomPanelHeight}
          min={120}
          max={450}
          step={10}
          unit="px"
          onChange={(val) => updateSetting('editor', 'bottomPanelHeight', val)}
        />

        <SettingsButton
          title="Reset Workspace Layout"
          description="Restore all sidebars, inspector panels, and code windows to default dimensions."
          icon={<RotateCcw className="w-4 h-4 text-[#2fd18b]" />}
          buttonText="Restore Default Layout"
          variant="secondary"
          onClick={restoreDefaultLayout}
        />
      </SettingsSection>

      <SettingsSection title="Panel Behavior & Navigation">
        <SettingsToggle
          title="Show MiniMap Canvas Overview"
          description="Display miniature radar view in the bottom right corner of canvas."
          icon={<Map className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('editor', 'showMinimap')}
          checked={ed.showMinimap}
          onChange={(checked) => updateSetting('editor', 'showMinimap', checked)}
        />

        <SettingsToggle
          title="Auto Expand Tree Sections"
          description="Automatically expand Explorer trees when opening documents."
          isModified={isModified('editor', 'autoExpandPanels')}
          checked={ed.autoExpandPanels}
          onChange={(checked) => updateSetting('editor', 'autoExpandPanels', checked)}
        />

        <SettingsToggle
          title="Remember Panel Sizes Across Sessions"
          description="Automatically save manually resized sidebar boundaries."
          isModified={isModified('editor', 'rememberPanelSizes')}
          checked={ed.rememberPanelSizes}
          onChange={(checked) => updateSetting('editor', 'rememberPanelSizes', checked)}
        />

        {/* Future disabled placeholders */}
        <SettingsCard
          title="Dockable Floating Panels"
          description="Detach properties inspector and console into floating desktop windows."
          badge="Coming Soon"
          disabled
        />
        <SettingsCard
          title="Multi-Monitor Layout Sync"
          description="Spill visual node flow canvas across multiple displays."
          badge="Coming Soon"
          disabled
        />

        <SettingsButton
          title="Reset Editor Category"
          description="Restore default values for all preferences in this category."
          icon={<RotateCcw className="w-4 h-4 text-[#ff5f9e]" />}
          buttonText="Restore Editor Defaults"
          variant="secondary"
          onClick={() => resetCategory('editor')}
        />
      </SettingsSection>
    </div>
  )
}
