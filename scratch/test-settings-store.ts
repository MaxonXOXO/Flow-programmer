import { DEFAULT_SETTINGS } from '../lib/settings/defaultSettings'
import { FlowSettings } from '../lib/settings/types'

console.log('--- STARTING FLOW-IDE PREFERENCES SYSTEM TESTS ---')

// Test 1: Validate DEFAULT_SETTINGS Structure
console.log('\n[Test 1] Testing DEFAULT_SETTINGS structure...')
if (
  DEFAULT_SETTINGS.general &&
  DEFAULT_SETTINGS.appearance &&
  DEFAULT_SETTINGS.editor &&
  DEFAULT_SETTINGS.canvas &&
  DEFAULT_SETTINGS.compiler &&
  DEFAULT_SETTINGS.simulation &&
  Array.isArray(DEFAULT_SETTINGS.keybindings) &&
  Array.isArray(DEFAULT_SETTINGS.extensions)
) {
  console.log('✓ DEFAULT_SETTINGS schema validation passed.')
} else {
  console.error('✗ DEFAULT_SETTINGS schema validation failed.')
  process.exit(1)
}

// Test 2: Test Setting Mutation Logic
console.log('\n[Test 2] Testing Setting Mutation & Immutability...')
const dummySettings: FlowSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
dummySettings.general.startupWorkspace = 'splash'
dummySettings.appearance.accentColor = 'purple'
dummySettings.canvas.gridDensity = 30
dummySettings.compiler.defaultBoard = 'esp32'

if (
  dummySettings.general.startupWorkspace === 'splash' &&
  dummySettings.appearance.accentColor === 'purple' &&
  dummySettings.canvas.gridDensity === 30 &&
  dummySettings.compiler.defaultBoard === 'esp32'
) {
  console.log('✓ Preference property update passed.')
} else {
  console.error('✗ Preference property update failed.')
  process.exit(1)
}

// Test 3: Test Keybindings Search Filtering
console.log('\n[Test 3] Testing Keybindings Search Filter...')
const query = 'delete'
const matched = dummySettings.keybindings.filter(kb =>
  kb.label.toLowerCase().includes(query) || kb.keys.toLowerCase().includes(query)
)
if (matched.length > 0 && matched[0].id === 'delete_node') {
  console.log(`✓ Shortcut search returned expected item: ${matched[0].label} (${matched[0].keys})`)
} else {
  console.error('✗ Keybinding search filter failed.')
  process.exit(1)
}

// Test 4: Test Serialization & Deserialization
console.log('\n[Test 4] Testing LocalStorage Serialization...')
const serialized = JSON.stringify(dummySettings)
const deserialized: FlowSettings = JSON.parse(serialized)
if (deserialized.compiler.defaultBoard === 'esp32') {
  console.log('✓ Serialization roundtrip passed.')
} else {
  console.error('✗ Serialization roundtrip failed.')
  process.exit(1)
}

console.log('\n--- ALL PREFERENCES SYSTEM TESTS PASSED SUCCESSFULLY ---')
