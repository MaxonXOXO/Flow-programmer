'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePanelStore } from '@/store/usePanelStore'
import { PanelId, DOCK_SNAP_THRESHOLD, DockPosition } from '@/lib/windowManager/types'
import {
  X,
  GripHorizontal,
  Pin,
  PinOff,
  PanelLeft,
  PanelRight,
  PanelBottom,
} from 'lucide-react'

interface DockablePanelProps {
  id: PanelId
  children: ReactNode
}

/**
 * Wrapper that renders child content as either a docked inline panel
 * (left, right, or bottom) or a floating window, based on panel store state.
 * Includes strict listener cleanup and edge snap detection.
 */
export default function DockablePanel({ id, children }: DockablePanelProps) {
  const panel = usePanelStore((s) => s.panels[id])
  const floatPanel = usePanelStore((s) => s.floatPanel)
  const dockPanel = usePanelStore((s) => s.dockPanel)
  const togglePanel = usePanelStore((s) => s.togglePanel)
  const moveFloat = usePanelStore((s) => s.moveFloat)
  const resizeFloat = usePanelStore((s) => s.resizeFloat)
  const bringToFront = usePanelStore((s) => s.bringToFront)
  const startDrag = usePanelStore((s) => s.startDrag)
  const endDrag = usePanelStore((s) => s.endDrag)
  const setActiveDockZone = usePanelStore((s) => s.setActiveDockZone)

  const titleBarRef = useRef<HTMLDivElement>(null)
  const [isHoveringTitleBar, setIsHoveringTitleBar] = useState(false)
  const [showDockMenu, setShowDockMenu] = useState(false)
  const activeCleanupRef = useRef<(() => void) | null>(null)

  // Ensure active drag listeners are cleaned up if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (activeCleanupRef.current) {
        activeCleanupRef.current()
        activeCleanupRef.current = null
      }
    }
  }, [])

  if (!panel.isVisible) return null

  const isFloating = panel.dockPosition === 'float'
  const isBottom = panel.dockPosition === 'bottom'

  // ─── Title Bar Drag (float move / undock) ─────────────────────
  const handleTitleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDockMenu(false)

    if (isFloating) {
      bringToFront(id)
      const startX = e.clientX
      const startY = e.clientY
      const startPX = panel.floatX
      const startPY = panel.floatY

      startDrag({
        panelId: id,
        type: 'move',
        startMouseX: startX,
        startMouseY: startY,
        startPanelX: startPX,
        startPanelY: startPY,
        startWidth: panel.width,
        startHeight: panel.height,
      })

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const newX = startPX + dx
        const newY = startPY + dy
        moveFloat(id, newX, newY)

        // Check dock snap zones
        if (ev.clientX < DOCK_SNAP_THRESHOLD + 48) {
          setActiveDockZone('left')
        } else if (ev.clientX > window.innerWidth - DOCK_SNAP_THRESHOLD) {
          setActiveDockZone('right')
        } else if (ev.clientY > window.innerHeight - DOCK_SNAP_THRESHOLD - 22) {
          setActiveDockZone('bottom')
        } else {
          setActiveDockZone(null)
        }
      }

      const cleanup = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        activeCleanupRef.current = null
      }

      const handleMouseUp = (ev: MouseEvent) => {
        cleanup()

        // Check dock snap target on release
        if (ev.clientX < DOCK_SNAP_THRESHOLD + 48) {
          dockPanel(id, 'left')
        } else if (ev.clientX > window.innerWidth - DOCK_SNAP_THRESHOLD) {
          dockPanel(id, 'right')
        } else if (ev.clientY > window.innerHeight - DOCK_SNAP_THRESHOLD - 22) {
          dockPanel(id, 'bottom')
        }

        endDrag()
      }

      activeCleanupRef.current = cleanup
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    } else {
      // Undock: start dragging docked panel to float
      const startX = e.clientX
      const startY = e.clientY
      let hasMoved = false

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = Math.abs(ev.clientX - startX)
        const dy = Math.abs(ev.clientY - startY)

        if (!hasMoved && (dx > 20 || dy > 20)) {
          hasMoved = true
          document.body.style.cursor = 'grabbing'
          document.body.style.userSelect = 'none'

          floatPanel(id, ev.clientX - 100, ev.clientY - 15)

          startDrag({
            panelId: id,
            type: 'move',
            startMouseX: ev.clientX,
            startMouseY: ev.clientY,
            startPanelX: ev.clientX - 100,
            startPanelY: ev.clientY - 15,
            startWidth: panel.width,
            startHeight: panel.height,
          })
        }

        if (hasMoved) {
          const newX = ev.clientX - 100
          const newY = ev.clientY - 15
          moveFloat(id, newX, newY)

          if (ev.clientX < DOCK_SNAP_THRESHOLD + 48) {
            setActiveDockZone('left')
          } else if (ev.clientX > window.innerWidth - DOCK_SNAP_THRESHOLD) {
            setActiveDockZone('right')
          } else if (ev.clientY > window.innerHeight - DOCK_SNAP_THRESHOLD - 22) {
            setActiveDockZone('bottom')
          } else {
            setActiveDockZone(null)
          }
        }
      }

      const cleanup = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        activeCleanupRef.current = null
      }

      const handleMouseUp = (ev: MouseEvent) => {
        cleanup()

        if (hasMoved) {
          if (ev.clientX < DOCK_SNAP_THRESHOLD + 48) {
            dockPanel(id, 'left')
          } else if (ev.clientX > window.innerWidth - DOCK_SNAP_THRESHOLD) {
            dockPanel(id, 'right')
          } else if (ev.clientY > window.innerHeight - DOCK_SNAP_THRESHOLD - 22) {
            dockPanel(id, 'bottom')
          }
        }

        endDrag()
      }

      activeCleanupRef.current = cleanup
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
  }

  // ─── Float Resize (edge/corner drag) ─────────────────────────
  const handleResizeMouseDown = (e: React.MouseEvent, edge: string) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const startW = panel.width
    const startH = panel.height
    const startPX = panel.floatX
    const startPY = panel.floatY

    document.body.style.cursor =
      edge.includes('left') || edge.includes('right')
        ? (edge.includes('top') || edge.includes('bottom') ? `${edge}-resize` : 'ew-resize')
        : 'ns-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      let newW = startW
      let newH = startH
      let newX = startPX
      let newY = startPY

      if (edge.includes('right')) newW = startW + dx
      if (edge.includes('left')) {
        newW = startW - dx
        newX = startPX + dx
      }
      if (edge.includes('bottom')) newH = startH + dy
      if (edge.includes('top')) {
        newH = startH - dy
        newY = startPY + dy
      }

      newW = Math.max(panel.minWidth, Math.min(panel.maxWidth, newW))
      newH = Math.max(panel.minHeight, Math.min(panel.maxHeight, newH))

      if (edge.includes('left') && newW === panel.minWidth) {
        newX = startPX + startW - panel.minWidth
      }
      if (edge.includes('top') && newH === panel.minHeight) {
        newY = startPY + startH - panel.minHeight
      }

      resizeFloat(id, newW, newH)
      if (edge.includes('left') || edge.includes('top')) {
        moveFloat(id, newX, newY)
      }
    }

    const cleanup = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      activeCleanupRef.current = null
    }

    const handleMouseUp = () => {
      cleanup()
      endDrag()
    }

    activeCleanupRef.current = cleanup
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // ─── Render: Docked (Left, Right, or Bottom) ─────────────────
  if (!isFloating) {
    const containerStyle: React.CSSProperties = isBottom
      ? {
          width: '100%',
          height: panel.height,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }
      : {
          width: panel.width,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }

    return (
      <div style={containerStyle}>
        {/* Docked Title Bar */}
        <div
          ref={titleBarRef}
          onMouseDown={handleTitleMouseDown}
          onMouseEnter={() => setIsHoveringTitleBar(true)}
          onMouseLeave={() => setIsHoveringTitleBar(false)}
          style={{
            height: 30,
            background: '#12141a',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 0 10px',
            cursor: 'grab',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GripHorizontal
              className="w-3 h-3"
              style={{
                color: 'var(--color-text-dim)',
                opacity: isHoveringTitleBar ? 0.7 : 0.3,
                transition: 'opacity 0.15s',
              }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.8px',
              color: 'var(--color-text-dim)',
              textTransform: 'uppercase',
            }}>
              {panel.title} ({panel.dockPosition})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
            {/* Detach / Float button */}
            <button
              title="Detach to floating window"
              onClick={(e) => {
                e.stopPropagation()
                const rect = titleBarRef.current?.getBoundingClientRect()
                floatPanel(
                  id,
                  rect ? rect.left : 200,
                  rect ? rect.top : 100,
                )
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                padding: 3,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isHoveringTitleBar ? 1 : 0,
                transition: 'opacity 0.15s, background 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.color = 'var(--color-text-bright)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-dim)'
              }}
            >
              <PinOff className="w-3 h-3" />
            </button>

            {/* Close button */}
            <button
              title="Close panel"
              onClick={(e) => {
                e.stopPropagation()
                togglePanel(id)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-dim)',
                cursor: 'pointer',
                padding: 3,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isHoveringTitleBar ? 1 : 0,
                transition: 'opacity 0.15s, background 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 95, 95, 0.2)'
                e.currentTarget.style.color = '#ef5f5f'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-dim)'
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    )
  }

  // ─── Render: Floating ────────────────────────────────────────
  const floatEl = document.getElementById('flow-ide-float-layer')
  if (!floatEl) return null

  return createPortal(
    <div
      onMouseDown={() => bringToFront(id)}
      style={{
        position: 'fixed',
        left: panel.floatX,
        top: panel.floatY,
        width: panel.width,
        height: panel.height,
        zIndex: panel.zIndex,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(18, 20, 26, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Floating Title Bar */}
      <div
        ref={titleBarRef}
        onMouseDown={handleTitleMouseDown}
        onMouseEnter={() => setIsHoveringTitleBar(true)}
        onMouseLeave={() => setIsHoveringTitleBar(false)}
        style={{
          height: 32,
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px 0 10px',
          cursor: 'grab',
          flexShrink: 0,
          userSelect: 'none',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GripHorizontal className="w-3 h-3 text-[#777] opacity-60" />
          <span style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.8px',
            color: 'var(--color-text-normal)',
            textTransform: 'uppercase',
          }}>
            {panel.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
          {/* Dock Target Quick Menu Toggle */}
          <button
            title="Dock Panel Options"
            onClick={(e) => {
              e.stopPropagation()
              setShowDockMenu((v) => !v)
            }}
            style={{
              background: showDockMenu ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              padding: 3,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = 'var(--color-text-bright)'
            }}
            onMouseLeave={(e) => {
              if (!showDockMenu) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-dim)'
              }
            }}
          >
            <Pin className="w-3 h-3" />
          </button>

          {/* Quick Dock Dropdown Menu */}
          {showDockMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 28,
                right: 0,
                background: '#1a1d24',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: 4,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minWidth: 110,
              }}
            >
              <button
                onClick={() => { dockPanel(id, 'left'); setShowDockMenu(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                  background: 'transparent', border: 'none', color: '#ccc', fontSize: 10, cursor: 'pointer',
                  borderRadius: 3, textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <PanelLeft className="w-3 h-3 text-[#3b82f6]" /> Dock Left
              </button>

              <button
                onClick={() => { dockPanel(id, 'right'); setShowDockMenu(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                  background: 'transparent', border: 'none', color: '#ccc', fontSize: 10, cursor: 'pointer',
                  borderRadius: 3, textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <PanelRight className="w-3 h-3 text-[#3b82f6]" /> Dock Right
              </button>

              <button
                onClick={() => { dockPanel(id, 'bottom'); setShowDockMenu(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                  background: 'transparent', border: 'none', color: '#ccc', fontSize: 10, cursor: 'pointer',
                  borderRadius: 3, textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <PanelBottom className="w-3 h-3 text-[#3b82f6]" /> Dock Bottom
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            title="Close panel"
            onClick={(e) => {
              e.stopPropagation()
              togglePanel(id)
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-dim)',
              cursor: 'pointer',
              padding: 3,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 95, 95, 0.2)'
              e.currentTarget.style.color = '#ef5f5f'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-dim)'
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Resize Handles (8-directional) */}
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'right')} style={{ position: 'absolute', top: 8, right: 0, bottom: 8, width: 5, cursor: 'ew-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'left')} style={{ position: 'absolute', top: 8, left: 0, bottom: 8, width: 5, cursor: 'ew-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')} style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: 5, cursor: 'ns-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'top')} style={{ position: 'absolute', top: 0, left: 8, right: 8, height: 5, cursor: 'ns-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')} style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, cursor: 'nwse-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')} style={{ position: 'absolute', bottom: 0, left: 0, width: 10, height: 10, cursor: 'nesw-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')} style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, cursor: 'nesw-resize' }} />
      <div onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')} style={{ position: 'absolute', top: 0, left: 0, width: 10, height: 10, cursor: 'nwse-resize' }} />
    </div>,
    floatEl,
  )
}
