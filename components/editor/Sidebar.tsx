'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { useState, useCallback, useMemo } from 'react'
import { 
  Search, ChevronDown, ChevronRight, GripVertical, 
  Lightbulb, Square, StopCircle, Thermometer, Radio, Eye, Sun, 
  Settings, Wrench, Volume2, Zap, Tv, Monitor, Wifi, 
  PlayCircle, HelpCircle, RotateCw, Timer, Binary, 
  Braces, Printer, Type, Activity, Network,
  Flame, Droplets, Waves, Wind, Cpu
} from 'lucide-react'

import { getAllComponents } from '@/lib/registry/components'
import ProjectExplorer from '@/components/editor/ProjectExplorer'

const NODE_TYPES = [
  {
    section: 'Control Flow',
    nodes: [
      { type: 'start',     label: 'Start',        icon: '▶',   nodeType: 'start',     params: {} },
      { type: 'end',       label: 'End',           icon: '⬛',  nodeType: 'end',       params: {} },
      { type: 'return',    label: 'Return',       icon: '↩',   nodeType: 'return',    params: { value: '' } },
      { type: 'condition', label: 'If Condition',  icon: '◇',   nodeType: 'condition', params: { condition: 'x > 0' } },
      { type: 'loop',      label: 'For Loop',      icon: '↻',   nodeType: 'loop',      params: { from: '0', to: '10', step: '1', var: 'i' } },
      { type: 'delay',     label: 'Delay',         icon: '⏱',   nodeType: 'delay',     params: { ms: '500' } },
    ]
  },
  {
    section: 'Data',
    nodes: [
      { type: 'variable',  label: 'Variable',      icon: 'x=',  nodeType: 'variable',  params: { name: 'x', value: '0' } },
      { type: 'assignment', label: 'Assignment',   icon: 'x=',  nodeType: 'assignment', params: { target: 'x', expression: '0' } },
      { type: 'function',  label: 'Function Definition', icon: 'ƒ()', nodeType: 'function',  params: { name: 'myFn', returnType: 'void', parameters: [] } },
      { type: 'function_call', label: 'Function Call', icon: 'call()', nodeType: 'function_call', params: { functionName: '', arguments: [], assignTo: '' } },
    ]
  },
  {
    section: 'I/O',
    nodes: [
      { type: 'print',     label: 'Print',         icon: '»',   nodeType: 'print',     params: { message: '"Hello"' } },
      { type: 'input',     label: 'User Input',    icon: '←',   nodeType: 'input',     params: { prompt: '"Enter:"', var: 'val' } },
    ]
  },
  {
    section: 'Hardware',
    nodes: [
      { type: 'sensor',    label: 'Sensor Read',   icon: '≋',   nodeType: 'sensor',    params: { pin: 'A0', var: 'sensorVal' } },
      { type: 'gpio',      label: 'GPIO Write',    icon: '⚡',   nodeType: 'gpio',      params: { pin: '13', value: 'HIGH' } },
      { type: 'api',       label: 'HTTP API',      icon: '⇌',   nodeType: 'api',       params: { url: 'https://api.example.com', method: 'GET' } },
    ]
  },
  {
    section: 'Sensor Templates',
    nodes: [
      { type: 'dht',        label: 'DHT Sensor',      icon: '🌡',  nodeType: 'dht',        params: { varTemp: 'temp', varHum: 'hum', pin: '2' } },
      { type: 'ultrasonic', label: 'Ultrasonic Read', icon: '📡',  nodeType: 'ultrasonic', params: { varDist: 'distance', trigPin: '9', echoPin: '10' } },
      { type: 'pir',        label: 'PIR Motion',      icon: '👁',  nodeType: 'pir',        params: { varMotion: 'motion', pin: '3' } },
      { type: 'ldr',        label: 'LDR Light',       icon: '☀',  nodeType: 'ldr',        params: { varLight: 'lightVal', pin: 'A0' } },
      { type: 'ir',         label: 'IR Obstacle',     icon: '👁',  nodeType: 'ir',         params: { varObstacle: 'obstacle', pin: '3', variant: 'Active Low' } },
      { type: 'flame',      label: 'Flame Sensor',    icon: '🔥',  nodeType: 'flame',      params: { varFlame: 'flameVal', pin: '4', variant: 'Active Low' } },
      { type: 'soilMoisture', label: 'Soil Moisture', icon: '🌱',  nodeType: 'soilMoisture', params: { varMoisture: 'moisture', pin: 'A1', variant: 'Active Low' } },
      { type: 'waterLevel', label: 'Water Level',     icon: '💧',  nodeType: 'waterLevel',  params: { varLevel: 'waterLevel', pin: 'A2', variant: 'Active High' } },
      { type: 'mqGas',      label: 'MQ Gas Sensor',   icon: '💨',  nodeType: 'mqGas',      params: { varGas: 'gasVal', pin: 'A3', variant: 'Active Low' } },
      { type: 'vibration',  label: 'Vibration Sensor', icon: '📳',  nodeType: 'vibration',  params: { varVib: 'vibration', pin: '5', variant: 'Active Low' } },
    ]
  },
  {
    section: 'Control Devices',
    nodes: [
      { type: 'servo',      label: 'Servo Motor',     icon: '🔧',  nodeType: 'servo',      params: { pin: '9', angle: '90' } },
      { type: 'lcd',        label: 'LCD 16x2 Text',   icon: '📺',  nodeType: 'lcd',        params: { text: '"Temp: " + String(temp)', row: '0', col: '0' } },
      { type: 'oled',       label: 'OLED Text',       icon: '🖥',  nodeType: 'oled',       params: { text: '"Distance: " + String(distance)', x: '0', y: '0', size: '1' } },
      { type: 'l298n',      label: 'L298N Motor Control', icon: '🔌', nodeType: 'l298n',   params: { motor: 'Motor A', direction: 'Forward', speed: '255' } },
      { type: 'l293d',      label: 'L293D Motor Control', icon: '🔌', nodeType: 'l293d',   params: { motor: 'Motor A', direction: 'Forward', speed: '255' } },
    ]
  },
]

