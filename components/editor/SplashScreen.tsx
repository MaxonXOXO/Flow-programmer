'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlowStore } from '@/store/userFlowStore'
import {
  Bluetooth, Check, ChevronRight, Clock, Cpu, FileText, FolderOpen,
  Plus, Settings, Sun, Terminal, Thermometer, Wifi, X,
} from 'lucide-react'

import { importProject, extractStoreState } from '@/lib/project/projectManager'
import { useSettingsStore } from '@/store/useSettingsStore'
import PreferencesModal from '@/components/settings/PreferencesModal'
import GradientText from '@/components/ui/GradientText'

interface SavedProject { name: string; platform: string; createdAt: number }

export default function SplashScreen() {
  const router = useRouter()
  const { loadProjectState } = useFlowStore()
  const [projectName, setProjectName] = useState('')
  const [platform, setPlatform] = useState('arduino-uno')
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([])
  const [showNamingModal, setShowNamingModal] = useState(false)
  const [asciiText, setAsciiText] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('fp_project_history')
      setRecentProjects(saved ? JSON.parse(saved) : [])
    } catch { setRecentProjects([]) }
    const names = ['smart_controller', 'sensor_station', 'untitled_flow', 'device_monitor']
    setProjectName(names[Math.floor(Math.random() * names.length)])

    fetch('/ascii-art.html')
      .then((res) => res.text())
      .then((html) => {
        const bodyContent = html.includes('<body>') ? html.split('<body>')[1].split('</body>')[0] : html
        const text = bodyContent
          .replace(/<span style="color:(#[0-9a-fA-F]{6})">([^<]+)<\/span>/g, (m, hex, txt) => {
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            if (g < 10 && b < 32 && r < 10) return ' '
            return txt
          })
          .replace(/<br\s*\/?>/gi, '\n')
        setAsciiText(text)
      })
      .catch((err) => console.error('Failed to load ascii-art.html', err))
  }, [])

  const saveProject = (nameToUse?: string, platformToUse?: string) => {
    const name = (nameToUse || projectName).trim()
    const selectedPlatform = platformToUse || platform
    if (!name) return
    const project = { name, platform: selectedPlatform, createdAt: Date.now() }
    const history = [project, ...recentProjects.filter(item => item.name !== name)].slice(0, 6)
    localStorage.setItem('fp_project', JSON.stringify(project))
    localStorage.setItem('fp_project_history', JSON.stringify(history))
    setRecentProjects(history)
    setShowNamingModal(false)
    router.push('/editor')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = loadEvent => {
      const content = loadEvent.target?.result as string
      const result = importProject(content)
      if (result.success && result.project) {
        loadProjectState(extractStoreState(result.project))
        localStorage.setItem('fp_project', JSON.stringify({ name: result.project.metadata.name, platform: result.project.board.id }))
        router.push('/editor')
      } else {
        alert(`Failed to load project file:\n\n${(result.errors || ['Invalid project file.']).join('\n')}`)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const relativeTime = (time: number) => {
    const hours = Math.floor((Date.now() - time) / 3_600_000)
    return hours < 1 ? 'just now' : hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
  }

  const templates = [
    { name: 'light_sensor', label: 'Light sensor', detail: 'LDR · analog input', icon: Sun, color: '#fbbf24' },
    { name: 'temp_monitor', label: 'Temperature monitor', detail: 'DHT22 · serial output', icon: Thermometer, color: '#f97316' },
    { name: 'wifi_ping', label: 'Connection check', detail: 'ESP pattern · Wi-Fi', icon: Wifi, color: '#22d3ee' },
    { name: 'ble_control', label: 'Bluetooth control', detail: 'HC-05 · digital I/O', icon: Bluetooth, color: '#818cf8' },
  ]

  const boards = [
    { id: 'arduino-uno', name: 'Arduino Uno', info: 'ATmega328P · 16 MHz', available: true, image: '/mcu/arduino_uno.png' },
    { id: 'esp32', name: 'ESP32', info: 'Wi-Fi · BLE · Dual core', available: false, image: '/mcu/esp32.png' },
    { id: 'esp8266', name: 'NodeMCU', info: 'Wi-Fi · 17 GPIO', available: false, image: '/mcu/esp8266.png' },
  ]

  return (
    <main style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#090a0f',
      color: 'var(--color-text-normal)', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none', position: 'relative',
    }}>
      <input ref={fileInputRef} type="file" accept=".flow,.json" onChange={handleFileChange} style={{ display: 'none' }} />

      {/* ─── Decorative ASCII Bird Background ─── */}
      {asciiText && (
        <div style={{
          position: 'absolute',
          right: '-2%',
          bottom: '-4%',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: mounted ? 0.18 : 0,
          transition: 'opacity 1.8s ease',
          maxHeight: '110vh',
          overflow: 'hidden',
          filter: 'drop-shadow(0 0 60px rgba(0, 150, 255, 0.2))',
        }}>
          <GradientText
            colors={["#1a3a5c", "#2563eb", "#6366f1", "#2563eb", "#1a3a5c"]}
            animationSpeed={6}
            showBorder={false}
            direction="horizontal"
          >
            <pre style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '10px',
              lineHeight: '1.05',
              whiteSpace: 'pre',
              margin: 0,
              userSelect: 'none',
              textAlign: 'left',
              letterSpacing: '-0.5px',
            }}>
              {asciiText}
            </pre>
          </GradientText>
        </div>
      )}

      {/* ─── Subtle grid pattern background ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      {/* ─── Ambient gradient glow ─── */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.06), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── Content Layer ─── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ─── Top Bar ─── */}
        <header style={{
          height: 48, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,16,23,0.8)',
          backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/flowide.png" alt="Flow-IDE" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <span style={{ color: 'var(--color-text-bright)', fontSize: 12.5, fontWeight: 750, letterSpacing: '.5px' }}>FLOW IDE</span>
            <span style={{ color: 'var(--color-text-dim)', fontSize: 9.5, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>v1.5.0-beta</span>
          </div>
          <button
            onClick={() => useSettingsStore.getState().openPreferences()}
            style={{
              border: 'none', background: 'transparent', color: 'var(--color-text-dim)',
              cursor: 'pointer', padding: 6, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              transition: 'color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-normal)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-dim)' }}
          >
            <Settings size={16} />
          </button>
        </header>

        {/* ─── Main Content ─── */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 880, padding: '48px 40px 40px' }}>

            {/* ─── Hero ─── */}
            <div style={{ marginBottom: 40 }}>
              <h1 style={{
                margin: 0, color: 'var(--color-text-bright)',
                fontSize: 28, fontWeight: 800, letterSpacing: '-.4px',
                lineHeight: 1.2,
              }}>
                Welcome to Flow IDE
              </h1>
              <p style={{
                margin: '8px 0 0', color: 'rgba(255,255,255,0.45)',
                fontSize: 13, lineHeight: 1.5, maxWidth: 440,
              }}>
                Visual embedded development — design, simulate, and deploy hardware flows from one workspace.
              </p>
            </div>

            {/* ─── Primary Actions Row ─── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 36 }}>
              <button
                onClick={() => setShowNamingModal(true)}
                style={{
                  border: '1px solid rgba(59,130,246,0.4)',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))',
                  color: 'var(--color-text-bright)',
                  padding: '14px 22px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, fontWeight: 650,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all .2s ease',
                  flex: 1, maxWidth: 260,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.7)'
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(59,130,246,0.12))'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06))'
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: 'rgba(59,130,246,0.2)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Plus size={16} color="var(--color-accent-blue)" />
                </div>
                <div>
                  <div>New Project</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginTop: 2 }}>Create a visual flow</div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--color-text-bright)',
                  padding: '14px 22px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, fontWeight: 650,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all .2s ease',
                  flex: 1, maxWidth: 260,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 7,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <FolderOpen size={16} color="var(--color-text-dim)" />
                </div>
                <div>
                  <div>Open Project</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 2 }}>.flow or .json file</div>
                </div>
              </button>
            </div>

            {/* ─── Two Column Layout ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* ─── Left Column: Recent Projects ─── */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  marginBottom: 14,
                }}>
                  <Clock size={13} color="var(--color-text-dim)" />
                  <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Recent Projects</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recentProjects.length ? recentProjects.slice(0, 5).map(project => (
                    <button
                      key={project.name}
                      onClick={() => saveProject(project.name, project.platform)}
                      style={{
                        width: '100%',
                        padding: '11px 13px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 7,
                        background: 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'all .15s ease',
                        fontFamily: 'var(--font-sans)',
                        textAlign: 'left',
                        color: 'inherit',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'
                        e.currentTarget.style.background = 'rgba(59,130,246,0.06)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <FileText size={15} color="var(--color-accent-blue)" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--color-text-normal)', fontSize: 12, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', marginTop: 2, fontSize: 10 }}>{project.platform.replace('-', ' ')} · {relativeTime(project.createdAt)}</div>
                      </div>
                      <ChevronRight size={13} color="var(--color-text-dim)" style={{ flexShrink: 0, opacity: 0.5 }} />
                    </button>
                  )) : (
                    <div style={{
                      padding: '28px 16px',
                      border: '1px dashed rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 12,
                      textAlign: 'center',
                    }}>
                      No recent projects
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Right Column: Templates ─── */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Cpu size={13} color="var(--color-text-dim)" />
                    <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Templates</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {templates.map(template => {
                    const Icon = template.icon
                    return (
                      <button
                        key={template.name}
                        onClick={() => saveProject(template.name, 'arduino-uno')}
                        style={{
                          padding: '14px 13px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 7,
                          background: 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          transition: 'all .15s ease',
                          textAlign: 'left',
                          fontFamily: 'var(--font-sans)',
                          color: 'inherit',
                          display: 'flex', flexDirection: 'column', gap: 0,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                        }}
                      >
                        <Icon size={17} color={template.color} />
                        <div style={{ color: 'var(--color-text-normal)', fontSize: 11.5, fontWeight: 680, marginTop: 10 }}>{template.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>{template.detail}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ─── Target Board Strip ─── */}
            <div style={{ marginTop: 28 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 12,
              }}>
                <Cpu size={13} color="var(--color-text-dim)" />
                <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Target Hardware</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {boards.map(board => (
                  <button
                    key={board.id}
                    onClick={() => board.available && setPlatform(board.id)}
                    style={{
                      flex: '0 0 auto',
                      minWidth: 140,
                      padding: '12px 14px',
                      border: platform === board.id ? '1.5px solid var(--color-accent-blue)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      background: platform === board.id ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: board.available ? 'pointer' : 'not-allowed',
                      opacity: board.available ? 1 : 0.4,
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'all .15s ease',
                      fontFamily: 'var(--font-sans)',
                      color: 'inherit',
                      textAlign: 'left',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (board.available) {
                        e.currentTarget.style.borderColor = platform === board.id ? 'var(--color-accent-blue)' : 'rgba(255,255,255,0.18)'
                        e.currentTarget.style.background = platform === board.id ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = platform === board.id ? 'var(--color-accent-blue)' : 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.background = platform === board.id ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    {platform === board.id && (
                      <span style={{
                        position: 'absolute', top: 7, right: 7,
                        width: 16, height: 16, borderRadius: 99,
                        background: 'var(--color-accent-blue)',
                        display: 'grid', placeItems: 'center', color: '#fff',
                      }}>
                        <Check size={10} />
                      </span>
                    )}
                    <img src={board.image} alt="" style={{ height: 32, objectFit: 'contain', flexShrink: 0 }} />
                    <div>
                      <div style={{ color: 'var(--color-text-bright)', fontSize: 11.5, fontWeight: 700 }}>{board.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9.5, marginTop: 2 }}>{board.info}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ─── Footer ─── */}
        <footer style={{
          height: 32, flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(13,16,23,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          fontSize: 10, color: 'rgba(255,255,255,0.25)',
        }}>
          <span>Flow IDE — Embedded Visual Development</span>
          <span>© 2026 MaxonXOXO</span>
        </footer>

      </div>

      {/* ─── Project Naming Modal ─── */}
      {showNamingModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 30,
          display: 'grid', placeItems: 'center',
          background: 'rgba(0,0,0,.7)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 420,
            background: 'rgba(18,22,31,0.97)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            boxShadow: '0 32px 80px rgba(0,0,0,.7)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ color: 'var(--color-text-bright)', fontSize: 14, fontWeight: 720 }}>New Project</div>
                <div style={{ color: 'var(--color-text-dim)', fontSize: 10.5, marginTop: 3 }}>Create an embedded visual flow</div>
              </div>
              <button
                onClick={() => setShowNamingModal(false)}
                style={{
                  border: 'none', background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-text-dim)', padding: 5, borderRadius: 6,
                  cursor: 'pointer', display: 'grid', placeItems: 'center',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <label style={{
                display: 'block', color: 'var(--color-text-dim)',
                fontSize: 10, fontWeight: 700, letterSpacing: '.06em', marginBottom: 7,
              }}>
                PROJECT NAME
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  autoFocus
                  value={projectName}
                  onChange={event => setProjectName(event.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                  onKeyDown={event => event.key === 'Enter' && saveProject()}
                  style={{
                    width: '100%',
                    padding: '10px 34px 10px 11px',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--color-text-bright)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    outline: 'none',
                    font: '12px var(--font-mono)',
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
                <Terminal size={14} color="var(--color-text-dim)" style={{ position: 'absolute', right: 10, top: 11 }} />
              </div>

              <div style={{ marginTop: 16, color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em' }}>TARGET BOARD</div>
              <div style={{
                marginTop: 7, padding: '9px 11px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: 'var(--color-accent-blue)',
                background: 'rgba(255,255,255,0.03)',
                font: '600 11px var(--font-mono)',
              }}>
                {boards.find(b => b.id === platform)?.name || 'Arduino Uno'}
              </div>

              <button
                disabled={!projectName.trim()}
                onClick={() => saveProject()}
                style={{
                  width: '100%',
                  padding: '11px',
                  marginTop: 22,
                  border: '1px solid var(--color-accent-blue)',
                  borderRadius: 7,
                  background: projectName.trim() ? 'var(--color-accent-blue)' : 'rgba(255,255,255,0.04)',
                  color: projectName.trim() ? '#fff' : 'var(--color-text-dim)',
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center',
                  cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all .15s',
                }}
              >
                <Plus size={15} /> Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      <PreferencesModal />
    </main>
  )
}
