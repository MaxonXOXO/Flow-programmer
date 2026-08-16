import { create } from 'zustand'
import { FlowSettings } from '@/lib/settings/types'
import { DEFAULT_SETTINGS } from '@/lib/settings/defaultSettings'
import { settingsToYaml, yamlToSettings, STORAGE_KEY_YAML } from '@/lib/settings/yamlConfig'
import { applySettingsToDOM } from '@/lib/settings/settingsApplier'

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

  // YAML Config Actions
  exportYamlSettings: () => string
  importYamlSettings: (yamlText: string) => boolean
  initSettings: () => void
}

const STORAGE_KEY_JSON = 'fp_settings'

function loadSavedSettings(): FlowSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    // 1. Try reading YAML configuration file string first
    const yamlRaw = localStorage.getItem(STORAGE_KEY_YAML)
    if (yamlRaw) {
      const parsedYaml = yamlToSettings(yamlRaw)
      return parsedYaml
    }

    // 2. Fallback to legacy JSON format if present
    const jsonRaw = localStorage.getItem(STORAGE_KEY_JSON)
    if (jsonRaw) {
      const parsedJson = JSON.parse(jsonRaw)
      const merged: FlowSettings = {
        general: { ...DEFAULT_SETTINGS.general, ...parsedJson.general },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...parsedJson.appearance },
        editor: { ...DEFAULT_SETTINGS.editor, ...parsedJson.editor },
        canvas: { ...DEFAULT_SETTINGS.canvas, ...parsedJson.canvas },
        compiler: { ...DEFAULT_SETTINGS.compiler, ...parsedJson.compiler },
        simulation: { ...DEFAULT_SETTINGS.simulation, ...parsedJson.simulation },
        keybindings: parsedJson.keybindings || DEFAULT_SETTINGS.keybindings,
        extensions: parsedJson.extensions || DEFAULT_SETTINGS.extensions,
      }
      // Migrate to YAML format
      saveSettings(merged)
      return merged
    }

    return DEFAULT_SETTINGS
  } catch (err) {
    console.warn('[SettingsStore] Failed to load saved settings, using defaults:', err)
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: FlowSettings) {
  if (typeof window === 'undefined') return
  try {
    const yamlText = settingsToYaml(settings)
    localStorage.setItem(STORAGE_KEY_YAML, yamlText)
    localStorage.setItem(STORAGE_KEY_JSON, JSON.stringify(settings))
  } catch (err) {
    console.error('[SettingsStore] Failed to save YAML settings:', err)
  }
}

const initialSettings = loadSavedSettings()

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: initialSettings,
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
      applySettingsToDOM(newSettings)
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
      applySettingsToDOM(newSettings)
      return { settings: newSettings }
    })
  },

  resetAllSettings: () => {
    saveSettings(DEFAULT_SETTINGS)
    applySettingsToDOM(DEFAULT_SETTINGS)
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

  exportYamlSettings: () => {
    return settingsToYaml(get().settings)
  },

  importYamlSettings: (yamlText: string) => {
    try {
      const parsed = yamlToSettings(yamlText)
      saveSettings(parsed)
      applySettingsToDOM(parsed)
      set({ settings: parsed })
      return true
    } catch (err) {
      console.error('[SettingsStore] Failed to import YAML settings:', err)
      return false
    }
  },

  initSettings: () => {
    const loaded = loadSavedSettings()
    applySettingsToDOM(loaded)
    set({ settings: loaded })
  },
}))
