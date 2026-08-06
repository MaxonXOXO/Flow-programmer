'use client'

import React from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import SettingsSection from '../controls/SettingsSection'
import SettingsCard from '../controls/SettingsCard'
import { Package, CheckCircle2, ShoppingBag } from 'lucide-react'

export default function ExtensionsSettings() {
  const { settings } = useSettingsStore()
  const extensions = settings.extensions

  return (
    <div>
      <SettingsSection
        title="Installed Plugins & Extensions"
        description="Manage hardware support packs, toolchains, and community extensions."
      >
        {extensions.map((ext) => (
          <SettingsCard
            key={ext.id}
            title={ext.name}
            description={ext.description}
            icon={<Package className="w-4 h-4 text-[#5fa3ff]" />}
            badge={`v${ext.version}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {ext.installed ? (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: '#2fd18b',
                    background: 'rgba(47, 209, 139, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircle2 className="w-3 h-3 text-[#2fd18b]" />
                  INSTALLED
                </span>
              ) : (
                <button
                  onClick={() => alert(`Installing ${ext.name}...`)}
                  style={{
                    background: 'var(--color-accent)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Install
                </button>
              )}
            </div>
          </SettingsCard>
        ))}

        <SettingsCard
          title="Flow Extension Marketplace"
          description="Browse and install community toolchains, custom node packs, and theme extensions."
          icon={<ShoppingBag className="w-4 h-4 text-[#ffb13d]" />}
          badge="Coming Soon"
          disabled
        />
      </SettingsSection>
    </div>
  )
}
