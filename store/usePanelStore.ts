'use client'

import { create } from 'zustand'
import {
  PanelId,
  PanelState,
  DockPosition,
  DragState,
  DockZone,
  DEFAULT_PANELS,
  LAYOUT_VERSION,
} from '@/lib/windowManager/types'

const STORAGE_KEY = 'flow-ide-panel-layout-v1'
const LEGACY_STORAGE_KEY = 'flow-ide-panel-layout'

/**
 * Intelligent viewport clamping for floating panels.
 * Ensures panel title bar remains reachable within the current window viewport.
 */

export function clampPanelToViewport(panel: PanelState, vw?: number, vh?: number): PanelState {
  if (panel.dockPosition !== 'float') return panel
  if (typeof window === 'undefined') return panel

  const viewportW = vw || (typeof window !== 'undefined' ? window.innerWidth : 1280)
  const viewportH = vh || (typeof window !== 'undefined' ? window.innerHeight : 800)

  // Title bar height is ~32px, TopBar is ~40px, StatusBar is ~22px
  const minX = 0
  const maxX = Math.max(0, viewportW - Math.min(panel.width, 100))
  const minY = 40 // Below TopBar
  const maxY = Math.max(minY, viewportH - 60) // Above StatusBar with visible title bar

  const clampedX = Math.max(minX, Math.min(maxX, panel.floatX))
  const clampedY = Math.max(minY, Math.min(maxY, panel.floatY))

  return {
    ...panel,
    floatX: clampedX,
    floatY: clampedY,
  }
}

function loadPersistedLayout(): Record<PanelId, PanelState> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === LAYOUT_VERSION && parsed.panels?.sidebar && parsed.panels?.properties) {
        const panels = parsed.panels as Record<PanelId, PanelState>
        // Clamp floating positions against current viewport
        const clamped: Record<PanelId, PanelState> = {
          sidebar: clampPanelToViewport(panels.sidebar),
          properties: clampPanelToViewport(panels.properties),
        }
        return clamped
      }
    }

    // Migration fallback from legacy key if present
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw)
      if (legacyParsed?.sidebar && legacyParsed?.properties) {
        const migratedPanels: Record<PanelId, PanelState> = {
          sidebar: {
            ...DEFAULT_PANELS.sidebar,
            ...legacyParsed.sidebar,
            dockPosition: legacyParsed.sidebar.dockPosition || 'left',
          },
          properties: {
            ...DEFAULT_PANELS.properties,
            ...legacyParsed.properties,
            dockPosition: legacyParsed.properties.dockPosition || 'right',
          },
        }
        migratedPanels.sidebar = clampPanelToViewport(migratedPanels.sidebar)
        migratedPanels.properties = clampPanelToViewport(migratedPanels.properties)
        persistLayout(migratedPanels)
        return migratedPanels
      }
    }
  } catch {
    // Corrupted data, ignore and fallback to default layout
  }
  return null
}

