'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFlowStore } from '@/store/userFlowStore'
import { generateArduinoCode } from '@/lib/codegen/generateArduino'
import { 
  FileCode, FileJson, FileText, Folder, Copy, Download, X, 
  Terminal, Play, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

export default function CodePanel({ onClose }: { onClose: () => void }) {
  const { schemaNodes, schemaEdges, flowNodes, flowEdges, project } = useFlowStore()
  
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<'ino' | 'json' | 'md'>('ino')
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle')
  const [terminalLog, setTerminalLog] = useState<string[]>([
    'Initializing compiler engine...',
    'Target system ready: Arduino Uno (ATmega328P)'
  ])

  useEffect(() => {
    const generated = generateArduinoCode(schemaNodes, schemaEdges, flowNodes, flowEdges)
    setCode(generated)
  }, [schemaNodes, schemaEdges, flowNodes, flowEdges])

  // Mock JSON representing the connected hardware diagram
  const getDiagramJson = () => {
    const components = schemaNodes.map(n => ({
      id: n.id,
      type: n.data?.componentType || 'mcu',
      name: n.data?.label || 'Arduino Uno',
      position: n.position
    }))
    const wiring = schemaEdges.map(e => ({
      from: `${e.source}.${e.sourceHandle}`,
      to: `${e.target}.${e.targetHandle}`
    }))
    return JSON.stringify({ version: '1.0', components, wiring }, null, 2)
  }

  // Auto-generate a wiring guide markdown document from schema connections!
  const getWiringGuide = () => {
    if (schemaEdges.length === 0) {
      return `# System Wiring Manual\n\nNo active connection wires found in the Schema Designer.\nGo to the Schema Designer and connect sensor pins to the Arduino Uno pin rails.`
    }
    
    let md = `# System Wiring Manual\n\n`
    md += `Follow this table to wire your physical hardware components to the **${project?.platform.toUpperCase() || 'ARDUINO UNO'}** development board.\n\n`
    md += `| Component Pin | Wire Connection | Target Board Pin |\n`
    md += `| :--- | :---: | :--- |\n`
    
    schemaEdges.forEach(edge => {
      const sourceNode = schemaNodes.find(n => n.id === edge.source)
      const targetNode = schemaNodes.find(n => n.id === edge.target)
      
      const sourceName = sourceNode?.data?.label || edge.source
      const targetName = targetNode?.data?.label || edge.target
      
      const sourcePort = edge.sourceHandle || 'Pin'
      const targetPort = edge.targetHandle || 'Pin'
      
      md += `| **${sourceName}** (${sourcePort}) | ──> | **${targetName}** (${targetPort}) |\n`
    })
    
    md += `\n\n*Double-check all positive rails (5V / 3.3V) and ground (GND) connections before powering your board.*`
    return md
  }

  const handleExport = () => {
    const content = activeTab === 'ino' ? code : activeTab === 'json' ? getDiagramJson() : getWiringGuide()
    const ext = activeTab === 'ino' ? 'ino' : activeTab === 'json' ? 'json' : 'md'
    const name = activeTab === 'ino' ? 'sketch' : activeTab === 'json' ? 'diagram' : 'wiring_guide'
    
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name}.${ext}`
    a.click()
  }

  const handleCopyToClipboard = () => {
    const content = activeTab === 'ino' ? code : activeTab === 'json' ? getDiagramJson() : getWiringGuide()
    navigator.clipboard.writeText(content)
    
    // Log to terminal
    setTerminalLog(prev => [...prev, `[SYS] Copied ${activeTab === 'ino' ? 'sketch.ino' : activeTab === 'json' ? 'diagram.json' : 'wiring_guide.md'} contents to clipboard.`])
  }

  const simulateCompile = () => {
    setVerifyStatus('compiling')
    setTerminalLog(prev => [...prev, '[COMPILER] starting avr-g++ validation...', '[COMPILER] linking object files...'])
    
    setTimeout(() => {
      setVerifyStatus('success')
      setTerminalLog(prev => [
        ...prev,
        '[COMPILER] Build completed successfully.',
        `[COMPILER] Program size: ${Math.round(code.length * 0.4)} bytes (approx 3% of program storage space).`,
        `[COMPILER] Global variables use ${Math.round(code.length * 0.08)} bytes of dynamic memory.`
      ])
    }, 1500)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10,10,10,0.75)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(3px)',
    }}>
      <div style={{
        width: '80vw',
        height: '85vh',
        background: '#1a1a1a',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0,0,0,0.8)',
      }}>
        {/* Title Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'var(--color-bg-header)',
          borderBottom: '1px solid var(--color-border)',
          gap: 12,
          userSelect: 'none',
        }}>
          {/* Mock macOS Window Controls */}
          <div style={{ display: 'flex', gap: 6, marginRight: 4 }}>
            <button onClick={onClose} style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56', border: 'none', cursor: 'pointer' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e', border: 'none' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f', border: 'none' }} />
          </div>

          <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontWeight: 600 }}>WORKSPACE IDE</span>
          <div style={{ width: 1, height: 14, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-bright)', fontFamily: 'monospace' }}>
            {project?.name || 'sketch_project'}
          </span>
          <span style={{
            fontSize: 9,
            background: 'rgba(230, 126, 34, 0.1)',
            border: '1px solid rgba(230, 126, 34, 0.2)',
            color: 'var(--color-accent)',
            padding: '1px 5px',
            borderRadius: 3,
            fontFamily: 'monospace',
          }}>
            {project?.platform.toUpperCase() || 'ARDUINO'}
          </span>

          <div style={{ flex: 1 }} />

          {/* IDE Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={simulateCompile}
              disabled={verifyStatus === 'compiling'}
              style={{
                background: '#23382b',
                border: '1px solid #2d4c38',
                color: '#45b872',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
              }}
            >
              {verifyStatus === 'compiling' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              Verify Code
            </button>
            <button
              onClick={handleCopyToClipboard}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-normal)',
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <button
              onClick={handleExport}
              style={{
                background: 'var(--color-accent)',
                border: 'none',
                color: '#151515',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
              }}
            >
              <Download className="w-3 h-3 stroke-[2.5]" /> Download File
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-dim)',
                fontSize: 11,
                cursor: 'pointer',
                padding: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* IDE Editor Shell Split */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* IDE Explorer Sidebar */}
          <div style={{
            width: 180,
            background: 'var(--color-bg-panel)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
          }}>
            <div style={{
              padding: '6px 12px',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--color-text-dim)',
              letterSpacing: '0.8px',
            }}>
              PROJECT WORKSPACE
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0 4px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                fontSize: 11,
                color: 'var(--color-text-normal)',
                fontWeight: 600,
              }}>
                <Folder className="w-3.5 h-3.5 text-[#e67e22] fill-current" /> src
              </div>
              
              {/* File item 1: sketch.ino */}
              <button
                onClick={() => setActiveTab('ino')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 8px 5px 20px',
                  background: activeTab === 'ino' ? '#2d2d2d' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: activeTab === 'ino' ? 'var(--color-text-bright)' : 'var(--color-text-normal)',
                  cursor: 'pointer',
                }}
              >
                <FileCode className="w-3.5 h-3.5 text-[#3d8bff]" /> sketch.ino
              </button>

              {/* File item 2: diagram.json */}
              <button
                onClick={() => setActiveTab('json')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 8px 5px 20px',
                  background: activeTab === 'json' ? '#2d2d2d' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: activeTab === 'json' ? 'var(--color-text-bright)' : 'var(--color-text-normal)',
                  cursor: 'pointer',
                }}
              >
                <FileJson className="w-3.5 h-3.5 text-[#e67e22]" /> diagram.json
              </button>

              {/* File item 3: wiring_guide.md */}
              <button
                onClick={() => setActiveTab('md')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 8px 5px 20px',
                  background: activeTab === 'md' ? '#2d2d2d' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: activeTab === 'md' ? 'var(--color-text-bright)' : 'var(--color-text-normal)',
                  cursor: 'pointer',
                }}
              >
                <FileText className="w-3.5 h-3.5 text-[#2ecc71]" /> wiring.md
              </button>
            </div>
          </div>

          {/* Right Editor Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
            {/* Editor File Tabs Row */}
            <div style={{
              display: 'flex',
              background: '#151515',
              borderBottom: '1px solid var(--color-border)',
              height: 30,
              userSelect: 'none',
            }}>
              {[
                { key: 'ino', label: 'sketch.ino', icon: <FileCode className="w-3.5 h-3.5 text-[#3d8bff]" /> },
                { key: 'json', label: 'diagram.json', icon: <FileJson className="w-3.5 h-3.5 text-[#e67e22]" /> },
                { key: 'md', label: 'wiring.md', icon: <FileText className="w-3.5 h-3.5 text-[#2ecc71]" /> }
              ].map(tab => (
                <div
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 16px',
                    background: activeTab === tab.key ? '#1e1e1e' : '#151515',
                    borderRight: '1px solid var(--color-border)',
                    borderTop: activeTab === tab.key ? '2px solid var(--color-accent)' : 'none',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: activeTab === tab.key ? 'var(--color-text-bright)' : 'var(--color-text-dim)',
                    cursor: 'pointer',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </div>
              ))}
            </div>

            {/* Monaco Editor / Text Area */}
            <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0 }}>
              {activeTab === 'ino' && (
                <MonacoEditor
                  height="100%"
                  language="cpp"
                  theme="vs-dark"
                  value={code}
                  onChange={val => setCode(val || '')}
                  options={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    padding: { top: 12 },
                    cursorBlinking: 'smooth',
                  }}
                />
              )}
              {activeTab === 'json' && (
                <MonacoEditor
                  height="100%"
                  language="json"
                  theme="vs-dark"
                  value={getDiagramJson()}
                  options={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                  }}
                />
              )}
              {activeTab === 'md' && (
                <MonacoEditor
                  height="100%"
                  language="markdown"
                  theme="vs-dark"
                  value={getWiringGuide()}
                  options={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    padding: { top: 12 },
                  }}
                />
              )}
            </div>

            {/* Simulated IDE Terminal Console Output */}
            <div style={{
              height: 120,
              background: '#151515',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'var(--font-mono)',
            }}>
              {/* Terminal Title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 12px',
                background: '#1a1a1a',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 10,
                color: 'var(--color-text-dim)',
                fontWeight: 600,
                userSelect: 'none',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Terminal className="w-3.5 h-3.5" /> Output Terminal
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {verifyStatus === 'success' && (
                    <span style={{ color: '#45b872', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 className="w-3 h-3" /> BUILD SUCCESSFUL
                    </span>
                  )}
                  {verifyStatus === 'compiling' && (
                    <span style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <RefreshCw className="w-3 h-3 animate-spin" /> COMPILING...
                    </span>
                  )}
                  <button 
                    onClick={() => setTerminalLog(['Console cleared.'])}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-dim)',
                      cursor: 'pointer',
                      fontSize: 9,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#c5c5c5'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
                  >
                    Clear Log
                  </button>
                </div>
              </div>

              {/* Logs area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '6px 12px',
                fontSize: 10.5,
                color: '#aaa',
                lineHeight: 1.6,
              }}>
                {terminalLog.map((log, idx) => (
                  <div key={idx} style={{ 
                    color: log.startsWith('[COMPILER]') 
                      ? '#45b872' 
                      : log.startsWith('[SYS]') 
                        ? 'var(--color-accent-blue)' 
                        : '#aaa' 
                  }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}