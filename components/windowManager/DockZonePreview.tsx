'use client'

import { usePanelStore } from '@/store/usePanelStore'

/**
 * Renders translucent blue highlight target zones at left, right, and bottom edges when a
 * floating panel is being dragged near the viewport edge (dock preview).
 */
export default function DockZonePreview() {
  const activeDockZone = usePanelStore((s) => s.activeDockZone)
  const dragState = usePanelStore((s) => s.dragState)

  // Only show when dragging a panel and near an edge snap zone
  if (!dragState || dragState.type !== 'move' || !activeDockZone) return null

  const isLeft = activeDockZone === 'left'
  const isRight = activeDockZone === 'right'
  const isBottom = activeDockZone === 'bottom'

  return (
    <>
      {isLeft && (
        <div
          style={{
            position: 'fixed',
            top: 40,
            left: 48, // Account for ActivityBar
            width: 220,
            bottom: 22, // Account for StatusBar
            background: 'rgba(59, 130, 246, 0.14)',
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            color: 'rgba(59, 130, 246, 0.8)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Dock Left
          </div>
        </div>
      )}
      {isRight && (
        <div
          style={{
            position: 'fixed',
            top: 40,
            right: 0,
            width: 280,
            bottom: 22,
            background: 'rgba(59, 130, 246, 0.14)',
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            color: 'rgba(59, 130, 246, 0.8)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Dock Right
          </div>
        </div>
      )}
      {isBottom && (
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            left: 48,
            right: 0,
            height: 200,
            background: 'rgba(59, 130, 246, 0.14)',
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            borderBottom: 'none',
            borderRadius: '8px 8px 0 0',
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'opacity 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{
            color: 'rgba(59, 130, 246, 0.8)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Dock Bottom
          </div>
        </div>
      )}
    </>
  )
}
