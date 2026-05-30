'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Sparkles, BookOpen, Cpu, Terminal, Play } from 'lucide-react'

interface SavedProject {
  name: string
  platform: string
  createdAt: number
}

// Stylized Board SVGs
function ArduinoUnoSVG({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-24 transition-all duration-300">
      {/* PCB Solder Base */}
      <rect x="5" y="5" width="190" height="110" rx="8" fill={selected ? "#0e3121" : "#0d1814"} stroke={selected ? "#2fd18b" : "#1e2c24"} strokeWidth="2" />
      {/* Solder Grid Silkscreen */}
      <line x1="20" y1="12" x2="180" y2="12" stroke={selected ? "rgba(47,209,139,0.3)" : "rgba(40,60,50,0.4)"} strokeWidth="1" strokeDasharray="3 3" />
      <line x1="20" y1="108" x2="180" y2="108" stroke={selected ? "rgba(47,209,139,0.3)" : "rgba(40,60,50,0.4)"} strokeWidth="1" strokeDasharray="3 3" />
      
      {/* ATMega328 Microcontroller */}
      <rect x="60" y="45" width="90" height="28" rx="2" fill="#181818" stroke={selected ? "#2fd18b" : "#444"} strokeWidth="1" />
      {/* MCU Pins */}
      {Array.from({ length: 14 }).map((_, i) => (
        <g key={i}>
          <rect x={65 + i * 6} y="41" width="3" height="4" fill="#a5b3cd" />
          <rect x={65 + i * 6} y="73" width="3" height="4" fill="#a5b3cd" />
        </g>
      ))}
      <text x="105" y="62" fill={selected ? "#2fd18b" : "#777"} fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">ATMEGA328P</text>

      {/* USB Interface Port */}
      <rect x="5" y="15" width="40" height="26" fill="#a5b3cd" rx="2" stroke="#546484" />
      <rect x="12" y="20" width="26" height="16" fill="#222" />

      {/* Power Jack */}
      <rect x="5" y="75" width="36" height="30" fill="#222" rx="3" stroke="#444" />
      <circle cx="23" cy="90" r="6" fill="#111" />

      {/* Pin Headers */}
      <rect x="55" y="10" width="120" height="8" fill="#111" rx="1" />
      <rect x="55" y="102" width="120" height="8" fill="#111" rx="1" />
      
      {/* Solder Joints on Rails */}
      {Array.from({ length: 16 }).map((_, i) => (
        <g key={i}>
          <circle cx={60 + i * 7} cy="14" r="2" fill="#d1a55f" />
          <circle cx={60 + i * 7} cy="106" r="2" fill="#d1a55f" />
        </g>
      ))}

      {/* Text Markings */}
      <text x="115" y="32" fill="#2fd18b" fontSize="9" fontWeight="bold" fontFamily="sans-serif">ARDUINO UNO</text>
      <text x="115" y="94" fill="#546484" fontSize="7" fontFamily="monospace">POWER: 5V/3.3V</text>
    </svg>
  )
}

function ESP32SVG({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-24 transition-all duration-300">
      {/* Board Base */}
      <rect x="15" y="5" width="170" height="110" rx="8" fill={selected ? "#122438" : "#0d131a"} stroke={selected ? "#5fa3ff" : "#1e2938"} strokeWidth="2" />

      {/* Antenna Trace serpentine */}
      <rect x="80" y="8" width="40" height="14" fill="#222" rx="1" />
      <path d="M 85,15 H 115 M 85,12 V 18 M 95,12 V 18 M 105,12 V 18 M 115,12 V 18" stroke="#d1a55f" strokeWidth="1.5" fill="none" />

      {/* Metal Shield Box */}
      <rect x="70" y="30" width="60" height="50" rx="3" fill="#303845" stroke={selected ? "#5fa3ff" : "#546484"} />
      <text x="100" y="52" fill="#f0f4fc" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">ESP-WROOM-32</text>
      <text x="100" y="66" fill="#a5b3cd" fontSize="6" fontFamily="monospace" textAnchor="middle">FCC ID: 2AC7Z</text>

      {/* Silicon Chip Components */}
      <rect x="30" y="35" width="18" height="18" fill="#181818" rx="1" />
      <rect x="150" y="35" width="18" height="18" fill="#181818" rx="1" />

      {/* Micro USB Port */}
      <rect x="85" y="106" width="30" height="10" fill="#a5b3cd" rx="1" />
      <rect x="91" y="108" width="18" height="6" fill="#222" />

      {/* Left and Right Header Pins */}
      <rect x="20" y="15" width="6" height="90" fill="#111" />
      <rect x="174" y="15" width="6" height="90" fill="#111" />

      {/* Gold Solder Joints */}
      {Array.from({ length: 12 }).map((_, i) => (
        <g key={i}>
          <circle cx="23" cy={20 + i * 7} r="1.8" fill="#d1a55f" />
          <circle cx="177" cy={20 + i * 7} r="1.8" fill="#d1a55f" />
        </g>
      ))}

      {/* Labels */}
      <text x="100" y="95" fill="#5fa3ff" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">ESP32 DevKit</text>
    </svg>
  )
}