function persistLayout(panels: Record<PanelId, PanelState>) {
  if (typeof window === 'undefined') return
  try {
    const data = {
      version: LAYOUT_VERSION,
      panels,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable, ignore
  }
}

interface PanelStore {
  panels: Record<PanelId, PanelState>

  /** Currently active drag operation */
  dragState: DragState | null

  /** Dock zone preview (shown when dragging near edge) */
  activeDockZone: DockZone

  /** Z-index counter for float ordering */
  nextZIndex: number

  // ── Actions ───────────────────────────────────────────────

  /** Toggle panel visibility */
  togglePanel: (id: PanelId) => void

  /** Show a specific panel */
  showPanel: (id: PanelId) => void

  /** Hide a specific panel */
  hidePanel: (id: PanelId) => void

  /** Dock a panel to a specific position */
  dockPanel: (id: PanelId, position: DockPosition) => void

  /** Detach a panel to floating at given viewport coords */
  floatPanel: (id: PanelId, x: number, y: number) => void

  /** Resize a docked panel's width or height */
  resizeDocked: (id: PanelId, size: { width?: number; height?: number }) => void

  /** Resize a floating panel */
  resizeFloat: (id: PanelId, width: number, height: number) => void

  /** Move a floating panel */
  moveFloat: (id: PanelId, x: number, y: number) => void

  /** Bring a floating panel to front */
  bringToFront: (id: PanelId) => void

  /** Start a drag operation */
  startDrag: (state: DragState) => void

  /** End the current drag operation */
  endDrag: () => void

  /** Set the active dock zone preview */
  setActiveDockZone: (zone: DockZone) => void

  /** Clamp all floating panels against current window bounds */
  validateViewportBounds: () => void

  /** Reset to default layout */
  resetLayout: () => void
}

export const usePanelStore = create<PanelStore>((set, get) => ({
  panels: loadPersistedLayout() || { ...DEFAULT_PANELS },
  dragState: null,
  activeDockZone: null,
  nextZIndex: 510,

  togglePanel: (id) => {
    set((s) => {
      const isVisible = !s.panels[id].isVisible
      const updated = {
        ...s.panels,
        [id]: { ...s.panels[id], isVisible },
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  showPanel: (id) => {
    set((s) => {
      const updated = {
        ...s.panels,
        [id]: { ...s.panels[id], isVisible: true },
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  hidePanel: (id) => {
    set((s) => {
      const updated = {
        ...s.panels,
        [id]: { ...s.panels[id], isVisible: false },
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  dockPanel: (id, position) => {
    set((s) => {
      const updated = {
        ...s.panels,
        [id]: { ...s.panels[id], dockPosition: position, isVisible: true },
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  floatPanel: (id, x, y) => {
    const nextZ = get().nextZIndex
    set((s) => {
      const targetPanel = {
        ...s.panels[id],
        dockPosition: 'float' as DockPosition,
        floatX: x,
        floatY: y,
        zIndex: nextZ,
        isVisible: true,
      }
      const clampedPanel = clampPanelToViewport(targetPanel)
      const updated = {
        ...s.panels,
        [id]: clampedPanel,
      }
      persistLayout(updated)
      return { panels: updated, nextZIndex: nextZ + 1 }
    })
  },

  resizeDocked: (id, { width, height }) => {
    set((s) => {
      const panel = s.panels[id]
      const newPanel = { ...panel }
      if (width !== undefined) {
        newPanel.width = Math.max(panel.minWidth, Math.min(panel.maxWidth, width))
      }
      if (height !== undefined) {
        newPanel.height = Math.max(panel.minHeight, Math.min(panel.maxHeight, height))
      }
      const updated = {
        ...s.panels,
        [id]: newPanel,
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  resizeFloat: (id, width, height) => {
    set((s) => {
      const panel = s.panels[id]
      const clampedW = Math.max(panel.minWidth, Math.min(panel.maxWidth, width))
      const clampedH = Math.max(panel.minHeight, Math.min(panel.maxHeight, height))
      const updated = {
        ...s.panels,
        [id]: { ...panel, width: clampedW, height: clampedH },
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  moveFloat: (id, x, y) => {
    set((s) => {
      const targetPanel = { ...s.panels[id], floatX: x, floatY: y }
      const clampedPanel = clampPanelToViewport(targetPanel)
      const updated = {
        ...s.panels,
        [id]: clampedPanel,
      }
      return { panels: updated }
    })
  },

  bringToFront: (id) => {
    const nextZ = get().nextZIndex
    set((s) => {
      const updated = {
        ...s.panels,
        [id]: { ...s.panels[id], zIndex: nextZ },
      }
      return { panels: updated, nextZIndex: nextZ + 1 }
    })
  },

  startDrag: (dragState) => {
    set({ dragState })
  },

  endDrag: () => {
    const { panels } = get()
    persistLayout(panels)
    set({ dragState: null, activeDockZone: null })
  },

  setActiveDockZone: (zone) => {
    set({ activeDockZone: zone })
  },

  validateViewportBounds: () => {
    set((s) => {
      const updated = {
        sidebar: clampPanelToViewport(s.panels.sidebar),
        properties: clampPanelToViewport(s.panels.properties),
      }
      persistLayout(updated)
      return { panels: updated }
    })
  },

  resetLayout: () => {
    const defaults = { ...DEFAULT_PANELS }
    persistLayout(defaults)
    set({ panels: defaults, dragState: null, activeDockZone: null, nextZIndex: 510 })
  },
}))
