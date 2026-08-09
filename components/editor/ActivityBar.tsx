'use client'

import { useFlowStore } from '@/store/userFlowStore'
import { 
  LayoutGrid, 
  Network, 
  Code2, 
  Package, 
  LineChart, 
  Settings
} from 'lucide-react'

export default function ActivityBar() {
  const { activeSidebarPanel, toggleSidebarPanel, showSidebar } = useFlowStore()

  const items = [
    {
      id: 'explorer' as const,
      label: 'Explorer',
      icon: LayoutGrid,
      enabled: true,
    },
    {
      id: 'components' as const,
      label: 'Components Palette',
      icon: Network,
      enabled: true,
    },
    {
      id: 'code' as const,
      label: 'Logic & AST Compiler',
      icon: Code2,
      enabled: false,
    },
    {
      id: 'packages' as const,
      label: 'Package Manager',
      icon: Package,
      enabled: false,
    },
    {
      id: 'simulation' as const,
      label: 'Hardware Simulation',
      icon: LineChart,
      enabled: false,
    },
    {
      id: 'settings' as const,
      label: 'Project Settings',
      icon: Settings,
      enabled: false,
    },
  ]

  return (
    <div
      style={{
        width: 48,
        height: '100%',
        background: '#12141a',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 8,
        paddingBottom: 12,
        userSelect: 'none',
        zIndex: 20,
      }}
    >
      {/* Top Main Navigation Items */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = showSidebar && activeSidebarPanel === item.id

          return (
            <div
              key={item.id}
              title={item.label}
              onClick={() => {
                if (item.enabled && (item.id === 'explorer' || item.id === 'components')) {
                  toggleSidebarPanel(item.id)
                }
              }}
              style={{
                width: 48,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: item.enabled ? 'pointer' : 'default',
                opacity: item.enabled ? 1 : 0.4,
                color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-dim)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (item.enabled && !isActive) {
                  e.currentTarget.style.color = 'var(--color-text-bright)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                }
              }}
              onMouseLeave={(e) => {
                if (item.enabled && !isActive) {
                  e.currentTarget.style.color = 'var(--color-text-dim)'
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {/* Active Indicator Strip on Left */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 2,
                    background: 'var(--color-accent-blue)',
                    borderRadius: '0 2px 2px 0',
                    boxShadow: '0 0 8px var(--color-accent-blue)',
                  }}
                />
              )}

              <Icon className="w-5 h-5" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
