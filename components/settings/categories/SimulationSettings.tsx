'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsSlider from '../controls/SettingsSlider'
import SettingsNumberInput from '../controls/SettingsNumberInput'
import SettingsCard from '../controls/SettingsCard'
import SettingsButton from '../controls/SettingsButton'
import { Play, RotateCcw, Activity, Terminal, Clock } from 'lucide-react'

export default function SimulationSettings() {
  const { settings, updateSetting, resetCategory, isModified } = useSettingsStore()
  const sm = settings.simulation

  return (
    <div>
      <SettingsSection
        title="Runtime Simulation & Execution"
        description="Configure live virtual node execution speed, GPIO monitoring, and simulation limits."
      >
        <SettingsSlider
          title="Simulation Execution Speed"
          description="Playback speed multiplier for node stepping and variable updates."
          icon={<Play className="w-4 h-4 text-[#2fd18b]" />}
          isModified={isModified('simulation', 'simulationSpeed')}
          value={sm.simulationSpeed}
          min={0.25}
          max={4.0}
          step={0.25}
          unit="x"
          onChange={(val) => updateSetting('simulation', 'simulationSpeed', val)}
        />

        <SettingsToggle
          title="Auto Reset MCU on Simulation Start"
          description="Clear global variable state and start from Main Flow Start node."
          icon={<RotateCcw className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('simulation', 'autoResetMCU')}
          checked={sm.autoResetMCU}
          onChange={(checked) => updateSetting('simulation', 'autoResetMCU', checked)}
        />

        <SettingsToggle
          title="Enable Live GPIO Preview"
          description="Highlight high/low digital pin states on the Arduino Uno schematic board in real-time."
          icon={<Activity className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('simulation', 'liveGpioPreview')}
          checked={sm.liveGpioPreview}
          onChange={(checked) => updateSetting('simulation', 'liveGpioPreview', checked)}
        />

        <SettingsToggle
          title="Serial Monitor Auto Open"
          description="Automatically bring up the Serial Monitor console when Serial.print nodes execute."
          icon={<Terminal className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('simulation', 'serialMonitorAutoOpen')}
          checked={sm.serialMonitorAutoOpen}
          onChange={(checked) => updateSetting('simulation', 'serialMonitorAutoOpen', checked)}
        />

        <SettingsNumberInput
          title="Simulation Timeout"
          description="Maximum continuous execution time before auto-stopping simulation."
          icon={<Clock className="w-4 h-4 text-[#ff5f9e]" />}
          isModified={isModified('simulation', 'simulationTimeout')}
          value={sm.simulationTimeout}
          min={5}
          max={300}
          step={5}
          unit="sec"
          onChange={(val) => updateSetting('simulation', 'simulationTimeout', val)}
        />

        {/* Future disabled placeholders */}
        <SettingsCard
          title="Virtual Sensor Data Generator"
          description="Simulate dynamic sensor waveforms (sine, square, noise) during runtime."
          badge="Coming Soon"
          disabled
        />
        <SettingsCard
          title="Power Consumption Estimator"
          description="Calculate milliamp (mA) draw across connected hardware components."
          badge="Coming Soon"
          disabled
        />
      </SettingsSection>

      {/* Bottom Category Action */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'flex-end' }}>
        <SettingsButton
          title="Reset Simulation Category"
          description="Restore default values for all preferences in this category."
          buttonText="Restore Simulation Defaults"
          variant="secondary"
          onClick={() => resetCategory('simulation')}
        />
      </div>
    </div>
  )
}