function ESP8266SVG({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-24 transition-all duration-300">
      {/* Board Base */}
      <rect x="25" y="5" width="150" height="110" rx="8" fill={selected ? "#2b1433" : "#130d17"} stroke={selected ? "#ff5f9e" : "#2d1b33"} strokeWidth="2" />

      {/* Serpentine Wifi Antenna */}
      <path d="M 80,10 H 120 M 80,13 H 120 M 80,16 H 120" stroke="#d1a55f" strokeWidth="2" fill="none" />

      {/* ESP8266 Chip */}
      <rect x="65" y="32" width="70" height="42" rx="2" fill="#252525" stroke={selected ? "#ff5f9e" : "#444"} />
      <rect x="75" y="40" width="50" height="25" fill="#3a3a3a" rx="1" />
      <text x="100" y="55" fill="#ff5f9e" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">MOD-ESP8266</text>

      {/* Left/Right Pins */}
      <rect x="35" y="20" width="6" height="80" fill="#111" />
      <rect x="159" y="20" width="6" height="80" fill="#111" />

      {/* Pin connectors */}
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
          <circle cx="38" cy={24 + i * 8} r="1.8" fill="#d1a55f" />
          <circle cx="162" cy={24 + i * 8} r="1.8" fill="#d1a55f" />
        </g>
      ))}

      {/* CP2102 chip */}
      <rect x="90" y="85" width="20" height="20" fill="#181818" rx="1" />

      <text x="100" y="112" fill="#a5b3cd" fontSize="7" fontFamily="monospace" textAnchor="middle">NodeMCU V3</text>
    </svg>
  )
}

