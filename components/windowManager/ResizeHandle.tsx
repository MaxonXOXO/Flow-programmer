'use client'

import { useEffect, useRef } from 'react'
import { usePanelStore } from '@/store/usePanelStore'
import { PanelId } from '@/lib/windowManager/types'

interface ResizeHandleProps {
  panelId: PanelId
  /** Which side of the adjacent area this handle sits on */
  side: 'left' | 'right' | 'bottom'
}

/**
 * A drag handle between a docked panel and adjacent workspace elements.
 * Supports horizontal dragging for left/right docked panels and vertical dragging for bottom docked panels.
 * Features strict React lifecycle listener cleanup to prevent stale listeners on unmount.
 */
export default function ResizeHandle({ panelId, side }: ResizeHandleProps) {
  const panel = usePanelStore((s) => s.panels[panelId])
  const resizeDocked = usePanelStore((s) => s.resizeDocked)
  const dragRef = useRef<{ startPos: number; startDimension: number } | null>(null)
  const activeCleanupRef = useRef<(() => void) | null>(null)

  // Ensure listeners are cleaned up if the component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (activeCleanupRef.current) {
        activeCleanupRef.current()
        activeCleanupRef.current = null
      }
    }
  }, [])

  // Don't render if panel is hidden or floating
  if (!panel.isVisible || panel.dockPosition === 'float') return null

  const isVertical = side === 'left' || side === 'right'

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isVertical) {
      dragRef.current = { startPos: e.clientX, startDimension: panel.width }
      document.body.style.cursor = 'col-resize'
    } else {
      dragRef.current = { startPos: e.clientY, startDimension: panel.height }
      document.body.style.cursor = 'row-resize'
    }
    document.body.style.userSelect = 'none'

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return

      if (isVertical) {
        const delta = ev.clientX - dragRef.current.startPos
        const newWidth = side === 'left'
          ? dragRef.current.startDimension + delta
          : dragRef.current.startDimension - delta
        resizeDocked(panelId, { width: newWidth })
      } else {
        // Bottom handle sits on top of the bottom dock zone: dragging UP (negative delta) increases height
        const delta = ev.clientY - dragRef.current.startPos
        const newHeight = dragRef.current.startDimension - delta
        resizeDocked(panelId, { height: newHeight })
      }
    }

    const cleanup = () => {
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      activeCleanupRef.current = null
    }

    const handleMouseUp = () => {
      cleanup()
    }

    activeCleanupRef.current = cleanup
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  if (isVertical) {
    return (
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          background: 'transparent',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-accent)'
        }}
        onMouseLeave={(e) => {
          if (!dragRef.current) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      />
    )
  }

  // Horizontal handle for bottom docking
  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        height: 4,
        width: '100%',
        cursor: 'row-resize',
        background: 'transparent',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-accent)'
      }}
      onMouseLeave={(e) => {
        if (!dragRef.current) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    />
  )
}
