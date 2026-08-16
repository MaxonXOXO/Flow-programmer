import { DEFAULT_SETTINGS } from '../lib/settings/defaultSettings'
import { settingsToYaml, yamlToSettings } from '../lib/settings/yamlConfig'
import { FlowSettings } from '../lib/settings/types'

console.log('=== TESTING YAML PREFERENCES & CONFIGURATION SERVICE ===\n')

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`)
    passed++
  } else {
    console.error(`❌ [FAIL] ${msg}`)
    failed++
  }
}

// 1. Serialization to YAML
console.log('--- Test 1: Serialize Settings to YAML ---')
const sampleSettings: FlowSettings = {
  ...DEFAULT_SETTINGS,
  general: {
    ...DEFAULT_SETTINGS.general,
    startupWorkspace: 'splash',
    confirmUnsaved: false,
  },
  appearance: {
    ...DEFAULT_SETTINGS.appearance,
    theme: 'light',
    accentColor: 'purple',
    compactMode: true,
    reduceMotion: true,
  },
}

const yamlText = settingsToYaml(sampleSettings)
console.log('Generated YAML snippet:')
console.log(yamlText.slice(0, 350) + '...\n')

assert(yamlText.includes('startupWorkspace: splash'), 'YAML contains startupWorkspace: splash')
assert(yamlText.includes('theme: light'), 'YAML contains theme: light')
assert(yamlText.includes('accentColor: purple'), 'YAML contains accentColor: purple')
assert(yamlText.includes('compactMode: true'), 'YAML contains compactMode: true')
assert(yamlText.includes('reduceMotion: true'), 'YAML contains reduceMotion: true')

// 2. Parsing YAML back to Settings object
console.log('\n--- Test 2: Parse YAML String Back to Settings Object ---')
const parsedSettings = yamlToSettings(yamlText)

assert(parsedSettings.general.startupWorkspace === 'splash', 'Parsed startupWorkspace is "splash"')
assert(parsedSettings.general.confirmUnsaved === false, 'Parsed confirmUnsaved is false')
assert(parsedSettings.appearance.theme === 'light', 'Parsed theme is "light"')
assert(parsedSettings.appearance.accentColor === 'purple', 'Parsed accentColor is "purple"')
assert(parsedSettings.appearance.compactMode === true, 'Parsed compactMode is true')
assert(parsedSettings.appearance.reduceMotion === true, 'Parsed reduceMotion is true')

// 3. Fallback on invalid YAML
console.log('\n--- Test 3: Fallback on Empty/Invalid YAML ---')
const fallbackSettings = yamlToSettings('invalid: [unclosed string')
assert(fallbackSettings.general.startupWorkspace === 'editor', 'Invalid YAML falls back to default startupWorkspace')
assert(fallbackSettings.appearance.theme === 'dark', 'Invalid YAML falls back to default theme')

console.log('\n==================================================')
console.log(`SUMMARY: ${passed} passed, ${failed} failed`)
console.log('==================================================\n')

if (failed > 0) process.exit(1)
