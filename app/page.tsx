'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [selected, setSelected] = useState<'new' | 'open' | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)

  const canStart = projectName.trim() && platform

  const handleStart = () => {
    if (!canStart) return
    localStorage.setItem('fp_project', JSON.stringify({
      name: projectName,
      platform,
      createdAt: Date.now(),
    }))
    router.push('/editor')
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0b0d11',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#5fa3ff', letterSpacing: -1 }}>
          ⟨<span style={{ color: '#2fd18b' }}>flow</span>⟩ programmer
        </div>
        <div style={{ fontSize: 13, color: '#4a5270', marginTop: 8 }}>
          visual coding for embedded systems
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#111318',
        border: '1px solid #2a3040',
        borderRadius: 14,
        padding: '32px 36px',
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* New / Open */}
        <div style={{ display: 'flex', gap: 12 }}>
          {(['new', 'open'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              style={{
                flex: 1,
                padding: '12px',
                background: selected === opt ? '#1e2d4a' : '#1e2330',
                border: `1.5px solid ${selected === opt ? '#3d8bff' : '#2a3040'}`,
                borderRadius: 8,
                color: selected === opt ? '#5fa3ff' : '#8a94b0',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {opt === 'new' ? '+ New Project' : '↑ Open Project'}
            </button>
          ))}
        </div>

        {/* Project name */}
        <div>
          <div style={{ fontSize: 11, color: '#4a5270', marginBottom: 6, letterSpacing: '0.8px' }}>
            PROJECT NAME
          </div>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="my_arduino_project"
            style={{
              width: '100%',
              background: '#0b0d11',
              border: '1px solid #2a3040',
              borderRadius: 7,
              padding: '9px 12px',
              color: '#e4e8f4',
              fontSize: 13,
              fontFamily: 'monospace',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#3d8bff'}
            onBlur={e => e.target.style.borderColor = '#2a3040'}
          />
        </div>

        {/* Platform */}
        <div>
          <div style={{ fontSize: 11, color: '#4a5270', marginBottom: 10, letterSpacing: '0.8px' }}>
            TARGET PLATFORM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { id: 'arduino-uno', label: 'Arduino Uno', sub: 'ATmega328P · 14 digital · 6 analog', color: '#2fd18b' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  background: platform === p.id ? '#0d2b1a' : '#1e2330',
                  border: `1.5px solid ${platform === p.id ? p.color : '#2a3040'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${p.color}18`,
                  border: `1px solid ${p.color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}>
                  ⚡
                </div>
                <div>
                  <div style={{ color: platform === p.id ? p.color : '#e4e8f4', fontSize: 14, fontWeight: 600 }}>
                    {p.label}
                  </div>
                  <div style={{ color: '#4a5270', fontSize: 11, marginTop: 2 }}>
                    {p.sub}
                  </div>
                </div>
                {platform === p.id && (
                  <div style={{ marginLeft: 'auto', color: p.color, fontSize: 16 }}>✓</div>
                )}
              </button>
            ))}

            {/* Coming soon */}
            {[
              { label: 'ESP32', sub: 'Xtensa LX6 · 38 pins · WiFi + BT' },
              { label: 'ESP8266', sub: 'Tensilica L106 · 17 pins · WiFi' },
            ].map(p => (
              <div
                key={p.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  background: '#111318',
                  border: '1.5px solid #1e2330',
                  borderRadius: 8,
                  opacity: 0.4,
                  cursor: 'not-allowed',
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#1e2330',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}>
                  ⚡
                </div>
                <div>
                  <div style={{ color: '#4a5270', fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                  <div style={{ color: '#2a3040', fontSize: 11, marginTop: 2 }}>{p.sub}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#2a3040', fontSize: 11 }}>coming soon</div>
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          style={{
            padding: '12px',
            background: canStart ? '#2fd18b' : '#1e2330',
            border: `1px solid ${canStart ? '#2fd18b' : '#2a3040'}`,
            borderRadius: 8,
            color: canStart ? '#0b0d11' : '#4a5270',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'monospace',
            cursor: canStart ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          {canStart ? `Start ${projectName} →` : 'Select platform to continue'}
        </button>
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: '#2a3040' }}>
        v0.1.0 · MaxonXOXO
      </div>
    </div>
  )
}