'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlowStore } from '@/store/userFlowStore'
import {
  ArrowLeft, Check, ChevronRight, Clock, Cpu, FileText, FolderOpen,
  Plus, Settings, Terminal, X,
} from 'lucide-react'

import { importProject, extractStoreState } from '@/lib/project/projectManager'
import { useSettingsStore } from '@/store/useSettingsStore'
import PreferencesModal from '@/components/settings/PreferencesModal'
import GradientText from '@/components/ui/GradientText'

interface SavedProject { name: string; platform: string; createdAt: number }

type ViewMode = 'welcome' | 'newProject'

export default function SplashScreen() {
  const router = useRouter()
  const { loadProjectState } = useFlowStore()
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [platform, setPlatform] = useState('arduino-uno')
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([])
  const [currentView, setCurrentView] = useState<ViewMode>('welcome')
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
    setCurrentView('welcome')
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

  const boards = [
    { id: 'arduino-uno', name: 'Arduino Uno', info: 'ATmega328P · 16 MHz', available: true, image: '/mcu/arduino_uno.png' },
    { id: 'esp32', name: 'ESP32', info: 'Xtensa LX6 · Wi-Fi · BLE · Dual core', available: false, image: '/mcu/esp32.png' },
    { id: 'esp8266', name: 'NodeMCU', info: 'ESP8266 · Wi-Fi · 17 GPIO', available: false, image: '/mcu/esp8266.png' },
  ]

  const openNewProject = () => {
    const names = ['smart_controller', 'sensor_station', 'untitled_flow', 'device_monitor']
    setProjectName(names[Math.floor(Math.random() * names.length)])
    setProjectDescription('')
    setCurrentView('newProject')
  }

  // ─── Shared background layers (bird, grid, glow) ───
  const backgroundLayers = (
    <>
      {/* ASCII Bird — decorative, top-right, no overlay */}
      {asciiText && (
        <div style={{
          position: 'absolute',
          right: '0%',
          top: '4%',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: mounted ? 0.13 : 0,
          transition: 'opacity 2s ease',
          overflow: 'hidden',
          // No filter/drop-shadow to avoid darkening
        }}>
          <GradientText
            colors={["#1e3a5f", "#3b82f6", "#6366f1", "#3b82f6", "#1e3a5f"]}
            animationSpeed={8}
            showBorder={false}
            direction="horizontal"
          >
            <pre style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '9.5px',
              lineHeight: '1.04',
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

      {/* Subtle dot-grid */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '55%', height: '55%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.05), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
    </>
  )

  // ─── Top Bar (shared) ───
  const topBar = (
    <header style={{
      height: 48, flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(13,16,23,0.8)',
      backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {currentView === 'newProject' && (
          <button
            onClick={() => setCurrentView('welcome')}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.06)',
              color: 'var(--color-text-dim)', cursor: 'pointer',
              padding: '4px 6px', borderRadius: 5,
              display: 'grid', placeItems: 'center',
              marginRight: 6,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text-normal)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--color-text-dim)' }}
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <img src="/flowide.png" alt="Flow-IDE" style={{ width: 22, height: 22, objectFit: 'contain' }} />
        <span style={{ color: 'var(--color-text-bright)', fontSize: 12.5, fontWeight: 750, letterSpacing: '.5px' }}>FLOW IDE</span>
        <span style={{ color: 'var(--color-text-dim)', fontSize: 9.5, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>v1.5.0-Alpha</span>
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
  )

  // ─── Footer (shared) ───
  const footer = (
    <footer style={{
      height: 32, flexShrink: 0,
      borderTop: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(13,16,23,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      fontSize: 10, color: 'rgba(255,255,255,0.25)',
      zIndex: 10,
    }}>
      <span>Flow IDE — Embedded Visual Development</span>
      <span>© 2026 MaxonXOXO</span>
    </footer>
  )

  // ═════════════════════════════════════
  //  WELCOME VIEW
  // ═════════════════════════════════════
  const welcomeView = (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ width: '100%', maxWidth: 880, padding: '48px 40px 40px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            margin: 0, color: 'var(--color-text-bright)',
            fontSize: 28, fontWeight: 800, letterSpacing: '-.4px', lineHeight: 1.2,
          }}>
            Welcome to Flow IDE
          </h1>
          <p style={{
            margin: '8px 0 0', color: 'rgba(255,255,255,0.45)',
            fontSize: 13, lineHeight: 1.5, maxWidth: 440,
          }}>
            Visual embedded development  design, simulate, and deploy hardware flows from one workspace.
          </p>
        </div>

        {/* Primary Actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
          <button
            onClick={openNewProject}
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

        {/* Recent Projects */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            marginBottom: 14,
          }}>
            <Clock size={13} color="var(--color-text-dim)" />
            <span style={{ color: 'var(--color-text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>Recent Projects</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 520 }}>
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

      </div>
    </div>
  )

  // ═════════════════════════════════════
  //  NEW PROJECT VIEW (in-page, Cubase style)
  // ═════════════════════════════════════
  const newProjectView = (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ width: '100%', maxWidth: 740, padding: '40px 40px 40px' }}>

        {/* Page Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            margin: 0, color: 'var(--color-text-bright)',
            fontSize: 22, fontWeight: 780, letterSpacing: '-.3px',
          }}>
            New Project
          </h1>
          <p style={{
            margin: '6px 0 0', color: 'rgba(255,255,255,0.4)',
            fontSize: 12.5, lineHeight: 1.5,
          }}>
            Configure your embedded project before entering the workspace.
          </p>
        </div>

        {/* ─── Project Details Card ─── */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          background: 'rgba(15,18,26,0.7)',
          backdropFilter: 'blur(12px)',
          padding: '24px',
          marginBottom: 20,
        }}>
          <div style={{ color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', marginBottom: 8 }}>PROJECT NAME</div>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              autoFocus
              value={projectName}
              onChange={e => setProjectName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
              onKeyDown={e => e.key === 'Enter' && projectName.trim() && saveProject()}
              placeholder="my_project"
              style={{
                width: '100%',
                padding: '11px 36px 11px 12px',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-bright)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 7,
                outline: 'none',
                font: '12.5px var(--font-mono)',
                transition: 'border-color .15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
            <Terminal size={14} color="var(--color-text-dim)" style={{ position: 'absolute', right: 12, top: 12 }} />
          </div>

          <div style={{ color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', marginBottom: 8 }}>DESCRIPTION <span style={{ fontWeight: 500, opacity: 0.6 }}>(optional)</span></div>
          <textarea
            value={projectDescription}
            onChange={e => setProjectDescription(e.target.value)}
            placeholder="Brief project description..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--color-text-bright)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7,
              outline: 'none',
              font: '12px var(--font-sans)',
              resize: 'vertical',
              minHeight: 60,
              maxHeight: 120,
              lineHeight: 1.5,
              transition: 'border-color .15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* ─── Target Hardware Card ─── */}
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          background: 'rgba(15,18,26,0.7)',
          backdropFilter: 'blur(12px)',
          padding: '24px',
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Cpu size={15} color="var(--color-accent-blue)" />
            <span style={{ color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em' }}>TARGET HARDWARE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {boards.map(board => (
              <button
                key={board.id}
                onClick={() => board.available && setPlatform(board.id)}
                style={{
                  padding: '18px 16px',
                  border: platform === board.id ? '1.5px solid var(--color-accent-blue)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  background: platform === board.id ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                  cursor: board.available ? 'pointer' : 'not-allowed',
                  opacity: board.available ? 1 : 0.4,
                  transition: 'all .15s ease',
                  fontFamily: 'var(--font-sans)',
                  color: 'inherit',
                  textAlign: 'center',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0,
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
                    position: 'absolute', top: 8, right: 8,
                    width: 18, height: 18, borderRadius: 99,
                    background: 'var(--color-accent-blue)',
                    display: 'grid', placeItems: 'center', color: '#fff',
                  }}>
                    <Check size={11} />
                  </span>
                )}
                <img src={board.image} alt="" style={{ height: 52, objectFit: 'contain', marginBottom: 12 }} />
                <div style={{ color: 'var(--color-text-bright)', fontSize: 12.5, fontWeight: 720 }}>{board.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4, lineHeight: 1.4 }}>{board.info}</div>
                {!board.available && (
                  <span style={{
                    marginTop: 8, fontSize: 9, fontWeight: 650,
                    color: 'rgba(255,255,255,0.35)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 8px', borderRadius: 4,
                  }}>
                    Coming Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Create Button ─── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={() => setCurrentView('welcome')}
            style={{
              padding: '10px 20px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--color-text-dim)',
              fontSize: 12, fontWeight: 650,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.color = 'var(--color-text-normal)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'var(--color-text-dim)'
            }}
          >
            Cancel
          </button>
          <button
            disabled={!projectName.trim()}
            onClick={() => saveProject()}
            style={{
              padding: '10px 24px',
              border: '1px solid var(--color-accent-blue)',
              borderRadius: 7,
              background: projectName.trim() ? 'var(--color-accent-blue)' : 'rgba(255,255,255,0.04)',
              color: projectName.trim() ? '#fff' : 'var(--color-text-dim)',
              fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: projectName.trim() ? 'pointer' : 'not-allowed',
              transition: 'all .15s',
              boxShadow: projectName.trim() ? '0 4px 16px rgba(59,130,246,0.3)' : 'none',
            }}
            onMouseEnter={e => {
              if (projectName.trim()) e.currentTarget.style.boxShadow = '0 6px 24px rgba(59,130,246,0.4)'
            }}
            onMouseLeave={e => {
              if (projectName.trim()) e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)'
            }}
          >
            <Plus size={15} /> Create Project
          </button>
        </div>

      </div>
    </div>
  )

  return (
    <main style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#090a0f',
      color: 'var(--color-text-normal)', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none', position: 'relative',
    }}>
      <input ref={fileInputRef} type="file" accept=".flow,.json" onChange={handleFileChange} style={{ display: 'none' }} />

      {backgroundLayers}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {topBar}
        {currentView === 'welcome' ? welcomeView : newProjectView}
        {footer}
      </div>

      <PreferencesModal />
    </main>
  )
}
