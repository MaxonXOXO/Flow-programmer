'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsToggle from '../controls/SettingsToggle'
import SettingsDropdown from '../controls/SettingsDropdown'
import SettingsCard from '../controls/SettingsCard'
import SettingsButton from '../controls/SettingsButton'
import { Cpu, Zap, FileCode, Terminal, Folder, RotateCcw } from 'lucide-react'

export default function CompilerSettings() {
  const { settings, updateSetting, resetCategory, isModified } = useSettingsStore()
  const cp = settings.compiler

  return (
    <div>
      <SettingsSection
        title="Hardware Target & Compiler Pipeline"
        description="Configure target board platforms, optimization flags, and C++ code generator defaults."
      >
        <SettingsDropdown
          title="Default Target Hardware Board"
          description="Hardware MCU board pre-selected for new projects."
          icon={<Cpu className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('compiler', 'defaultBoard')}
          value={cp.defaultBoard}
          options={[
            { value: 'arduino_uno', label: 'Arduino Uno (ATmega328P · 16MHz)' },
            { value: 'esp32', label: 'ESP32 (Xtensa Dual-Core · 240MHz)' },
            { value: 'esp8266', label: 'NodeMCU ESP8266 (80MHz)' },
          ]}
          onChange={(val) => updateSetting('compiler', 'defaultBoard', val as any)}
        />

        <SettingsDropdown
          title="GCC Optimization Level"
          description="Optimization flags passed to the AVR/GCC compiler toolchain."
          icon={<Zap className="w-4 h-4 text-[#ffb13d]" />}
          isModified={isModified('compiler', 'optimizationLevel')}
          value={cp.optimizationLevel}
          options={[
            { value: 'O0', label: 'O0 (None - Fast compile)' },
            { value: 'O2', label: 'O2 (Standard - Balanced)' },
            { value: 'O3', label: 'O3 (Aggressive - Performance)' },
            { value: 'Os', label: 'Os (Optimize for Binary Size)' },
          ]}
          onChange={(val) => updateSetting('compiler', 'optimizationLevel', val as any)}
        />

        <SettingsToggle
          title="Generate Docstring Comments"
          description="Include node type and pin annotation comments in generated sketch.ino."
          icon={<FileCode className="w-4 h-4 text-[#2fd18b]" />}
          isModified={isModified('compiler', 'generateComments')}
          checked={cp.generateComments}
          onChange={(checked) => updateSetting('compiler', 'generateComments', checked)}
        />

        <SettingsToggle
          title="Auto Code Formatting"
          description="Format C++ source code cleanly according to Arduino style conventions."
          isModified={isModified('compiler', 'codeFormatting')}
          checked={cp.codeFormatting}
          onChange={(checked) => updateSetting('compiler', 'codeFormatting', checked)}
        />

        <SettingsToggle
          title="Verbose Compiler Output"
          description="Log detailed AST transformations and symbol table entries during build."
          icon={<Terminal className="w-4 h-4 text-[#a855f7]" />}
          isModified={isModified('compiler', 'verboseOutput')}
          checked={cp.verboseOutput}
          onChange={(checked) => updateSetting('compiler', 'verboseOutput', checked)}
        />

        <SettingsCard
          title="Build Output Folder"
          description="Directory where compiled sketch.ino, wiring.md, and hex binaries are generated."
          icon={<Folder className="w-4 h-4 text-[#5fa3ff]" />}
          isModified={isModified('compiler', 'outputFolder')}
        >
          <span style={{
            fontSize: 10.5,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-accent-blue)',
            background: 'rgba(96, 165, 250, 0.1)',
            padding: '4px 8px',
            borderRadius: 4,
          }}>
            ./{cp.outputFolder}
          </span>
        </SettingsCard>

        {/* Future disabled placeholders */}
        <SettingsCard
          title="Custom Toolchain Path"
          description="Specify custom path to avr-gcc or esptool.py binary executable."
          badge="Coming Soon"
          disabled
        />

        <SettingsButton
          title="Reset Compiler Category"
          description="Restore default values for all preferences in this category."
          icon={<RotateCcw className="w-4 h-4 text-[#ff5f9e]" />}
          buttonText="Restore Compiler Defaults"
          variant="secondary"
          onClick={() => resetCategory('compiler')}
        />
      </SettingsSection>
    </div>
  )
}
