'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { useState, useCallback, useMemo } from 'react'
import { 
  Search, ChevronDown, ChevronRight, GripVertical, 
  Lightbulb, Square, Thermometer, Radio, Eye, Sun, 
  Settings, Wrench, Volume2, Zap, Tv, Monitor, Wifi, 
  PlayCircle, HelpCircle, RotateCw, Timer, Binary, 
  Braces, Printer, Type, Activity, Network,
  Flame, Droplets, Waves, Wind, Cpu
} from 'lucide-react'

import { getAllComponents } from '@/lib/registry/components'
import { getAllOperations } from '@/lib/registry/operations'

const getDynamicSchemaComponents = () => {
  const all = getAllComponents();
  const sections: Record<string, { section: string; nodes: any[] }> = {
    sensor: { section: 'Sensors', nodes: [] },
    actuator: { section: 'Actuators', nodes: [] },
    display: { section: 'Display', nodes: [] },
    comms: { section: 'Comms', nodes: [] },
  };

  all.forEach(c => {
    const sec = sections[c.category] || sections.sensor;
    sec.nodes.push({
      label: c.name,
      icon: c.icon || '🔌',
      componentType: c.id,
      pins: c.pins.map(p => ({ id: p.id, label: p.label })),
      description: c.description
    });
  });

  return Object.values(sections).filter(s => s.nodes.length > 0);
};

const getDynamicNodeTypes = () => {
  const all = getAllOperations();
  const sections: Record<string, { section: string; nodes: any[] }> = {
    control: { section: 'Control Flow', nodes: [] },
    data: { section: 'Data', nodes: [] },
    io: { section: 'I/O', nodes: [] },
    hardware: { section: 'Hardware', nodes: [] },
  };

  all.forEach(op => {
    const sec = sections[op.category];
    if (sec) {
      const defaultParams: Record<string, string> = {};
      op.parameters.forEach(p => {
        if (p.defaultValue !== undefined) {
          defaultParams[p.id] = p.defaultValue;
        }
      });

      sec.nodes.push({
        type: op.id,
        label: op.name,
        icon: op.icon,
        nodeType: op.id,
        params: defaultParams,
        description: op.description
      });
    }
  });

  return Object.values(sections);
};


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
  const { activeCanvas } = useFlowStore()
  const [search, setSearch] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const rawList = useMemo(() => {
    return activeCanvas === 'schema' ? getDynamicSchemaComponents() : getDynamicNodeTypes()
  }, [activeCanvas])

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
    e.dataTransfer.setData('application/flownode', JSON.stringify({ ...nodeConfig, canvasType: type }))
    e.dataTransfer.effectAllowed = 'move'
  }, [activeCanvas])

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
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '4px 8px 4px 26px',
              fontSize: 11,
              color: 'var(--color-text-bright)',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-border-focus)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
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