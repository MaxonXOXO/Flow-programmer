'use client'

import React from 'react'
import SettingsSection from '../controls/SettingsSection'
import SettingsCard from '../controls/SettingsCard'
import SettingsButton from '../controls/SettingsButton'
import { Cpu, GitBranch, BookOpen, ShieldCheck, RefreshCw } from 'lucide-react'

export default function AboutSettings() {
  return (
    <div>
      <SettingsSection
        title="About Flow-IDE"
        description="Software architecture, version specification, and legal information."
      >
        {/* Application Identity Hero Panel */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
            border: '1px solid rgba(95, 163, 255, 0.25)',
            borderRadius: 10,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 20,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(59, 130, 246, 0.3)',
              flexShrink: 0,
              padding: 6,
            }}
          >
            <img src="/flowide.png" alt="Flow-IDE Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{
                fontSize: 20,
                fontWeight: 850,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '0.8px',
              }}>
                FLOW-IDE
              </h2>
              <span style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#2fd18b',
                background: 'rgba(47, 209, 139, 0.12)',
                border: '1px solid rgba(47, 209, 139, 0.3)',
                padding: '2px 8px',
                borderRadius: 999,
                letterSpacing: '0.5px',
              }}>
                STABLE RELEASE
              </span>
            </div>
            
            <p style={{
              fontSize: 11.5,
              color: 'var(--color-text-dim)',
              marginTop: 4,
              margin: 0,
            }}>
              Universal Embedded Visual Programming & Compiler Infrastructure
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 12,
              fontSize: 10.5,
              color: 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
            }}>
              <span>Version: <strong style={{ color: '#ffffff' }}>1.5.0-beta</strong></span>
              <span>•</span>
              <span>Build: <strong style={{ color: '#ffffff' }}>2026.08.06</strong></span>
              <span>•</span>
              <span>Channel: <strong style={{ color: '#5fa3ff' }}>Official</strong></span>
            </div>
          </div>
        </div>

        <SettingsCard
          title="License & Intellectual Property"
          description="Open-Source MIT License · Free for commercial, personal, and educational deployment."
          icon={<ShieldCheck className="w-4 h-4 text-[#2fd18b]" />}
        />

        <SettingsCard
          title="Copyright & Credits"
          description="© 2026 Flow-IDE Core Team. Built with Next.js, React Flow, and Universal AST Compiler."
          icon={<ShieldCheck className="w-4 h-4 text-[#5fa3ff]" />}
        />

        <SettingsButton
          title="Check for Software Updates"
          description="Verify latest IDE build and hardware board definition packages."
          icon={<RefreshCw className="w-4 h-4 text-[#a855f7]" />}
          buttonText="Check for Updates"
          variant="primary"
          onClick={() => alert('Flow-IDE is up to date! (v1.5.0-beta Build 2026.08.06)')}
        />

        <SettingsButton
          title="Documentation & Tutorials"
          description="Read full compiler specifications, AST guides, and component wiring documentation."
          icon={<BookOpen className="w-4 h-4 text-[#ffb13d]" />}
          buttonText="Open Documentation"
          variant="secondary"
          onClick={() => window.open('https://github.com/MaxonXOXO/Flow-programmer', '_blank')}
        />

        <SettingsButton
          title="GitHub Repository"
          description="View source code, report issues, or contribute component packages."
          icon={<GitBranch className="w-4 h-4 text-[#ffffff]" />}
          buttonText="View GitHub"
          variant="secondary"
          onClick={() => window.open('https://github.com/MaxonXOXO/Flow-programmer', '_blank')}
        />
      </SettingsSection>
    </div>
  )
}
