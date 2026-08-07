'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlowStore } from '@/store/userFlowStore'
import {
  Bluetooth, BookOpen, Check, ChevronRight, Clock, Cpu, FileText, FolderOpen,
  LayoutGrid, Moon, Plus, Settings, Sun, Terminal, Thermometer, Wifi, X,
} from 'lucide-react'

import { importProject, extractStoreState } from '@/lib/project/projectManager'
import { useSettingsStore } from '@/store/useSettingsStore'
import PreferencesModal from '@/components/settings/PreferencesModal'
import GradientText from '@/components/ui/GradientText'

interface SavedProject { name: string; platform: string; createdAt: number }

const buttonBase = {
  border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer',
  fontFamily: 'var(--font-sans)', transition: 'background .15s, border-color .15s, color .15s',
} as const

export default function SplashScreen() {
  const router = useRouter()
  const { loadProjectState } = useFlowStore()
  const [projectName, setProjectName] = useState('')
  const [platform, setPlatform] = useState('arduino-uno')
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([])
  const [showNamingModal, setShowNamingModal] = useState(false)
  const [asciiText, setAsciiText] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fp_project_history')
      setRecentProjects(saved ? JSON.parse(saved) : [])
    } catch { setRecentProjects([]) }
    const names = ['smart_controller', 'sensor_station', 'untitled_flow', 'device_monitor']
    setProjectName(names[Math.floor(Math.random() * names.length)])

    // Fetch ascii-art.html and replace background asterisks with spaces so ONLY the bird silhouette exists
    fetch('/ascii-art.html')
      .then((res) => res.text())
      .then((html) => {
        const bodyContent = html.includes('<body>') ? html.split('<body>')[1].split('</body>')[0] : html
        const text = bodyContent
          .replace(/<span style="color:(#[0-9a-fA-F]{6})">([^<]+)<\/span>/g, (m, hex, txt) => {
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            // Replace background asterisks with space
            if (g < 10 && b < 32 && r < 10) {
              return ' '
            }
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

  const hover = (event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>, on: boolean) => {
    event.currentTarget.style.borderColor = on ? 'var(--color-border-focus)' : 'var(--color-border)'
    event.currentTarget.style.background = on ? 'rgba(76, 141, 255, .08)' : 'rgba(21, 24, 32, 0.65)'
  }

  const templates = [
    { name: 'light_sensor', label: 'Light sensor', detail: 'LDR · analog input', icon: Sun, color: 'var(--color-signal)' },
    { name: 'temp_monitor', label: 'Temperature monitor', detail: 'DHT22 · serial output', icon: Thermometer, color: 'var(--color-ground)' },
    { name: 'wifi_ping', label: 'Connection check', detail: 'ESP pattern · Wi-Fi', icon: Wifi, color: 'var(--color-power)' },
    { name: 'ble_control', label: 'Bluetooth control', detail: 'HC-05 · digital I/O', icon: Bluetooth, color: 'var(--color-analog)' },
  ]

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#090a0f', color: 'var(--color-text-normal)', fontFamily: 'var(--font-sans)', display: 'flex', userSelect: 'none', position: 'relative' }}>
      <input ref={fileInputRef} type="file" accept=".flow,.json" onChange={handleFileChange} style={{ display: 'none' }} />

      {/* Sidebar */}
      <aside style={{ width: 232, flexShrink: 0, background: 'rgba(13, 16, 23, 0.95)', backdropFilter: 'blur(12px)', borderRight: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ height: 52, padding: '0 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src="/flowide.png" alt="Flow-IDE Logo" style={{ width: 26, height: 26, objectFit: 'contain' }} />
          <span style={{ color: 'var(--color-text-bright)', fontSize: 13, fontWeight: 750, letterSpacing: '.4px' }}>FLOW IDE</span>
          <span style={{ marginLeft: 'auto', color: 'var(--color-text-dim)', fontSize: 10, background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: 4 }}>v1.5.0</span>
        </div>
        <nav style={{ padding: '14px 10px' }}>
          <div style={{ padding: '6px 9px 9px', color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>START</div>
          <div style={{ padding: '8px 10px', borderRadius: 5, background: 'rgba(76,141,255,.14)', color: 'var(--color-accent-blue)', fontSize: 12, fontWeight: 650, display: 'flex', gap: 9, alignItems: 'center' }}><LayoutGrid size={15} /> Welcome</div>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonBase, width: '100%', padding: '8px 10px', marginTop: 3, border: 'none', background: 'transparent', color: 'var(--color-text-normal)', display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, textAlign: 'left' }}><Clock size={15} /> Recent projects</button>
          <button onClick={() => alert('Template library is coming soon.')} style={{ ...buttonBase, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', color: 'var(--color-text-normal)', display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, textAlign: 'left' }}><BookOpen size={15} /> Templates</button>
        </nav>
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {[{ label: 'Documentation', icon: BookOpen }, { label: 'Settings', icon: Settings }].map(item => { 
            const Icon = item.icon; 
            return (
              <button 
                key={item.label} 
                onClick={() => item.label === 'Settings' ? useSettingsStore.getState().openPreferences() : window.open('https://github.com/MaxonXOXO/Flow-programmer', '_blank')} 
                style={{ ...buttonBase, width: '100%', padding: '7px 9px', border: 'none', background: 'transparent', color: 'var(--color-text-dim)', display: 'flex', gap: 9, alignItems: 'center', fontSize: 11, textAlign: 'left' }}
              >
                <Icon size={14} />{item.label}
              </button>
            ) 
          })}
          <div style={{ color: 'var(--color-text-dim)', fontSize: 10, padding: '11px 9px 2px', display: 'flex', alignItems: 'center', gap: 7 }}><Moon size={13} /> Dark theme</div>
        </div>
      </aside>

      {/* Main Container */}
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Animated ASCII Bird Background - Image 1 Style (ONLY Bird characters glowing, spaces around it) */}
        {asciiText && (
          <div
            style={{
              position: 'absolute',
              right: '2%',
              top: '52%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 1,
              opacity: 0.95,
              maxHeight: '94vh',
              overflow: 'hidden',
              filter: 'drop-shadow(0 0 45px rgba(0, 240, 255, 0.35))',
            }}
          >
            <GradientText
              colors={["#00f0ff", "#0088ff", "#a855f7", "#ff007f", "#00f0ff"]}
              animationSpeed={4}
              showBorder={false}
              direction="horizontal"
            >
              <pre
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: '8.5px',
                  lineHeight: '1.02',
                  whiteSpace: 'pre',
                  margin: 0,
                  userSelect: 'none',
                  textAlign: 'left',
                  letterSpacing: '-0.5px',
                }}
              >
                {asciiText}
              </pre>
            </GradientText>
          </div>
        )}

        {/* Top Header */}
        <header style={{ height: 52, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(15, 18, 25, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', zIndex: 5 }}>
          <div style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>Welcome <span style={{ margin: '0 7px' }}>/</span> Get started</div>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonBase, padding: '7px 11px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--color-text-bright)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, fontWeight: 600 }}><FolderOpen size={15} color="var(--color-accent-blue)" /> Open project</button>
        </header>

        {/* Workspace Body Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px clamp(20px, 4vw, 64px)', position: 'relative', zIndex: 5 }}>
          <div style={{ maxWidth: 1180, margin: '0 0 0 10px' }}>
            
            {/* Title Banner */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '1px', marginBottom: 8, fontWeight: 700 }}>FLOW IDE / EMBEDDED VISUAL DEVELOPMENT</div>
              <h1 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 32, letterSpacing: '-.6px', fontWeight: 850 }}>Welcome back.</h1>
              <p style={{ margin: '8px 0 0', color: 'rgba(255, 255, 255, 0.65)', fontSize: 13.5 }}>Create, connect, and deploy your embedded project from one workspace.</p>
            </div>

            {/* Top Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(440px, 580px)', gap: 16, marginBottom: 24 }}>
              
              {/* Start New Project Card */}
              <div style={{ minHeight: 230, border: '1px solid rgba(95, 163, 255, 0.25)', borderRadius: 10, background: 'linear-gradient(140deg, rgba(59, 130, 246, 0.18), rgba(15, 18, 26, 0.85) 60%)', backdropFilter: 'blur(16px)', padding: 22, display: 'flex', flexDirection: 'column', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59, 130, 246, 0.25)', color: 'var(--color-accent-blue)', display: 'grid', placeItems: 'center' }}><Plus size={20} /></div>
                <h2 style={{ color: 'var(--color-text-bright)', fontSize: 16, fontWeight: 750, margin: '18px 0 6px' }}>Start a new project</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>Initialize a visual flow and choose your hardware board.</p>
                <button onClick={() => setShowNamingModal(true)} style={{ ...buttonBase, marginTop: 'auto', padding: '10px 14px', border: '1px solid var(--color-accent)', background: 'var(--color-accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)' }}>New project <ChevronRight size={15} /></button>
              </div>

              {/* Target Hardware Selector Card */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, background: 'rgba(15, 18, 26, 0.82)', backdropFilter: 'blur(16px)', padding: 22, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Cpu size={17} color="var(--color-accent-blue)" /><h2 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 15, fontWeight: 750 }}>Target hardware</h2></div>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, margin: '6px 0 16px' }}>Select a board before creating your project.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[{ id: 'arduino-uno', name: 'Arduino Uno', info: 'ATmega328P · 16 MHz', available: true, image: '/mcu/arduino_uno.png' }, { id: 'esp32', name: 'ESP32', info: 'Wi-Fi · BLE · Dual core', available: false, image: '/mcu/esp32.png' }, { id: 'esp8266', name: 'NodeMCU', info: 'Wi-Fi · 17 GPIO', available: false, image: '/mcu/esp8266.png' }].map(board => (
                    <div key={board.id} onClick={() => board.available && setPlatform(board.id)} style={{ minHeight: 130, opacity: board.available ? 1 : .42, cursor: board.available ? 'pointer' : 'not-allowed', border: platform === board.id ? '1.5px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, background: 'rgba(255, 255, 255, 0.04)', padding: 11, position: 'relative', transition: 'all 0.15s ease' }}>
                      {platform === board.id && <span style={{ position: 'absolute', top: 8, right: 8, width: 17, height: 17, borderRadius: 99, background: 'var(--color-accent)', display: 'grid', placeItems: 'center', color: '#fff' }}><Check size={11} /></span>}
                      <img src={board.image} alt="" style={{ display: 'block', height: 48, maxWidth: '100%', margin: '0 auto 8px', objectFit: 'contain' }} />
                      <div style={{ color: 'var(--color-text-bright)', fontSize: 11, fontWeight: 700 }}>{board.name}</div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 9, marginTop: 4 }}>{board.info}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(440px, 580px)', gap: 16 }}>
              {/* Recent Projects Card */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, background: 'rgba(15, 18, 26, 0.82)', backdropFilter: 'blur(16px)', padding: 20, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h2 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 14, fontWeight: 750 }}>Recent projects</h2><Clock size={15} color="var(--color-text-dim)" /></div>
                {recentProjects.length ? recentProjects.slice(0, 4).map(project => <div key={project.name} onClick={() => saveProject(project.name, project.platform)} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)} style={{ marginTop: 7, padding: '10px 11px', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, background: 'rgba(255, 255, 255, 0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, transition: 'all 0.15s ease' }}><FileText size={15} color="var(--color-accent-blue)" /><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: 'var(--color-text-normal)', fontSize: 11, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div><div style={{ color: 'rgba(255, 255, 255, 0.45)', marginTop: 2, fontSize: 9 }}>{project.platform.replace('-', ' ')} · {relativeTime(project.createdAt)}</div></div><ChevronRight size={14} color="var(--color-text-dim)" /></div>) : <div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 12, padding: '22px 0' }}>No projects opened yet.</div>}
              </div>

              {/* Prebuilt Templates Card */}
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, background: 'rgba(15, 18, 26, 0.82)', backdropFilter: 'blur(16px)', padding: 20, boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><h2 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 14, fontWeight: 750 }}>Start from a template</h2><button onClick={() => alert('Template library is coming soon.')} style={{ ...buttonBase, border: 'none', background: 'transparent', color: 'var(--color-accent-blue)', fontSize: 11, fontWeight: 600 }}>View all</button></div>
                <p style={{ margin: '0 0 14px', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>Prebuilt flows for common hardware patterns.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>{templates.map(template => { const Icon = template.icon; return <div key={template.name} onClick={() => saveProject(template.name, 'arduino-uno')} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)} style={{ padding: 12, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, background: 'rgba(255, 255, 255, 0.03)', cursor: 'pointer', transition: 'all 0.15s ease' }}><Icon size={17} color={template.color} /><div style={{ color: 'var(--color-text-normal)', fontSize: 11, fontWeight: 700, marginTop: 10 }}>{template.label}</div><div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 9, marginTop: 4 }}>{template.detail}</div></div> })}</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Project Naming Modal */}
      {showNamingModal && <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)' }}>
        <div style={{ width: 420, background: 'rgba(18, 22, 31, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.8)' }}>
          <div style={{ padding: '14px 17px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><div style={{ color: 'var(--color-text-bright)', fontSize: 13, fontWeight: 700 }}>New project</div><div style={{ color: 'var(--color-text-dim)', fontSize: 10, marginTop: 2 }}>Create an embedded visual flow</div></div><button onClick={() => setShowNamingModal(false)} style={{ ...buttonBase, border: 'none', background: 'transparent', color: 'var(--color-text-dim)', padding: 4 }}><X size={17} /></button></div>
          <div style={{ padding: 18 }}><label style={{ display: 'block', color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', marginBottom: 7 }}>PROJECT NAME</label><div style={{ position: 'relative' }}><input autoFocus value={projectName} onChange={event => setProjectName(event.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))} onKeyDown={event => event.key === 'Enter' && saveProject()} style={{ width: '100%', padding: '10px 34px 10px 11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-bright)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 5, outline: 'none', font: '12px var(--font-mono)' }} /><Terminal size={15} color="var(--color-text-dim)" style={{ position: 'absolute', right: 10, top: 10 }} /></div><div style={{ marginTop: 15, color: 'var(--color-text-dim)', fontSize: 10 }}>TARGET BOARD</div><div style={{ marginTop: 6, padding: '9px 10px', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: 5, color: 'var(--color-accent-blue)', background: 'rgba(255, 255, 255, 0.05)', font: '600 11px var(--font-mono)' }}>Arduino Uno</div><button disabled={!projectName.trim()} onClick={() => saveProject()} style={{ ...buttonBase, width: '100%', padding: '10px', marginTop: 20, border: '1px solid var(--color-accent)', background: projectName.trim() ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.05)', color: projectName.trim() ? '#fff' : 'var(--color-text-dim)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 7, alignItems: 'center', cursor: projectName.trim() ? 'pointer' : 'not-allowed' }}><Plus size={15} /> Create project</button></div>
        </div>
      </div>}

      <PreferencesModal />
    </main>
  )
}
