import { dump, load } from 'js-yaml'
import { FlowSettings } from './types'
import { DEFAULT_SETTINGS } from './defaultSettings'

/**
 * Flow-IDE YAML Configuration Service
 * Serializes FlowSettings to clean human-readable YAML format using js-yaml engine
 * and parses YAML configuration strings into strongly typed FlowSettings objects.
 */

export const CONFIG_FILE_NAME = 'settings.yaml'
export const STORAGE_KEY_YAML = 'fp_settings_yaml'

/**
 * Converts a FlowSettings object into a clean YAML formatted string with header comments.
 */
export function settingsToYaml(settings: FlowSettings): string {
  try {
    const header = [
      '# ==========================================================',
      '# Flow-IDE Global Preferences & Workspace Configuration',
      '# Automatically loaded on application startup.',
      '# Edit values directly or use the Preferences Modal (Ctrl+,)',
      '# ==========================================================',
      '',
    ].join('\n')

    const yamlBody = dump(settings, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    })

    return header + yamlBody
  } catch (err) {
    console.error('[yamlConfig] Error serializing settings to YAML:', err)
    return ''
  }
}

/**
 * Parses a YAML formatted settings string into a strongly typed FlowSettings object.
 */
export function yamlToSettings(yamlText: string): FlowSettings {
  if (!yamlText || typeof yamlText !== 'string') {
    return DEFAULT_SETTINGS
  }

  try {
    const parsedObj = load(yamlText) as Record<string, any>
    if (!parsedObj || typeof parsedObj !== 'object') {
      return DEFAULT_SETTINGS
    }

    return {
      general: { ...DEFAULT_SETTINGS.general, ...(parsedObj.general || {}) },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...(parsedObj.appearance || {}) },
      editor: { ...DEFAULT_SETTINGS.editor, ...(parsedObj.editor || {}) },
      canvas: { ...DEFAULT_SETTINGS.canvas, ...(parsedObj.canvas || {}) },
      compiler: { ...DEFAULT_SETTINGS.compiler, ...(parsedObj.compiler || {}) },
      simulation: { ...DEFAULT_SETTINGS.simulation, ...(parsedObj.simulation || {}) },
      keybindings: Array.isArray(parsedObj.keybindings) && parsedObj.keybindings.length > 0 
        ? parsedObj.keybindings 
        : DEFAULT_SETTINGS.keybindings,
      extensions: Array.isArray(parsedObj.extensions) && parsedObj.extensions.length > 0 
        ? parsedObj.extensions 
        : DEFAULT_SETTINGS.extensions,
    }
  } catch (err) {
    console.error('[yamlConfig] Error parsing YAML settings string:', err)
    return DEFAULT_SETTINGS
  }
}
