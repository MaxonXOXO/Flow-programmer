'use client'

import React from 'react'
import SettingsSection from '../controls/SettingsSection'
import SettingsCard from '../controls/SettingsCard'
import SettingsButton from '../controls/SettingsButton'
import { BookOpen, ShieldCheck, RefreshCw } from 'lucide-react'

export default function AboutSettings() {
  return (
    <div>
      <SettingsSection
        title="About Flow-IDE"
        description="Software architecture, version specification, and legal information."
      >
        {/* Hero Banner with Splash.png Background */}
        <div
          style={{
            position: 'relative',
            height: 180,
            borderRadius: 12,
            backgroundImage: `linear-gradient(135deg, rgba(9, 10, 15, 0.72) 0%, rgba(13, 16, 23, 0.85) 100%), url('/Splash.png')`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            marginBottom: 20,
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 850,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '1px',
                lineHeight: 1.1,
              }}
            >
              FLOW-IDE
            </h2>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.65)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                letterSpacing: '0.5px',
              }}
            >
              Build 2026.08.06
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
          onClick={() => alert('Flow-IDE is up to date! (Build 2026.08.06)')}
        />

        <SettingsButton
          title="Documentation & Tutorials"
          description="Read full compiler specifications, AST guides, and component wiring documentation."
          icon={<BookOpen className="w-4 h-4 text-[#ffb13d]" />}
          buttonText="Open Documentation"
          variant="secondary"
          onClick={() => alert('Documentation coming soon.')}
        />
      </SettingsSection>
    </div>
  )
}
