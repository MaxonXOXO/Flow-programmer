/**
 * Flow-IDE Preferences System Types
 * Scalable schema for global application preferences.
 */

export type ThemeOption = 'dark' | 'light' | 'system'
export type AccentColorOption = 'blue' | 'orange' | 'purple' | 'green'
export type EdgeStyleOption = 'bezier' | 'smoothstep' | 'straight'
export type OptimizationOption = 'O0' | 'O2' | 'O3' | 'Os'
export type DefaultBoardOption = 'arduino_uno' | 'esp32' | 'esp8266'
export type StartupWorkspaceOption = 'splash' | 'editor'

export interface GeneralSettings {
  startupWorkspace: StartupWorkspaceOption
  autoSave: boolean
  autoSaveIntervalMs: number
  checkForUpdates: boolean
  confirmUnsaved: boolean
  recentLimit: number
}

export interface AppearanceSettings {
  theme: ThemeOption
  accentColor: AccentColorOption
  uiScale: number
  compactMode: boolean
  reduceMotion: boolean
}

export interface EditorSettings {
  explorerWidth: number
  propertiesWidth: number
  bottomPanelHeight: number
  showMinimap: boolean
  autoExpandPanels: boolean
  rememberPanelSizes: boolean
}

export interface CanvasSettings {
  showGrid: boolean
  snapToGrid: boolean
  gridDensity: number
  zoomSensitivity: number
  panSpeed: number
  smoothZoom: boolean
  smoothNodeAnimation: boolean
  edgeStyle: EdgeStyleOption
  connectionPreview: boolean
}

export interface CompilerSettings {
  defaultBoard: DefaultBoardOption
  optimizationLevel: OptimizationOption
  generateComments: boolean
  codeFormatting: boolean
  verboseOutput: boolean
  outputFolder: string
}

export interface SimulationSettings {
  simulationSpeed: number
  autoResetMCU: boolean
  liveGpioPreview: boolean
  serialMonitorAutoOpen: boolean
  simulationTimeout: number
}

export interface KeybindingItem {
  id: string
  label: string
  category: string
  keys: string
  customKeys?: string
}

export interface ExtensionItem {
  id: string
  name: string
  version: string
  description: string
  author: string
  installed: boolean
  enabled: boolean
}

export interface FlowSettings {
  general: GeneralSettings
  appearance: AppearanceSettings
  editor: EditorSettings
  canvas: CanvasSettings
  compiler: CompilerSettings
  simulation: SimulationSettings
  keybindings: KeybindingItem[]
  extensions: ExtensionItem[]
}
