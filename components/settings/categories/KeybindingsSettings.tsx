'use client'

import React, { useState } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsCard from '../controls/SettingsCard'
import { Keyboard, Search } from 'lucide-react'

export default function KeybindingsSettings() {
  const { settings } = useSettingsStore()
  const [filterQuery, setFilterQuery] = useState('')

  const keybindings = settings.keybindings.filter((kb) => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    return (
      kb.label.toLowerCase().includes(q) ||
      kb.keys.toLowerCase().includes(q) ||
      kb.category.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <SettingsSection
        title="Keyboard Shortcuts & Hotkeys"
        description="Search and view global keyboard shortcuts across Flow-IDE."
      >
        {/* Shortcut Search Box */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search
            className="w-3.5 h-3.5"
            style={{
              position: 'absolute',
              left: 10,
              top: 9,
              color: 'var(--color-text-dim)',
            }}
          />
          <input
            type="text"
            placeholder="Filter shortcuts (e.g. Delete, Copy, Preferences)..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              padding: '6px 10px 6px 30px',
              color: 'var(--color-text-bright)',
              fontSize: 11,
              outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {/* Shortcut List */}
        {keybindings.length === 0 ? (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: 'var(--color-text-dim)',
            fontSize: 11,
            fontStyle: 'italic',
          }}>
            No matching shortcuts found.
          </div>
        ) : (
          keybindings.map((kb) => (
            <SettingsCard
              key={kb.id}
              title={kb.label}
              description={`Category: ${kb.category}`}
              icon={<Keyboard className="w-3.5 h-3.5 text-[#5fa3ff]" />}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-bright)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                }}
              >
                {kb.keys}
              </span>
            </SettingsCard>
          ))
        )}

        {/* Future disabled placeholder */}
        <SettingsCard
          title="Custom Keybinding Editor & VS Code Import"
          description="Remap custom shortcuts and import keymaps from VS Code profiles."
          badge="Coming Soon"
          disabled
        />
      </SettingsSection>
    </div>
  )
}
