'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlowStore } from '@/store/userFlowStore'
import {
  Bluetooth, BookOpen, Check, ChevronRight, Clock, Cpu, FileText, FolderOpen,
  LayoutGrid, Moon, Plus, Settings, Sun, Terminal, Thermometer, Wifi, X,
} from 'lucide-react'

import { importProject, extractStoreState } from '@/lib/project/projectManager'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fp_project_history')
      setRecentProjects(saved ? JSON.parse(saved) : [])
    } catch { setRecentProjects([]) }
    const names = ['smart_controller', 'sensor_station', 'untitled_flow', 'device_monitor']
    setProjectName(names[Math.floor(Math.random() * names.length)])
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
    event.currentTarget.style.background = on ? 'rgba(76, 141, 255, .055)' : 'var(--color-bg-panel)'
  }

  const templates = [
    { name: 'light_sensor', label: 'Light sensor', detail: 'LDR · analog input', icon: Sun, color: 'var(--color-signal)' },
    { name: 'temp_monitor', label: 'Temperature monitor', detail: 'DHT22 · serial output', icon: Thermometer, color: 'var(--color-ground)' },
    { name: 'wifi_ping', label: 'Connection check', detail: 'ESP pattern · Wi-Fi', icon: Wifi, color: 'var(--color-power)' },
    { name: 'ble_control', label: 'Bluetooth control', detail: 'HC-05 · digital I/O', icon: Bluetooth, color: 'var(--color-analog)' },
  ]

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--color-bg-base)', color: 'var(--color-text-normal)', fontFamily: 'var(--font-sans)', display: 'flex', userSelect: 'none' }}>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />

      <aside style={{ width: 232, flexShrink: 0, background: 'var(--color-bg-panel)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 52, padding: '0 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 25, height: 25, borderRadius: 5, background: 'var(--color-accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, boxShadow: '0 0 18px rgba(59,130,246,.28)' }}>F</div>
          <span style={{ color: 'var(--color-text-bright)', fontSize: 13, fontWeight: 750, letterSpacing: '.4px' }}>FLOW IDE</span>
          <span style={{ marginLeft: 'auto', color: 'var(--color-text-dim)', fontSize: 10 }}>1.3.0</span>
        </div>
        <nav style={{ padding: '14px 10px' }}>
          <div style={{ padding: '6px 9px 9px', color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>START</div>
          <div style={{ padding: '8px 10px', borderRadius: 5, background: 'rgba(76,141,255,.12)', color: 'var(--color-accent-blue)', fontSize: 12, fontWeight: 650, display: 'flex', gap: 9, alignItems: 'center' }}><LayoutGrid size={15} /> Welcome</div>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonBase, width: '100%', padding: '8px 10px', marginTop: 3, border: 'none', background: 'transparent', color: 'var(--color-text-normal)', display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, textAlign: 'left' }}><Clock size={15} /> Recent projects</button>
          <button onClick={() => alert('Template library is coming soon.')} style={{ ...buttonBase, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', color: 'var(--color-text-normal)', display: 'flex', gap: 9, alignItems: 'center', fontSize: 12, textAlign: 'left' }}><BookOpen size={15} /> Templates</button>
        </nav>
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--color-border)' }}>
          {[{ label: 'Documentation', icon: BookOpen }, { label: 'Settings', icon: Settings }].map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => alert(`${item.label} is coming soon.`)} style={{ ...buttonBase, width: '100%', padding: '7px 9px', border: 'none', background: 'transparent', color: 'var(--color-text-dim)', display: 'flex', gap: 9, alignItems: 'center', fontSize: 11, textAlign: 'left' }}><Icon size={14} />{item.label}</button> })}
          <div style={{ color: 'var(--color-text-dim)', fontSize: 10, padding: '11px 9px 2px', display: 'flex', alignItems: 'center', gap: 7 }}><Moon size={13} /> Dark theme</div>
        </div>
      </aside>

      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: 52, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-header)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px' }}>
          <div style={{ color: 'var(--color-text-dim)', fontSize: 12 }}>Welcome <span style={{ margin: '0 7px' }}>/</span> Get started</div>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonBase, padding: '7px 11px', background: 'var(--color-bg-input)', color: 'var(--color-text-bright)', display: 'flex', gap: 7, alignItems: 'center', fontSize: 12, fontWeight: 600 }}><FolderOpen size={15} color="var(--color-accent-blue)" /> Open project</button>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: '48px clamp(28px, 6vw, 96px)' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ marginBottom: 34 }}>
              <div style={{ color: 'var(--color-accent-blue)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 10 }}>FLOW IDE / EMBEDDED VISUAL DEVELOPMENT</div>
              <h1 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 30, letterSpacing: '-.6px' }}>Welcome back.</h1>
              <p style={{ margin: '9px 0 0', color: 'var(--color-text-dim)', fontSize: 14 }}>Create, connect, and deploy your embedded project from one workspace.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, .8fr) minmax(440px, 1.5fr)', gap: 16, marginBottom: 26 }}>
              <div style={{ minHeight: 230, border: '1px solid var(--color-border)', borderRadius: 8, background: 'linear-gradient(140deg, rgba(59,130,246,.13), var(--color-bg-panel) 52%)', padding: 22, display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(59,130,246,.16)', color: 'var(--color-accent-blue)', display: 'grid', placeItems: 'center' }}><Plus size={19} /></div>
                <h2 style={{ color: 'var(--color-text-bright)', fontSize: 16, margin: '20px 0 7px' }}>Start a new project</h2>
                <p style={{ color: 'var(--color-text-dim)', fontSize: 12, lineHeight: 1.55, margin: 0 }}>Initialize a visual flow and choose your hardware board.</p>
                <button onClick={() => setShowNamingModal(true)} style={{ ...buttonBase, marginTop: 'auto', padding: '10px 12px', border: '1px solid var(--color-accent)', background: 'var(--color-accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>New project <ChevronRight size={15} /></button>
              </div>

              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-panel)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Cpu size={17} color="var(--color-accent-blue)" /><h2 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 15 }}>Target hardware</h2></div>
                <p style={{ color: 'var(--color-text-dim)', fontSize: 12, margin: '8px 0 18px' }}>Select a board before creating your project.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[{ id: 'arduino-uno', name: 'Arduino Uno', info: 'ATmega328P · 16 MHz', available: true, image: '/mcu/arduino_uno.png' }, { id: 'esp32', name: 'ESP32', info: 'Wi-Fi · BLE · Dual core', available: false, image: '/mcu/esp32.png' }, { id: 'esp8266', name: 'NodeMCU', info: 'Wi-Fi · 17 GPIO', available: false, image: '/mcu/esp8266.png' }].map(board => (
                    <div key={board.id} onClick={() => board.available && setPlatform(board.id)} style={{ minHeight: 135, opacity: board.available ? 1 : .42, cursor: board.available ? 'pointer' : 'not-allowed', border: platform === board.id ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg-input)', padding: 11, position: 'relative' }}>
                      {platform === board.id && <span style={{ position: 'absolute', top: 8, right: 8, width: 17, height: 17, borderRadius: 99, background: 'var(--color-accent)', display: 'grid', placeItems: 'center', color: '#fff' }}><Check size={11} /></span>}
                      <img src={board.image} alt="" style={{ display: 'block', height: 51, maxWidth: '100%', margin: '0 auto 9px', objectFit: 'contain' }} />
                      <div style={{ color: 'var(--color-text-bright)', fontSize: 11, fontWeight: 700 }}>{board.name}</div><div style={{ color: 'var(--color-text-dim)', fontSize: 9, marginTop: 4 }}>{board.info}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(440px, 1.45fr)', gap: 16 }}>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-panel)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h2 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 14 }}>Recent projects</h2><Clock size={15} color="var(--color-text-dim)" /></div>
                {recentProjects.length ? recentProjects.slice(0, 4).map(project => <div key={project.name} onClick={() => saveProject(project.name, project.platform)} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)} style={{ marginTop: 7, padding: '10px 9px', border: '1px solid var(--color-border)', borderRadius: 5, background: 'var(--color-bg-panel)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}><FileText size={15} color="var(--color-accent-blue)" /><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: 'var(--color-text-normal)', fontSize: 11, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div><div style={{ color: 'var(--color-text-dim)', marginTop: 2, fontSize: 9 }}>{project.platform.replace('-', ' ')} · {relativeTime(project.createdAt)}</div></div><ChevronRight size={14} color="var(--color-text-dim)" /></div>) : <div style={{ color: 'var(--color-text-dim)', fontSize: 12, padding: '22px 0' }}>No projects opened yet.</div>}
              </div>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-panel)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><h2 style={{ margin: 0, color: 'var(--color-text-bright)', fontSize: 14 }}>Start from a template</h2><button onClick={() => alert('Template library is coming soon.')} style={{ ...buttonBase, border: 'none', background: 'transparent', color: 'var(--color-accent-blue)', fontSize: 11 }}>View all</button></div>
                <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--color-text-dim)' }}>Prebuilt flows for common hardware patterns.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>{templates.map(template => { const Icon = template.icon; return <div key={template.name} onClick={() => saveProject(template.name, 'arduino-uno')} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg-panel)', cursor: 'pointer' }}><Icon size={17} color={template.color} /><div style={{ color: 'var(--color-text-normal)', fontSize: 11, fontWeight: 700, marginTop: 10 }}>{template.label}</div><div style={{ color: 'var(--color-text-dim)', fontSize: 9, marginTop: 4 }}>{template.detail}</div></div> })}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showNamingModal && <div style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}>
        <div style={{ width: 420, background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,.7)' }}>
          <div style={{ padding: '14px 17px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><div style={{ color: 'var(--color-text-bright)', fontSize: 13, fontWeight: 700 }}>New project</div><div style={{ color: 'var(--color-text-dim)', fontSize: 10, marginTop: 2 }}>Create an embedded visual flow</div></div><button onClick={() => setShowNamingModal(false)} style={{ ...buttonBase, border: 'none', background: 'transparent', color: 'var(--color-text-dim)', padding: 4 }}><X size={17} /></button></div>
          <div style={{ padding: 18 }}><label style={{ display: 'block', color: 'var(--color-text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', marginBottom: 7 }}>PROJECT NAME</label><div style={{ position: 'relative' }}><input autoFocus value={projectName} onChange={event => setProjectName(event.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))} onKeyDown={event => event.key === 'Enter' && saveProject()} style={{ width: '100%', padding: '10px 34px 10px 11px', background: 'var(--color-bg-input)', color: 'var(--color-text-bright)', border: '1px solid var(--color-border)', borderRadius: 5, outline: 'none', font: '12px var(--font-mono)' }} /><Terminal size={15} color="var(--color-text-dim)" style={{ position: 'absolute', right: 10, top: 10 }} /></div><div style={{ marginTop: 15, color: 'var(--color-text-dim)', fontSize: 10 }}>TARGET BOARD</div><div style={{ marginTop: 6, padding: '9px 10px', border: '1px solid var(--color-border)', borderRadius: 5, color: 'var(--color-accent-blue)', background: 'var(--color-bg-input)', font: '600 11px var(--font-mono)' }}>Arduino Uno</div><button disabled={!projectName.trim()} onClick={() => saveProject()} style={{ ...buttonBase, width: '100%', padding: '10px', marginTop: 20, border: '1px solid var(--color-accent)', background: projectName.trim() ? 'var(--color-accent)' : 'var(--color-bg-input)', color: projectName.trim() ? '#fff' : 'var(--color-text-dim)', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'center', gap: 7, alignItems: 'center', cursor: projectName.trim() ? 'pointer' : 'not-allowed' }}><Plus size={15} /> Create project</button></div>
        </div>
      </div>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".flow,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </main>
  )
}
