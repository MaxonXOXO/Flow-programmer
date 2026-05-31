'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFlowStore } from '@/store/userFlowStore'
import {
  Plus, Clock, Grid, BookOpen, Terminal, Settings,
  Sun, Moon, FolderOpen, Cpu, Wifi, Thermometer,
  Bluetooth, FileText, ChevronRight, X, LayoutGrid, Check, Home
} from 'lucide-react'

interface SavedProject {
  name: string
  platform: string
  createdAt: number
}

export default function SplashScreen() {
  const router = useRouter()
  const { setProject, loadProjectState } = useFlowStore()

  // Component States
  const [projectName, setProjectName] = useState('')
  const [platform, setPlatform] = useState<string>('arduino-uno')
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([])
  const [showNamingModal, setShowNamingModal] = useState(false)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load project history and initialize random name
  useEffect(() => {
    try {
      const history = localStorage.getItem('fp_project_history')
      if (history) {
        setRecentProjects(JSON.parse(history))
      } else {
        const sample = [
          { name: 'smart_device', platform: 'arduino-uno', createdAt: Date.now() - 3600000 * 2 }
        ]
        localStorage.setItem('fp_project_history', JSON.stringify(sample))
        setRecentProjects(sample)
      }
    } catch (e) {
      console.error(e)
    }

    const suffixes = ['device', 'controller', 'monitor', 'hub', 'sensor']
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    setProjectName(`smart_${randomSuffix}`)
  }, [])

  // Start project flow
  const handleStartProject = (nameToUse?: string, platformToUse?: string) => {
    const finalName = (nameToUse || projectName).trim()
    const finalPlatform = platformToUse || platform
    if (!finalName || !finalPlatform) return

    const newProj: SavedProject = {
      name: finalName,
      platform: finalPlatform,
      createdAt: Date.now(),
    }

    localStorage.setItem('fp_project', JSON.stringify(newProj))

    const updatedHistory = [newProj, ...recentProjects.filter(p => p.name !== finalName)].slice(0, 5)
    localStorage.setItem('fp_project_history', JSON.stringify(updatedHistory))
    setRecentProjects(updatedHistory)

    setShowNamingModal(false)
    router.push('/editor')
  }

  // Load quick starter template
  const handleQuickTemplate = (templateName: string, selectedPlatform: string) => {
    handleStartProject(templateName, selectedPlatform)
  }

  // File Uploader / Loader from desktop JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed && parsed.project && parsed.schemaNodes && parsed.flowNodes) {
          loadProjectState({
            project: parsed.project,
            schemaNodes: parsed.schemaNodes,
            schemaEdges: parsed.schemaEdges || [],
            flowNodes: parsed.flowNodes,
            flowEdges: parsed.flowEdges || [],
          })
          localStorage.setItem('fp_project', JSON.stringify(parsed.project))

          const newProj: SavedProject = {
            name: parsed.project.name,
            platform: parsed.project.platform,
            createdAt: Date.now(),
          }
          const updatedHistory = [newProj, ...recentProjects.filter(p => p.name !== parsed.project.name)].slice(0, 5)
          localStorage.setItem('fp_project_history', JSON.stringify(updatedHistory))

          router.push('/editor')
        } else {
          alert("Invalid project file structure.")
        }
      } catch (err) {
        alert("Failed to parse project file.")
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Formatting helpers
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 1) return 'Just now'
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const showSkeletonAlert = (feature: string) => {
    alert(`${feature} is currently dormant in this compilation.`)
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0b0e',
      color: '#a5b3cd',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      userSelect: 'none',
      overflow: 'hidden',
    }}>
      {/* Hidden file input for open project */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />

      {/* Main Container Dashboard */}
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0a0b0e',
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Left Navigation Sidebar */}
        <div style={{
          width: 220,
          background: '#11141c',
          borderRight: '1px solid #1e2638',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          justifyContent: 'space-between',
        }}>
          {/* Top Logo Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #e66e19, #d65e0a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: 16,
                boxShadow: '0 4px 12px rgba(230,110,25,0.2)',
              }}>
                F
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, color: '#f0f4fc', fontSize: 13, letterSpacing: 0.5 }}>FLOW-IDE</span>
                <span style={{ fontSize: 9, color: '#546484', fontFamily: 'monospace' }}>v1.3.0</span>
              </div>
            </div>

            {/* Nav Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(230,110,25,0.06)',
                  border: 'none',
                  color: '#e66e19',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Home className="w-4 h-4" /> Welcome
              </button>
              <button
                onClick={() => showSkeletonAlert('Recent Workspaces Panel')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#a5b3cd',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Clock className="w-4 h-4 text-[#546484]" /> Recent Workspaces
              </button>
              <button
                onClick={() => showSkeletonAlert('Templates Panel')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'transparent',
                  border: 'none',
                  color: '#a5b3cd',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Grid className="w-4 h-4 text-[#546484]" /> Templates
              </button>
            </div>
          </div>

          {/* Footer Actions / Skeletons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => showSkeletonAlert('Documentation Manual')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'transparent',
                  border: 'none',
                  color: '#a5b3cd',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f0f4fc'}
                onMouseLeave={e => e.currentTarget.style.color = '#a5b3cd'}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#546484]" /> Documentation
              </button>
              <button
                onClick={() => showSkeletonAlert('Examples Blueprint Directory')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'transparent',
                  border: 'none',
                  color: '#a5b3cd',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f0f4fc'}
                onMouseLeave={e => e.currentTarget.style.color = '#a5b3cd'}
              >
                <Terminal className="w-3.5 h-3.5 text-[#546484]" /> Examples
              </button>
              <button
                onClick={() => showSkeletonAlert('Preferences Settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'transparent',
                  border: 'none',
                  color: '#a5b3cd',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f0f4fc'}
                onMouseLeave={e => e.currentTarget.style.color = '#a5b3cd'}
              >
                <Settings className="w-3.5 h-3.5 text-[#546484]" /> Settings
              </button>
            </div>

            {/* Theme Toggle Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #1e2638',
              paddingTop: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#546484' }}>
                {themeMode === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span>Dark Mode</span>
              </div>
              <button
                onClick={() => setThemeMode(mode => mode === 'dark' ? 'light' : 'dark')}
                style={{
                  width: 32,
                  height: 18,
                  borderRadius: 9,
                  background: themeMode === 'dark' ? '#e66e19' : '#1e2638',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: 2,
                  left: themeMode === 'dark' ? 16 : 2,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Dashboard Area */}
        <div style={{
          flex: 1,
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto',
        }}>
          {/* Header Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4fc', margin: 0 }}>
                Welcome to <span style={{ color: '#e66e19' }}>FLOW-IDE</span>
              </h1>
              <p style={{ fontSize: 12, color: '#546484', marginTop: 4, marginBottom: 0 }}>
                Powerful visual programming for embedded systems.
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#11141c',
                border: '1px solid #1e2638',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#f0f4fc',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#e66e19'
                e.currentTarget.style.background = 'rgba(230, 110, 25, 0.02)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e2638'
                e.currentTarget.style.background = '#11141c'
              }}
            >
              <FolderOpen className="w-4 h-4 text-[#5fa3ff]" /> Open Workspace
            </button>
          </div>

          {/* Core Grid Layout (2 Rows x 2 Cols) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}>
            {/* Left Box: Create Workspace */}
            <div style={{
              background: '#11141c',
              border: '1px solid #1e2638',
              borderRadius: 8,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <div style={{ width: '100%' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0f4fc', textAlign: 'left', margin: '0 0 4px 0' }}>
                  Create New Workspace
                </h3>
                <p style={{ fontSize: 10, color: '#546484', textAlign: 'left', margin: 0, lineHeight: 1.4 }}>
                  Start a new project from scratch or use one of our templates.
                </p>
              </div>

              {/* Isometric 3D Layered Logo Graphic */}
              <div style={{
                position: 'relative',
                width: 120,
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '20px 0',
                perspective: '800px',
              }}>
                {/* Layer 3 (Bottom) */}
                <div style={{
                  position: 'absolute',
                  width: 80,
                  height: 50,
                  background: '#1a1f2c',
                  border: '1px solid #2e384d',
                  borderRadius: 8,
                  transform: 'rotateX(60deg) rotateZ(-45deg) translateZ(-16px)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                }} />
                {/* Layer 2 (Middle) */}
                <div style={{
                  position: 'absolute',
                  width: 80,
                  height: 50,
                  background: '#222838',
                  border: '1px solid #3d4a66',
                  borderRadius: 8,
                  transform: 'rotateX(60deg) rotateZ(-45deg) translateZ(0px)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                }} />
                {/* Layer 1 (Top) */}
                <div style={{
                  position: 'absolute',
                  width: 80,
                  height: 50,
                  background: 'linear-gradient(135deg, #e66e19, #d65e0a)',
                  border: '1px solid #ff7e29',
                  borderRadius: 8,
                  transform: 'rotateX(60deg) rotateZ(-45deg) translateZ(16px)',
                  boxShadow: '0 10px 20px rgba(230,110,25,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    transform: 'rotateZ(45deg) rotateX(-20deg)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 22,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>F</span>
                </div>
              </div>

              <button
                onClick={() => setShowNamingModal(true)}
                style={{
                  width: '100%',
                  background: '#e66e19',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#d65e0a'}
                onMouseLeave={e => e.currentTarget.style.background = '#e66e19'}
              >
                <Plus className="w-4 h-4" /> Create Workspace
              </button>
            </div>

            {/* Right Box: Select Hardware Core */}
            <div style={{
              background: '#11141c',
              border: '1px solid #1e2638',
              borderRadius: 8,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f0f4fc', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cpu className="w-4 h-4 text-[#e66e19]" /> Select Your Hardware Core
                </h3>
                <p style={{ fontSize: 10, color: '#546484', margin: 0 }}>
                  Choose a microcontroller board to configure your project environment.
                </p>

                {/* Horizontal Boards Panel */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}>
                  {/* Arduino Uno Card (Enabled/Selectable) */}
                  <div
                    onClick={() => setPlatform('arduino-uno')}
                    style={{
                      background: '#0d0f14',
                      border: platform === 'arduino-uno' ? '1.5px solid #e66e19' : '1px solid #1e2638',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {platform === 'arduino-uno' && (
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#e66e19',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                    {/* Rotated Board Image */}
                    <div style={{
                      width: 90,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible',
                    }}>
                      <img
                        src="/mcu/arduino_uno.png"
                        alt="Arduino Uno"
                        style={{
                          height: 76,
                          width: 'auto',
                          transform: 'rotate(-90deg)',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f4fc' }}>Arduino Uno</span>
                        <span style={{ fontSize: 8, background: '#e66e19/10', color: '#e66e19', padding: '0 4px', borderRadius: 3, fontWeight: 'bold' }}>SELECTED</span>
                      </div>
                      <p style={{ fontSize: 8, color: '#546484', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                        ATmega328P · 16 MHz<br />14 Digital I/O · 6 Analog
                      </p>
                    </div>
                  </div>

                  {/* ESP32 Card (Disabled) */}
                  <div style={{
                    background: '#0d0f14',
                    border: '1px solid #1e2638',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    opacity: 0.35,
                    cursor: 'not-allowed',
                  }}>
                    {/* Rotated Board Image */}
                    <div style={{
                      width: 90,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible',
                    }}>
                      <img
                        src="/mcu/esp32.png"
                        alt="ESP32 DevBoard"
                        style={{
                          height: 76,
                          width: 'auto',
                          transform: 'rotate(-90deg)',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f4fc' }}>ESP32 DevBoard</span>
                      <p style={{ fontSize: 8, color: '#546484', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                        Xtensa LX6 Dual-Core<br />Wi-Fi · BLE · 34 GPIO
                      </p>
                    </div>
                  </div>

                  {/* NodeMCU ESP8266 Card (Disabled) */}
                  <div style={{
                    background: '#0d0f14',
                    border: '1px solid #1e2638',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    opacity: 0.35,
                    cursor: 'not-allowed',
                  }}>
                    {/* Rotated Board Image */}
                    <div style={{
                      width: 90,
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible',
                    }}>
                      <img
                        src="/mcu/esp8266.png"
                        alt="NodeMCU ESP8266"
                        style={{
                          height: 76,
                          width: 'auto',
                          transform: 'rotate(-90deg)',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f0f4fc' }}>NodeMCU ESP8266</span>
                      <p style={{ fontSize: 8, color: '#546484', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                        Tensilica L106 Chip<br />Wi-Fi · 17 GPIO
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => showSkeletonAlert('Hardware Board Manager')}
                style={{
                  width: '100%',
                  background: '#11141c',
                  color: '#a5b3cd',
                  border: '1px solid #1e2638',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#546484'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2638'}
              >
                View All Boards
              </button>
            </div>
            {/* Recent Workspaces Box */}
            <div style={{
              background: '#11141c',
              border: '1px solid #1e2638',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4fc' }}>Recent Workspaces</span>
                <button
                  onClick={() => showSkeletonAlert('Workspace Directory')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#5fa3ff',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  View All
                </button>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginTop: 8,
                flex: 1,
                overflowY: 'auto',
              }}>
                {recentProjects.length === 0 ? (
                  <div style={{ fontSize: 10, color: '#546484', fontStyle: 'italic', padding: '6px 0' }}>
                    No recent workspaces.
                  </div>
                ) : (
                  recentProjects.map(proj => (
                    <div
                      key={proj.name}
                      onClick={() => handleStartProject(proj.name, proj.platform)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#0d0f14',
                        border: '1px solid #1e2638',
                        borderRadius: 4,
                        padding: '6px 10px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#e66e19'
                        e.currentTarget.style.background = 'rgba(230,110,25,0.02)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#1e2638'
                        e.currentTarget.style.background = '#0d0f14'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <FileText className="w-3.5 h-3.5 text-[#e66e19] flex-shrink-0" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#f0f4fc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {proj.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 8, color: '#5fa3ff', fontWeight: 600, textTransform: 'uppercase' }}>
                          {proj.platform.replace('-', ' ')}
                        </span>
                        <span style={{ fontSize: 8, color: '#546484' }}>
                          {getRelativeTime(proj.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Starter Templates Box */}
            <div style={{
              background: '#11141c',
              border: '1px solid #1e2638',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4fc' }}>Starter Templates</span>
                <p style={{ fontSize: 10, color: '#546484', margin: '2px 0 0 0' }}>
                  Kickstart your project with ready-to-use examples.
                </p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                  marginTop: 10,
                }}>
                  {[
                    { name: 'light_sense', label: 'Light Sensor', desc: 'LDR + Analog LED code', board: 'arduino-uno', icon: <Sun className="w-4 h-4 text-[#ffb13d]" /> },
                    { name: 'esp_ping_chk', label: 'ESP Ping Check', desc: 'ESP32 Wi-Fi fetch', board: 'arduino-uno', icon: <Wifi className="w-4 h-4 text-[#2fd18b]" /> },
                    { name: 'temp_monitor', label: 'Temperature Monitor', desc: 'DHT22 + Display', board: 'arduino-uno', icon: <Thermometer className="w-4 h-4 text-[#ff5f9e]" /> },
                    { name: 'ble_control', label: 'Bluetooth Control', desc: 'HC-05 + LED Control', board: 'arduino-uno', icon: <Bluetooth className="w-4 h-4 text-[#5fa3ff]" /> },
                  ].map(t => (
                    <div
                      key={t.name}
                      onClick={() => handleQuickTemplate(t.name, t.board)}
                      style={{
                        background: '#0d0f14',
                        border: '1px solid #1e2638',
                        borderRadius: 6,
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#e66e19'
                        e.currentTarget.style.background = 'rgba(230,110,25,0.02)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#1e2638'
                        e.currentTarget.style.background = '#0d0f14'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.icon}
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#f0f4fc' }}>{t.label}</span>
                      </div>
                      <p style={{ fontSize: 8, color: '#546484', margin: 0, lineHeight: 1.3 }}>
                        {t.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => showSkeletonAlert('Template Library')}
                style={{
                  width: '100%',
                  background: '#11141c',
                  color: '#a5b3cd',
                  border: '1px solid #1e2638',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#546484'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2638'}
              >
                Browse All Templates
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Popup: Project Naming Dialog */}
      {showNamingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            width: 360,
            background: '#11141c',
            border: '1px solid #1e2638',
            borderRadius: 10,
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #1e2638',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#171c28',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f4fc' }}>Initialize Workspace</span>
              <button
                onClick={() => setShowNamingModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#546484', cursor: 'pointer' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#546484', textTransform: 'uppercase' }}>Project Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                    style={{
                      width: '100%',
                      background: '#07090d',
                      border: '1px solid #1e2638',
                      borderRadius: 6,
                      padding: '8px 12px',
                      paddingRight: 32,
                      fontSize: 12,
                      color: '#f0f4fc',
                      outline: 'none',
                      fontFamily: 'monospace',
                    }}
                    placeholder="my_new_flow"
                  />
                  <Terminal className="w-3.5 h-3.5 text-[#546484] absolute right-3" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#546484', textTransform: 'uppercase' }}>Select Platform</label>
                <div style={{
                  background: '#07090d',
                  border: '1px solid #1e2638',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#e66e19',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  Arduino Uno (selected)
                </div>
              </div>

              <button
                onClick={() => handleStartProject()}
                disabled={!projectName.trim()}
                style={{
                  width: '100%',
                  background: projectName.trim() ? '#e66e19' : '#1e2638',
                  color: projectName.trim() ? '#ffffff' : '#546484',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                <Plus className="w-4 h-4" /> Initialize Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