export default function WelcomePage() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [platform, setPlatform] = useState<string>('arduino-uno')
  const [recentProjects, setRecentProjects] = useState<SavedProject[]>([])

  useEffect(() => {
    try {
      const history = localStorage.getItem('fp_project_history')
      if (history) {
        setRecentProjects(JSON.parse(history))
      } else {
        const sample = [
          { name: 'smart_room_light', platform: 'arduino-uno', createdAt: Date.now() - 3600000 * 2 }
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

  const handleStart = (nameToUse?: string, platformToUse?: string) => {
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

    router.push('/editor')
  }

  const handleQuickTemplate = (templateName: string, selectedPlatform: string) => {
    handleStart(templateName, selectedPlatform)
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#0a0b0e] text-[#a5b3cd] select-none overflow-hidden relative">
      
      {/* Digital Glowing Space Background Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }} 
      />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#5fa3ff]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#2fd18b]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Workspace Frame split in two columns */}
      <div className="w-[960px] h-[580px] bg-[#11141c] rounded-xl border border-[#1e2638] shadow-2xl flex overflow-hidden z-10 relative">
        
        {/* Left Column: Integrated Desktop Window Shell */}
        <div className="w-[420px] bg-[#07090d] border-r border-[#1e2638] flex flex-col overflow-hidden">
          
          {/* OS Titlebar controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#11141c] border-b border-[#1e2638] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] block" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] block" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] block" />
            </div>
            <span className="text-[10px] font-bold tracking-wider font-mono text-[#546484]">WORKSPACE_MANAGER.EXE</span>
            <div className="w-8" /> {/* Spacer */}
          </div>

          {/* Window Interior Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#2fd18b] to-[#5fa3ff] flex items-center justify-center text-[#0a0b0e] font-black text-xl shadow-lg shadow-[#2fd18b]/20">
                F
              </div>
              <div>
                <h1 className="text-white font-bold text-sm tracking-wide">
                  FLOW <span className="text-[#2fd18b]">PROGRAMMER</span>
                </h1>
                <p className="text-[9px] text-[#546484] font-mono tracking-tight mt-0.5">V1.2 · NEON DESIGN MODULE</p>
              </div>
            </div>

            {/* Input Window form */}
            <div className="bg-[#11141c] border border-[#1e2638] rounded-lg p-4 flex flex-col gap-4">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-1">New Workspace</h2>
                <p className="text-[10px] text-[#546484]">Enter settings to boot compiler assets.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-[#546484] uppercase tracking-wider">Project Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                    className="w-full bg-[#07090d] border border-[#1e2638] rounded px-3 py-2 text-xs text-white font-mono placeholder-[#333] outline-none focus:border-[#2fd18b] focus:ring-1 focus:ring-[#2fd18b] transition-all"
                    placeholder="my_new_flow"
                  />
                  <Terminal className="w-3.5 h-3.5 text-[#546484] absolute right-3 top-2.5" />
                </div>
              </div>

              <button
                onClick={() => handleStart()}
                disabled={!projectName.trim()}
                className={`w-full py-2 px-4 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  projectName.trim()
                    ? 'bg-[#2fd18b] text-[#0a0b0e] hover:bg-[#25b577] active:scale-[0.98] cursor-pointer shadow-lg shadow-[#2fd18b]/15'
                    : 'bg-[#1e2638] text-[#546484] cursor-not-allowed'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Initialize Workspace
              </button>
            </div>

            {/* Recent files list */}
            <div>
              <h2 className="text-[10px] font-bold text-[#546484] tracking-wider uppercase mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5fa3ff]" /> Recent Workspaces
              </h2>
              {recentProjects.length === 0 ? (
                <div className="text-[10px] text-[#546484] py-1.5 italic font-mono">No recent projects found</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentProjects.map(proj => (
                    <button
                      key={proj.name}
                      onClick={() => handleStart(proj.name, proj.platform)}
                      className="w-full text-left py-1.5 px-3 rounded bg-[#11141c]/50 hover:bg-[#11141c] border border-transparent hover:border-[#1e2638] transition-all flex items-center justify-between text-xs font-mono group"
                    >
                      <span className="truncate pr-2 group-hover:text-[#2fd18b] text-[#a5b3cd] transition-colors">
                        {proj.name}
                      </span>
                      <span className="text-[9px] text-[#546484] group-hover:text-[#a5b3cd] uppercase font-sans">
                        {proj.platform.replace('-', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Templates Blueprints */}
            <div>
              <h2 className="text-[10px] font-bold text-[#546484] tracking-wider uppercase mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff5f9e]" /> Starter Blueprints
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'light_sense', desc: 'LDR + Analog LED code', board: 'arduino-uno' },
                  { name: 'esp_ping_chk', desc: 'ESP32 Wi-Fi fetch', board: 'esp32' }
                ].map(t => (
                  <button
                    key={t.name}
                    onClick={() => handleQuickTemplate(t.name, t.board)}
                    className="text-left p-2.5 rounded bg-[#11141c] border border-[#1e2638] hover:border-[#ff5f9e]/40 hover:bg-[#11141c]/80 transition-all flex flex-col gap-0.5 group"
                  >
                    <div className="text-[11px] font-bold text-white group-hover:text-[#ff5f9e] transition-colors font-mono truncate">
                      {t.name}
                    </div>
                    <div className="text-[9px] text-[#546484] truncate">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Footer Documentation links */}
          <div className="px-6 py-4 border-t border-[#1e2638] bg-[#07090d] flex items-center justify-between text-[10px] text-[#546484] flex-shrink-0">
            <a href="#" className="hover:text-white flex items-center gap-1 transition-colors">
              <BookOpen className="w-3 h-3" /> Documentation Manual
            </a>
            <span className="font-mono">NEON_SYS v1.2</span>
          </div>

        </div>

        {/* Right Column: Visual Board Drawing Selectors */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Select Hardware Core</h2>
              <p className="text-[10px] text-[#546484] mt-0.5">Click a microchip card drawing below to map target board compilation paths.</p>
            </div>

            {/* Stylized SVG drawing buttons */}
            <div className="grid grid-cols-1 gap-4 mt-2">
              {[
                { 
                  id: 'arduino-uno', 
                  title: 'Arduino Uno MCU', 
                  desc: 'ATmega328P processor core. 14 Digital I/O channels. 6 Analog inputs.', 
                  accent: 'var(--color-accent)', 
                  svg: <ArduinoUnoSVG selected={platform === 'arduino-uno'} /> 
                },
                { 
                  id: 'esp32', 
                  title: 'ESP32 Dual-Core DevBoard', 
                  desc: 'Xtensa LX6 chip. Integrated Wi-Fi and BLE stack. Real-time tasks.', 
                  accent: 'var(--color-accent-blue)', 
                  svg: <ESP32SVG selected={platform === 'esp32'} /> 
                },
                { 
                  id: 'esp8266', 
                  title: 'NodeMCU ESP8266 Board', 
                  desc: 'Tensilica L106 single-core. Compact, low cost board with basic Wi-Fi.', 
                  accent: 'var(--color-accent-pink)', 
                  svg: <ESP8266SVG selected={platform === 'esp8266'} /> 
                }
              ].map(b => (
                <button
                  key={b.id}
                  onClick={() => setPlatform(b.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-4 bg-[#11141c] ${
                    platform === b.id 
                      ? 'border-[#2fd18b] shadow-lg shadow-[#2fd18b]/10 bg-[#11141c]' 
                      : 'border-[#1e2638] hover:border-[#546484] hover:bg-[#11141c]/80'
                  }`}
                  style={{
                    boxShadow: platform === b.id ? '0 0 16px rgba(47, 209, 139, 0.15)' : 'none'
                  }}
                >
                  {/* SVG drawing container */}
                  <div className="w-[140px] flex-shrink-0 bg-[#07090d] border border-[#1e2638] rounded p-1.5 flex items-center justify-center shadow-inner">
                    {b.svg}
                  </div>

                  {/* Core details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{b.title}</span>
                      {platform === b.id && (
                        <span className="text-[9px] bg-[#2fd18b]/10 text-[#2fd18b] border border-[#2fd18b]/30 px-1.5 py-0.2 rounded uppercase font-bold font-mono">Selected</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#546484] mt-1 leading-snug">{b.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}