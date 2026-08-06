import { create } from 'zustand'
import { FlowSettings } from '@/lib/settings/types'
import { DEFAULT_SETTINGS } from '@/lib/settings/defaultSettings'

interface SettingsStoreState {
  settings: FlowSettings
  isOpen: boolean
  activeCategory: string
  searchQuery: string

  // Actions
  setOpen: (open: boolean) => void
  openPreferences: (category?: string) => void
  closePreferences: () => void
  setActiveCategory: (category: string) => void
  setSearchQuery: (query: string) => void

  updateSetting: <C extends keyof FlowSettings, K extends keyof FlowSettings[C]>(
    category: C,
    key: K,
    value: FlowSettings[C][K]
  ) => void

  resetCategory: (category: keyof FlowSettings) => void
  resetAllSettings: () => void
  restoreDefaultLayout: () => void
  isModified: <C extends keyof FlowSettings, K extends keyof FlowSettings[C]>(category: C, key: K) => boolean
}

const STORAGE_KEY = 'fp_settings'

function loadSavedSettings(): FlowSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      editor: { ...DEFAULT_SETTINGS.editor, ...parsed.editor },
      canvas: { ...DEFAULT_SETTINGS.canvas, ...parsed.canvas },
      compiler: { ...DEFAULT_SETTINGS.compiler, ...parsed.compiler },
      simulation: { ...DEFAULT_SETTINGS.simulation, ...parsed.simulation },
      keybindings: parsed.keybindings || DEFAULT_SETTINGS.keybindings,
      extensions: parsed.extensions || DEFAULT_SETTINGS.extensions,
    }
  } catch (err) {
    console.warn('[SettingsStore] Failed to parse saved settings, falling back to defaults:', err)
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: FlowSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('[SettingsStore] Failed to save settings to localStorage:', err)
  }
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: loadSavedSettings(),
  isOpen: false,
  activeCategory: 'general',
  searchQuery: '',

  setOpen: (open) => set({ isOpen: open }),

  openPreferences: (category) => set({
    isOpen: true,
    activeCategory: category || get().activeCategory || 'general',
  }),

  closePreferences: () => set({ isOpen: false, searchQuery: '' }),

  setActiveCategory: (category) => set({ activeCategory: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  updateSetting: (category, key, value) => {
    set((state) => {
      const updatedCategory = {
        ...state.settings[category],
        [key]: value,
      }
      const newSettings = {
        ...state.settings,
        [category]: updatedCategory,
      }
      saveSettings(newSettings)
      return { settings: newSettings }
    })
  },

  resetCategory: (category) => {
    set((state) => {
      const newSettings = {
        ...state.settings,
        [category]: DEFAULT_SETTINGS[category],
      }
      saveSettings(newSettings)
      return { settings: newSettings }
    })
  },

  resetAllSettings: () => {
    saveSettings(DEFAULT_SETTINGS)
    set({ settings: DEFAULT_SETTINGS })
  },

  restoreDefaultLayout: () => {
    get().updateSetting('editor', 'explorerWidth', DEFAULT_SETTINGS.editor.explorerWidth)
    get().updateSetting('editor', 'propertiesWidth', DEFAULT_SETTINGS.editor.propertiesWidth)
    get().updateSetting('editor', 'bottomPanelHeight', DEFAULT_SETTINGS.editor.bottomPanelHeight)
  },

  isModified: (category, key) => {
    const current = (get().settings[category] as any)?.[key]
    const def = (DEFAULT_SETTINGS[category] as any)?.[key]
    return current !== undefined && current !== def
  },
}))