// Render clean vector icon instead of emojis
function getLucideIcon(emoji: string, color: string = 'currentColor') {
  const iconProps = { className: 'w-4 h-4', style: { color } }
  
  switch(emoji) {
    case '💡': return <Lightbulb {...iconProps} style={{ color: '#ffb13d' }} />
    case '⬛': return <Square {...iconProps} />
    case '🌡': return <Thermometer {...iconProps} style={{ color: '#ff5f9e' }} />
    case '📡': return <Radio {...iconProps} style={{ color: '#5fa3ff' }} />
    case '👁': return <Eye {...iconProps} style={{ color: '#2fd18b' }} />
    case '☀': return <Sun {...iconProps} style={{ color: '#ffb13d' }} />
    case '⚙': return <Settings {...iconProps} />
    case '🔧': return <Wrench {...iconProps} style={{ color: '#a5b3cd' }} />
    case '🔔': return <Volume2 {...iconProps} style={{ color: '#ffb13d' }} />
    case '⚡': return <Zap {...iconProps} style={{ color: '#ffb13d' }} />
    case '📺': return <Tv {...iconProps} style={{ color: '#ff5f9e' }} />
    case '🖥': return <Monitor {...iconProps} style={{ color: '#5fa3ff' }} />
    case '📶': return <Wifi {...iconProps} style={{ color: '#2fd18b' }} />
    case '🔥': return <Flame {...iconProps} style={{ color: '#ff5f9e' }} />
    case '🌱': return <Droplets {...iconProps} style={{ color: '#2fd18b' }} />
    case '💧': return <Waves {...iconProps} style={{ color: '#5fa3ff' }} />
    case '💨': return <Wind {...iconProps} style={{ color: '#a5b3cd' }} />
    case '📳': return <Activity {...iconProps} style={{ color: '#ffb13d' }} />
    case '🔌': return <Cpu {...iconProps} style={{ color: '#a5b3cd' }} />
    
    // logic flows
    case '↩': return <StopCircle {...iconProps} style={{ color: '#ff5f9e' }} />
    case '▶': return <PlayCircle {...iconProps} style={{ color: '#2fd18b' }} />
    case '◇': return <HelpCircle {...iconProps} style={{ color: '#ffb13d' }} />
    case '↻': return <RotateCw {...iconProps} style={{ color: '#ff5f9e' }} />
    case '⏱': return <Timer {...iconProps} style={{ color: '#a5b3cd' }} />
    case 'x=': return <Binary {...iconProps} style={{ color: '#5fa3ff' }} />
    case 'ƒ()': return <Braces {...iconProps} style={{ color: '#ff5f9e' }} />
    case 'call()': return <PlayCircle {...iconProps} style={{ color: '#5fa3ff' }} />
    case '»': return <Printer {...iconProps} style={{ color: '#2fd18b' }} />
    case '←': return <Type {...iconProps} style={{ color: '#5fa3ff' }} />
    case '≋': return <Activity {...iconProps} style={{ color: '#2fd18b' }} />
    case '⇌': return <Network {...iconProps} style={{ color: '#ff5f9e' }} />
    
    default: return <GripVertical {...iconProps} />
  }
}

