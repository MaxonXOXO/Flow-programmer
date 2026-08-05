'use client'

import { useState } from 'react'
import { useFlowStore } from '@/store/userFlowStore'
import { 
  ChevronDown, 
  ChevronRight, 
  FolderTree, 
  Cpu, 
  Zap, 
  Braces, 
  Package, 
  Settings, 
  FileCode, 
  FileText, 
  FileJson, 
  Lock, 
  Layers 
} from 'lucide-react'

export default function ProjectExplorer() {
  const {
    project,
    schemaNodes,
    flowNodes,
    subFlows,
    componentPackages,
    documents,
    activeDocumentId,
    openDocument,
    setActiveDocument,
  } = useFlowStore()

  // Section collapse states
  const [sections, setSections] = useState({
    hardware: true,
    logic: true,
    functions: true,
    components: true,
    generated: true,
  })

  const toggleSection = (key: keyof typeof sections) => {
    setSections(s => ({ ...s, [key]: !s[key] }))
  }

  // Derive function nodes dynamically from main flow and subflows
  const functionNodes: Array<{ id: string; name: string }> = []
  const seenIds = new Set<string>()

  // Search flowNodes
  flowNodes.forEach(node => {
    if ((node.data as any)?.nodeType === 'function') {
      const name = (node.data as any)?.params?.name || (node.data as any)?.label || 'function'
      const cleanName = String(name).replace(/\(\)$/, '')
      functionNodes.push({ id: node.id, name: cleanName })
      seenIds.add(node.id)
    }
  })

  // Search subFlows
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
  const hardwareComponents = schemaNodes.filter(n => n.type !== 'unoNode')

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
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          fontSize: 10,
          fontWeight: 800,
          color: 'var(--color-text-dim)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        Explorer
      </div>

      {/* Tree View Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 0',
          scrollbarWidth: 'thin',
        }}
      >
        {/* Root Project Item */}
        <div
          style={{
            padding: '4px 8px 4px 12px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-bright)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}
        >
          <FolderTree className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>{project?.name || 'Smart Monitor'}</span>
          <span style={{ fontSize: 9, color: 'var(--color-text-dim)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
            {project?.platform.toUpperCase() || 'ARDUINO'}
          </span>
        </div>

        {/* ==========================================
            1. HARDWARE SECTION
        ========================================== */}
        <TreeSectionHeader
          title="Hardware"
          icon={<Cpu className="w-3.5 h-3.5 text-[#60a5fa]" />}
          expanded={sections.hardware}
          onToggle={() => toggleSection('hardware')}
        />
        {sections.hardware && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Board Node */}
            <TreeItem
              title="Arduino Uno"
              icon={<Cpu className="w-3.5 h-3.5 text-[#60a5fa]" />}
              isActive={activeDocumentId === 'schema'}
              onClick={() => {
                openDocument({
                  id: 'schema',
                  title: 'Schema Designer',
                  type: 'schema',
                  closable: false,
                })
              }}
              depth={2}
            />
            {/* Connected Hardware Components */}
            {hardwareComponents.map(comp => {
              const label = (comp.data as any)?.label || comp.id
              return (
                <TreeItem
                  key={comp.id}
                  title={label}
                  icon={<Layers className="w-3.5 h-3.5 text-[#38bdf8]" />}
                  isActive={false}
                  onClick={() => {
                    openDocument({
                      id: 'schema',
                      title: 'Schema Designer',
                      type: 'schema',
                      closable: false,
                    })
                  }}
                  depth={2}
                />
              )
            })}
          </div>
        )}

        {/* ==========================================
            2. LOGIC SECTION
        ========================================== */}
        <TreeSectionHeader
          title="Logic"
          icon={<Zap className="w-3.5 h-3.5 text-[#f59e0b]" />}
          expanded={sections.logic}
          onToggle={() => toggleSection('logic')}
        />
        {sections.logic && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TreeItem
              title="Main Flow"
              icon={<Zap className="w-3.5 h-3.5 text-[#f59e0b]" />}
              isActive={activeDocumentId === 'main_flow'}
              onClick={() => {
                openDocument({
                  id: 'main_flow',
                  title: 'Main Flow',
                  type: 'flow',
                  closable: false,
                })
              }}
              depth={2}
            />
          </div>
        )}

        {/* ==========================================
            3. SUBFLOWS (FUNCTIONS) SECTION
        ========================================== */}
        <TreeSectionHeader
          title="Subflows"
          icon={<Braces className="w-3.5 h-3.5 text-[#a855f7]" />}
          expanded={sections.functions}
          onToggle={() => toggleSection('functions')}
          badge={functionNodes.length}
        />
        {sections.functions && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {functionNodes.length === 0 ? (
              <div style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4, color: 'var(--color-text-dim)', fontSize: 10, fontStyle: 'italic' }}>
                No subflows defined
              </div>
            ) : (
              functionNodes.map(fn => {
                const docId = `subflow_${fn.id}`
                const isActive = activeDocumentId === docId
                return (
                  <TreeItem
                    key={fn.id}
                    title={`${fn.name}()`}
                    icon={<Braces className="w-3.5 h-3.5 text-[#a855f7]" />}
                    isActive={isActive}
                    onClick={() => {
                      openDocument({
                        id: docId,
                        title: `ƒ ${fn.name}`,
                        type: 'function',
                        targetId: fn.id,
                      })
                    }}
                    depth={2}
                  />
                )
              })
            )}
          </div>
        )}

        {/* ==========================================
            4. PACKAGES SECTION
        ========================================== */}
        <TreeSectionHeader
          title="Packages"
          icon={<Package className="w-3.5 h-3.5 text-[#3b82f6]" />}
          expanded={sections.components}
          onToggle={() => toggleSection('components')}
          badge={packageList.length}
        />
        {sections.components && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {packageList.length === 0 ? (
              <div style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4, color: 'var(--color-text-dim)', fontSize: 10 }}>
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
                    icon={<Package className="w-3.5 h-3.5 text-[#3b82f6]" />}
                    isActive={isActive}
                    onClick={() => {
                      openDocument({
                        id: docId,
                        title: `📦 ${pkg.name}`,
                        type: 'subflow',
                        targetId: pkg.id,
                      })
                    }}
                    depth={2}
                  />
                )
              })
            )}
          </div>
        )}

        {/* ==========================================
            5. GENERATED CODE SECTION (READ-ONLY)
        ========================================== */}
        <TreeSectionHeader
          title="Generated"
          icon={<Settings className="w-3.5 h-3.5 text-[#f97316]" />}
          expanded={sections.generated}
          onToggle={() => toggleSection('generated')}
        />
        {sections.generated && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TreeItem
              title="sketch.ino"
              icon={<FileCode className="w-3.5 h-3.5 text-[#f97316]" />}
              badgeText="Generated"
              isActive={activeDocumentId === 'code_sketch'}
              onClick={() => {
                openDocument({
                  id: 'code_sketch',
                  title: '<> sketch.ino',
                  type: 'code',
                  closable: true,
                })
              }}
              depth={2}
            />
            <TreeItem
              title="wiring.md"
              icon={<FileText className="w-3.5 h-3.5 text-[#38bdf8]" />}
              badgeText="Generated"
              isActive={activeDocumentId === 'code_wiring'}
              onClick={() => {
                openDocument({
                  id: 'code_wiring',
                  title: '📄 wiring.md',
                  type: 'code',
                  closable: true,
                })
              }}
              depth={2}
            />
            <TreeItem
              title="pinmap.json"
              icon={<FileJson className="w-3.5 h-3.5 text-[#a855f7]" />}
              badgeText="Generated"
              isActive={activeDocumentId === 'code_pinmap'}
              onClick={() => {
                openDocument({
                  id: 'code_pinmap',
                  title: '⚙ pinmap.json',
                  type: 'code',
                  closable: true,
                })
              }}
              depth={2}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TreeSectionHeader({
  title,
  icon,
  expanded,
  onToggle,
  badge,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: number
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px 5px 12px',
        cursor: 'pointer',
        fontWeight: 600,
        color: 'var(--color-text-normal)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center' }}>
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </span>
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-bright)' }}>{title}</span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--color-text-dim)',
            padding: '0 5px',
            borderRadius: 8,
            marginLeft: 'auto',
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
  onClick,
  depth = 1,
}: {
  title: string
  icon: React.ReactNode
  badgeText?: string
  isActive: boolean
  onClick: () => void
  depth?: number
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 12 + depth * 10,
        paddingRight: 8,
        cursor: 'pointer',
        background: isActive ? 'rgba(96, 165, 250, 0.12)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--color-accent-blue)' : '2px solid transparent',
        color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-normal)',
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
      <span style={{ display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {title}
      </span>
      {badgeText && (
        <span
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            color: 'var(--color-text-dim)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0 4px',
            borderRadius: 3,
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Lock className="w-2.5 h-2.5" />
          <span>{badgeText}</span>
        </span>
      )}
    </div>
  )
}
