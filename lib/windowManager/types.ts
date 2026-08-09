export type DockPosition = 'left' | 'right' | 'bottom' | 'float'

export type PanelId = 'sidebar' | 'properties'

export interface PanelState {
  id: PanelId
  title: string
  dockPosition: DockPosition
  isVisible: boolean
  /** Current width in pixels (used for left/right docked & float) */
  width: number
  /** Current height in pixels (used for bottom docked & float) */
  height: number
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
  /** Float-specific X position (px from left of viewport) */
  floatX: number
  /** Float-specific Y position (px from top of viewport) */
  floatY: number
  /** Z-index for floating panels */
  zIndex: number
}

export interface DragState {
  panelId: PanelId
  type: 'move' | 'resize'
  /** Resize edge/corner being dragged */
  resizeEdge?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  startMouseX: number
  startMouseY: number
  startPanelX: number
  startPanelY: number
  startWidth: number
  startHeight: number
}

export type DockZone = 'left' | 'right' | 'bottom' | null

export const LAYOUT_VERSION = 1

export const DEFAULT_PANELS: Record<PanelId, PanelState> = {
  sidebar: {
    id: 'sidebar',
    title: 'Explorer',
    dockPosition: 'left',
    isVisible: true,
    width: 220,
    height: 300,
    minWidth: 180,
    minHeight: 150,
    maxWidth: 500,
    maxHeight: 600,
    floatX: 60,
    floatY: 80,
    zIndex: 500,
  },
  properties: {
    id: 'properties',
    title: 'Properties',
    dockPosition: 'right',
    isVisible: true,
    width: 280,
    height: 300,
    minWidth: 220,
    minHeight: 150,
    maxWidth: 500,
    maxHeight: 600,
    floatX: 800,
    floatY: 80,
    zIndex: 501,
  },
}

/** Distance in px from viewport edge to trigger dock snap */
export const DOCK_SNAP_THRESHOLD = 40