export default function Sidebar() {
  const { activeCanvas, activeSidebarPanel } = useFlowStore()
  const [search, setSearch] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  // Dynamically load components from registry
  const schemaComponents = useMemo(() => {
    const components = getAllComponents()
    const categoriesMap: Record<string, { section: string, nodes: any[] }> = {
      sensor: { section: 'Sensors', nodes: [] },
      actuator: { section: 'Actuators', nodes: [] },
      motor_driver: { section: 'Motor Drivers', nodes: [] },
      display: { section: 'Display', nodes: [] },
      communication: { section: 'Comms', nodes: [] }
    }

    components.forEach(comp => {
      const cat = categoriesMap[comp.category] || { section: comp.category, nodes: [] }
      cat.nodes.push({
        id: comp.id,
        label: comp.name,
        icon: comp.icon || '🔌',
        componentType: comp.category,
        pins: comp.pins,
        definition: comp
      })
    })

    return [
      categoriesMap.sensor,
      categoriesMap.actuator,
      categoriesMap.motor_driver,
      categoriesMap.display,
      categoriesMap.communication
    ].filter(Boolean).filter(section => section.nodes.length > 0)
  }, [])

  const rawList = activeCanvas === 'schema' ? schemaComponents : NODE_TYPES

  // Filter list by search query
  const filteredList = useMemo(() => {
    if (!search.trim()) return rawList
    const query = search.toLowerCase()
    return rawList.map(section => {
      const matchingNodes = section.nodes.filter(
        (node: any) => node.label.toLowerCase().includes(query) || 
                (node.nodeType && node.nodeType.toLowerCase().includes(query)) ||
                (node.componentType && node.componentType.toLowerCase().includes(query))
      )
      return { ...section, nodes: matchingNodes }
    }).filter(section => section.nodes.length > 0)
  }, [search, rawList])

  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }

  const onDragStart = useCallback((e: React.DragEvent, nodeConfig: any) => {
    const type = activeCanvas === 'schema' ? 'schemaComponent' : 'flowNode'
    const payload = JSON.stringify({ ...nodeConfig, canvasType: type })
    e.dataTransfer.setData('application/schemanode', payload)
    e.dataTransfer.setData('application/flownode', payload)
    e.dataTransfer.effectAllowed = 'move'
  }, [activeCanvas])

  if (activeSidebarPanel === 'explorer') {
    return (
      <div style={{
        width: 220,
        height: '100%',
        background: 'var(--color-bg-panel)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        <ProjectExplorer />
      </div>
    )
  }

  return (
    <div style={{
      width: 220,
      height: '100%',
      background: 'var(--color-bg-panel)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* Search Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-header)',
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search className="w-3.5 h-3.5 text-[#555] absolute left-2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeCanvas === 'schema' ? 'Search components...' : 'Search nodes...'}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.25)',
              border: 'none',
              borderRadius: 4,
              padding: '5px 8px 5px 26px',
              fontSize: 11,
              color: 'var(--color-text-bright)',
              outline: 'none',
              transition: 'all 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-border-focus)' }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                background: 'transparent',
                border: 'none',
                color: '#555',
                fontSize: 10,
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#888'}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Nodes list container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 0 20px',
      }}>
        {filteredList.map((section: any) => {
          const isCollapsed = collapsedSections[section.section]
          return (
            <div key={section.section} style={{ marginBottom: 6 }}>
              {/* Collapsible Section Header */}
              <div 
                onClick={() => toggleSection(section.section)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px 6px',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '1px',
                  color: 'var(--color-text-dim)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-normal)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-dim)'}
              >
                <span>{section.section}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-[#555]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#555]" />
                )}
              </div>

              {/* Section Nodes */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {section.nodes.map((node: any) => (
                    <div
                      key={node.label}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        margin: '1px 6px',
                        borderRadius: 4,
                        cursor: 'grab',
                        fontSize: 11.5,
                        color: 'var(--color-text-normal)',
                        transition: 'all 0.1s ease-in-out',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                        e.currentTarget.style.color = 'var(--color-text-bright)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--color-text-normal)'
                      }}
                    >
                      {/* Drag Grip handle */}
                      <GripVertical className="w-3.5 h-3.5 text-[#444] opacity-40 mr-[-2px] flex-shrink-0" />
                      
                      {/* Icon */}
                      <div className="flex-shrink-0 flex items-center justify-center">
                        {getLucideIcon(node.icon)}
                      </div>

                      {/* Node Label */}
                      <span className="truncate">{node.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {filteredList.length === 0 && (
          <div style={{
            padding: '24px 12px',
            fontSize: 11,
            color: 'var(--color-text-dim)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            No matches found
          </div>
        )}
      </div>
    </div>
  )
}