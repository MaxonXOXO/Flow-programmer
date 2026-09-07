'use client'

import { useState } from 'react'
import { useFlowStore } from '@/store/userFlowStore'
import ArduinoIcon from '@/components/Customkit/ArduinoIcon'
import { getComponentPackageIcon } from '@/lib/registry/components/componentIcon'
import { 
  ChevronDown, 
  ChevronRight, 
  Cpu, 
  Zap, 
  Workflow, 
  Braces, 
  Package, 
  Settings, 
  FileCode, 
  FileText, 
  FileJson, 
  Lock, 
  Layers, 
  Plus, 
  Play, 
  Square, 
  Radio, 
  Terminal, 
  Clock, 
  GitBranch, 
  Binary, 
  Folder, 
  FolderOpen 
} from 'lucide-react'

export default function ProjectExplorer() {
  const {
    project,
    schemaNodes,
    flowNodes,
    subFlows,
    componentPackages,
    activeDocumentId,
    selectedNodeId,
    openDocument,
    focusNodeOnCanvas,
  } = useFlowStore()

  // Section collapse states
  const [sections, setSections] = useState({
    root: true,
    hardware: true,
    logic: true,
    mainFlowNodes: true,
    functions: true,
    packages: true,
    generated: true,
  })

  const [expandedSubflows, setExpandedSubflows] = useState<Record<string, boolean>>({})

  const toggleSection = (key: keyof typeof sections) => {
    setSections(s => ({ ...s, [key]: !s[key] }))
  }

  const toggleSubflow = (id: string) => {
    setExpandedSubflows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Derive function nodes dynamically from main flow and subflows
  const functionNodes: Array<{ id: string; name: string }> = []
  const seenIds = new Set<string>()

  flowNodes.forEach(node => {
    if ((node.data as any)?.nodeType === 'function') {
      const name = (node.data as any)?.params?.name || (node.data as any)?.label || 'function'
      const cleanName = String(name).replace(/\(\)$/, '')
      functionNodes.push({ id: node.id, name: cleanName })
      seenIds.add(node.id)
    }
  })

  Object.keys(subFlows).forEach(sfId => {
    if (!seenIds.has(sfId)) {
      subFlows[sfId].nodes.forEach(node => {
        if ((node.data as any)?.nodeType === 'function' && !seenIds.has(node.id)) {
          const name = (node.data as any)?.params?.name || (node.data as any)?.label || 'function'
          const cleanName = String(name).replace(/\(\)$/, '')
          functionNodes.push({ id: node.id, name: cleanName })
          seenIds.add(node.id)
        }
      })
    }
  })

  // Connected hardware components (exclude board node)
  const hardwareComponents = schemaNodes.filter(n => n.type !== 'unoNode' && n.type !== 'boardNode' && n.id !== 'arduino-uno' && n.id !== 'board')

  // Loaded component packages
  const packageList = Object.values(componentPackages)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg-panel)',
        color: 'var(--color-text-normal)',
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
      }}
    >
      {/* Tree View Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 0',
          scrollbarWidth: 'thin',
        }}
      >
        {/* Project Root Folder */}
        <TreeFolderHeader
          title={project?.name || 'untitled_flow'}
          icon={sections.root ? <FolderOpen className="w-3.5 h-3.5 text-[#eab308]" /> : <Folder className="w-3.5 h-3.5 text-[#eab308]" />}
          expanded={sections.root}
          onToggle={() => toggleSection('root')}
          depth={0}
        />

        {sections.root && (
          <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
            
            {/* ==========================================
                1. HARDWARE (SCHEMATIC)
            ========================================== */}
            <div>
              <TreeFolderHeader
                title="Hardware"
                icon={(!project?.platform || project.platform.toLowerCase().includes('arduino')) ? <ArduinoIcon size={13} color="#00c4b4" /> : <Cpu className="w-3.5 h-3.5 text-[#60a5fa]" />}
                expanded={sections.hardware}
                onToggle={() => toggleSection('hardware')}
                badge={1 + hardwareComponents.length}
                depth={1}
              />
              {sections.hardware && (
                <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {/* Arduino Uno Board Node */}
                  <TreeItem
                    title="Arduino Uno"
                    icon={<ArduinoIcon size={13} color="#00c4b4" />}
                    badgeText="BOARD"
                    isActive={activeDocumentId === 'schema' && (selectedNodeId === 'arduino-uno' || selectedNodeId === 'board')}
                    onClick={() => {
                      openDocument({
                        id: 'schema',
                        title: 'Schema Designer',
                        type: 'schema',
                        closable: false,
                      })
                      focusNodeOnCanvas('arduino-uno')
                    }}
                  />

                  {/* Connected Hardware Components */}
                  {hardwareComponents.map(comp => {
                    const label = (comp.data as any)?.label || comp.id
                    const badge = (comp.data as any)?.category || (comp.data as any)?.type || 'SENSOR'
                    const isSelected = activeDocumentId === 'schema' && selectedNodeId === comp.id
                    return (
                      <TreeItem
                        key={comp.id}
                        title={label}
                        icon={getComponentPackageIcon(comp, {
                          className: 'w-3.5 h-3.5',
                          color: '#2fd18b',
                          fallback: <Layers className="w-3.5 h-3.5 text-[#64748b]" />
                        })}
                        badgeText={String(badge).toUpperCase()}
                        isActive={isSelected}
                        onClick={() => {
                          openDocument({
                            id: 'schema',
                            title: 'Schema Designer',
                            type: 'schema',
                            closable: false,
                          })
                          focusNodeOnCanvas(comp.id)
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* ==========================================
                2. LOGIC (FLOWS & NODES)
            ========================================== */}
            <div style={{ marginTop: 2 }}>
              <TreeFolderHeader
                title="Logic"
                icon={<Workflow className="w-3.5 h-3.5 text-[#f59e0b]" />}
                expanded={sections.logic}
                onToggle={() => toggleSection('logic')}
                depth={1}
              />
              {sections.logic && (
                <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {/* Main Flow Header / Item */}
                  <TreeItem
                    title="Main Flow"
                    icon={<Zap className="w-3.5 h-3.5 text-[#f59e0b]" />}
                    isActive={activeDocumentId === 'main_flow' && !selectedNodeId}
                    expandable={flowNodes.length > 0}
                    expanded={sections.mainFlowNodes}
                    onExpandToggle={() => toggleSection('mainFlowNodes')}
                    onClick={() => {
                      openDocument({
                        id: 'main_flow',
                        title: 'Main Flow',
                        type: 'flow',
                        closable: false,
                      })
                    }}
                  />

                  {/* Nested Main Flow Nodes */}
                  {sections.mainFlowNodes && flowNodes.length > 0 && (
                    <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      {flowNodes.map(node => {
                        const label = (node.data as any)?.label || (node.data as any)?.params?.name || node.id
                        const badge = getFlowNodeBadge(node)
                        const icon = getFlowNodeIcon(node)
                        const isSelected = activeDocumentId === 'main_flow' && selectedNodeId === node.id

                        return (
                          <TreeItem
                            key={node.id}
                            title={label}
                            icon={icon}
                            badgeText={badge}
                            isActive={isSelected}
                            onClick={() => {
                              openDocument({
                                id: 'main_flow',
                                title: 'Main Flow',
                                type: 'flow',
                                closable: false,
                              })
                              focusNodeOnCanvas(node.id)
                            }}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==========================================
                3. SUBFLOWS (FUNCTIONS)
            ========================================== */}
            <div style={{ marginTop: 2 }}>
              <TreeFolderHeader
                title="Subflows"
                icon={<Braces className="w-3.5 h-3.5 text-[#a855f7]" />}
                expanded={sections.functions}
                onToggle={() => toggleSection('functions')}
                badge={functionNodes.length}
                depth={1}
              />
              {sections.functions && (
                <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {functionNodes.length === 0 ? (
                    <div style={{ padding: '3px 8px', color: 'var(--color-text-dim)', fontSize: 10, fontStyle: 'italic' }}>
                      (No subflows defined)
                    </div>
                  ) : (
                    functionNodes.map(fn => {
                      const docId = `subflow_${fn.id}`
                      const isActive = activeDocumentId === docId && !selectedNodeId
                      const subflowData = subFlows[fn.id]
                      const childNodes = subflowData?.nodes || []
                      const isExpanded = Boolean(expandedSubflows[fn.id])

                      return (
                        <div key={fn.id}>
                          <TreeItem
                            title={`${fn.name}()`}
                            icon={<Braces className="w-3.5 h-3.5 text-[#a855f7]" />}
                            isActive={isActive}
                            badgeText="FUNC"
                            expandable={childNodes.length > 0}
                            expanded={isExpanded}
                            onExpandToggle={() => toggleSubflow(fn.id)}
                            onClick={() => {
                              openDocument({
                                id: docId,
                                title: `${fn.name}()`,
                                type: 'function',
                                targetId: fn.id,
                              })
                            }}
                          />

                          {/* Subflow Child Nodes */}
                          {isExpanded && childNodes.length > 0 && (
                            <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              {childNodes.map(cn => {
                                const label = (cn.data as any)?.label || (cn.data as any)?.params?.name || cn.id
                                const badge = getFlowNodeBadge(cn)
                                const icon = getFlowNodeIcon(cn)
                                const isChildSelected = activeDocumentId === docId && selectedNodeId === cn.id

                                return (
                                  <TreeItem
                                    key={cn.id}
                                    title={label}
                                    icon={icon}
                                    badgeText={badge}
                                    isActive={isChildSelected}
                                    onClick={() => {
                                      openDocument({
                                        id: docId,
                                        title: `${fn.name}()`,
                                        type: 'function',
                                        targetId: fn.id,
                                      })
                                      focusNodeOnCanvas(cn.id)
                                    }}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* ==========================================
                4. PACKAGES
            ========================================== */}
            <div style={{ marginTop: 2 }}>
              <TreeFolderHeader
                title="Packages"
                icon={<Package className="w-3.5 h-3.5 text-[#3b82f6]" />}
                expanded={sections.packages}
                onToggle={() => toggleSection('packages')}
                badge={packageList.length}
                depth={1}
              />
              {sections.packages && (
                <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {packageList.length === 0 ? (
                    <div style={{ padding: '3px 8px', color: 'var(--color-text-dim)', fontSize: 10 }}>
                      (Standard Libraries)
                    </div>
                  ) : (
                    packageList.map(pkg => {
                      const docId = `pkg_${pkg.id}`
                      const isActive = activeDocumentId === docId
                      return (
                        <TreeItem
                          key={pkg.id}
                          title={pkg.name}
                          icon={getComponentPackageIcon(pkg, {
                            className: 'w-3.5 h-3.5',
                            color: '#38bdf8',
                            fallback: <Package className="w-3.5 h-3.5 text-[#3b82f6]" />
                          })}
                          badgeText="FLOWPLG"
                          isActive={isActive}
                          onClick={() => {
                            openDocument({
                              id: docId,
                              title: pkg.name,
                              type: 'subflow',
                              targetId: pkg.id,
                            })
                          }}
                        />
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* ==========================================
                5. GENERATED FILES
            ========================================== */}
            <div style={{ marginTop: 2 }}>
              <TreeFolderHeader
                title="Generated"
                icon={<Settings className="w-3.5 h-3.5 text-[#f97316]" />}
                expanded={sections.generated}
                onToggle={() => toggleSection('generated')}
                depth={1}
              />
              {sections.generated && (
                <div style={{ marginLeft: 10, paddingLeft: 4, borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <TreeItem
                    title="sketch.ino"
                    icon={<FileCode className="w-3.5 h-3.5 text-[#f97316]" />}
                    badgeText="C++"
                    isActive={activeDocumentId === 'code_sketch'}
                    onClick={() => {
                      openDocument({
                        id: 'code_sketch',
                        title: 'sketch.ino',
                        type: 'code',
                        closable: true,
                      })
                    }}
                  />
                  <TreeItem
                    title="wiring.md"
                    icon={<FileText className="w-3.5 h-3.5 text-[#38bdf8]" />}
                    badgeText="MD"
                    isActive={activeDocumentId === 'code_wiring'}
                    onClick={() => {
                      openDocument({
                        id: 'code_wiring',
                        title: 'wiring.md',
                        type: 'code',
                        closable: true,
                      })
                    }}
                  />
                  <TreeItem
                    title="pinmap.json"
                    icon={<FileJson className="w-3.5 h-3.5 text-[#a855f7]" />}
                    badgeText="JSON"
                    isActive={activeDocumentId === 'code_pinmap'}
                    onClick={() => {
                      openDocument({
                        id: 'code_pinmap',
                        title: 'pinmap.json',
                        type: 'code',
                        closable: true,
                      })
                    }}
                  />
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

function TreeFolderHeader({
  title,
  icon,
  expanded,
  onToggle,
  badge,
  depth = 0,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: number
  depth?: number
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        cursor: 'pointer',
        color: 'var(--color-text-normal)',
        borderRadius: 4,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center' }}>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </span>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ fontSize: 11, fontWeight: depth === 0 ? 700 : 600, color: depth === 0 ? '#f1f5f9' : 'var(--color-text-bright)' }}>
        {title}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--color-text-dim)',
            padding: '1px 5px',
            borderRadius: 8,
            marginLeft: 2,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

function TreeItem({
  title,
  icon,
  badgeText,
  isActive,
  expandable,
  expanded,
  onExpandToggle,
  onClick,
}: {
  title: string
  icon: React.ReactNode
  badgeText?: string
  isActive: boolean
  expandable?: boolean
  expanded?: boolean
  onExpandToggle?: () => void
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        borderRadius: 4,
        cursor: 'pointer',
        background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
        color: isActive ? '#ffffff' : 'var(--color-text-normal)',
        fontWeight: isActive ? 600 : 400,
        fontSize: 11,
        transition: 'all 0.1s ease',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
          e.currentTarget.style.color = 'var(--color-text-bright)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-normal)'
        }
      }}
    >
      {expandable ? (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onExpandToggle?.()
          }}
          style={{
            color: 'var(--color-text-dim)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '1px 2px',
          }}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      ) : (
        <span style={{ width: 12, flexShrink: 0 }} />
      )}

      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </span>

      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {title}
      </span>

      {badgeText && (
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: isActive ? '#93c5fd' : 'var(--color-text-dim)',
            background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
            padding: '1px 4px',
            borderRadius: 3,
            marginLeft: 'auto',
            letterSpacing: '0.4px',
            flexShrink: 0,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {badgeText}
        </span>
      )}
    </div>
  )
}

function getFlowNodeIcon(node: any) {
  const nodeType = String((node.data as any)?.nodeType || '').toLowerCase()
  const label = String((node.data as any)?.label || '').toLowerCase()

  if (nodeType === 'start' || label.includes('start')) {
    return <Play className="w-3 h-3 text-[#10b981]" fill="#10b981" />
  }
  if (nodeType === 'end' || label.includes('end')) {
    return <Square className="w-3 h-3 text-[#f43f5e]" fill="#f43f5e" />
  }
  if (nodeType === 'ultrasonic' || label.includes('ultrasonic')) {
    return <Radio className="w-3 h-3 text-[#10b981]" />
  }
  if (nodeType === 'print' || label.includes('print')) {
    return <Terminal className="w-3 h-3 text-[#06b6d4]" />
  }
  if (nodeType === 'delay' || label.includes('delay')) {
    return <Clock className="w-3 h-3 text-[#f59e0b]" />
  }
  if (nodeType === 'condition' || nodeType === 'if' || label.includes('if')) {
    return <GitBranch className="w-3 h-3 text-[#eab308]" />
  }
  if (nodeType === 'function' || label.includes('function')) {
    return <Braces className="w-3 h-3 text-[#a855f7]" />
  }
  if (nodeType === 'variable' || nodeType === 'calc' || label.includes('var')) {
    return <Binary className="w-3 h-3 text-[#38bdf8]" />
  }
  return <Zap className="w-3 h-3 text-[#60a5fa]" />
}

function getFlowNodeBadge(node: any): string {
  const nodeType = String((node.data as any)?.nodeType || '').toLowerCase()
  const label = String((node.data as any)?.label || '').toLowerCase()

  if (nodeType === 'start' || label.includes('start')) return 'START'
  if (nodeType === 'end' || label.includes('end')) return 'END'
  if (nodeType === 'ultrasonic' || label.includes('ultrasonic')) return 'SENSOR'
  if (nodeType === 'print' || label.includes('print')) return 'PRINT'
  if (nodeType === 'delay' || label.includes('delay')) return 'TIME'
  if (nodeType === 'condition' || nodeType === 'if') return 'LOGIC'
  if (nodeType === 'function') return 'FUNC'
  if (nodeType === 'variable' || nodeType === 'calc') return 'DATA'
  return (node.data as any)?.nodeType ? String((node.data as any).nodeType).toUpperCase() : 'NODE'
}
