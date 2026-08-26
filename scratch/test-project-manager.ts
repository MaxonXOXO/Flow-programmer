import { createNewProject, exportProjectFromState, serializeProject, validateProject, importProject, extractStoreState } from '../lib/project/projectManager'
import { PROJECT_FILE_FORMAT, CURRENT_PROJECT_VERSION } from '../lib/project/projectSchema'

console.log('--- STARTING PROJECT MANAGER & NATIVE .FLOW FORMAT TESTS ---')

// [Test 1] Create New Project
console.log('\n[Test 1] Testing createNewProject()...')
const newProj = createNewProject('Smart Parking Sensor', 'arduino_uno', 'Flow Developer', 'Ultrasonic parking monitor')
if (newProj.format !== PROJECT_FILE_FORMAT) throw new Error('Test 1 failed: Format is not "flow"')
if (newProj.version !== CURRENT_PROJECT_VERSION) throw new Error('Test 1 failed: Version is not 1')
if (newProj.metadata.name !== 'Smart Parking Sensor') throw new Error('Test 1 failed: Metadata name mismatch')
if (newProj.board?.id !== 'arduino_uno') throw new Error('Test 1 failed: Board ID mismatch')
console.log('✓ New project created successfully:', newProj.metadata.name)

// [Test 2] Export Store State to .flow Format
console.log('\n[Test 2] Testing exportProjectFromState()...')
const mockStoreState = {
  project: { name: 'Smart Home Hub', platform: 'arduino_uno', createdAt: 1700000000000 },
  schemaNodes: [{ id: 'uno', type: 'unoNode' }, { id: 'sensor1', type: 'componentNode' }],
  schemaEdges: [{ id: 'e1', source: 'sensor1', target: 'uno' }],
  flowNodes: [{ id: 'n1', type: 'baseNode' }],
  flowEdges: [],
  subFlows: { 'fn1': { nodes: [], edges: [] } },
  componentPackages: { 'pkg1': {} }
}

const exportedProj = exportProjectFromState(mockStoreState)
if (exportedProj.metadata.name !== 'Smart Home Hub') throw new Error('Test 2 failed: Name mismatch')
if (exportedProj.schema.nodes.length !== 2) throw new Error('Test 2 failed: Schema nodes count mismatch')
if (exportedProj.functions.subFlows['fn1'] === undefined) throw new Error('Test 2 failed: Subflows mismatch')

const serialized = serializeProject(exportedProj)
if (typeof serialized !== 'string' || !serialized.includes('"format": "flow"')) throw new Error('Test 2 failed: Serialization output invalid')
console.log('✓ Export & Serialization passed.')

// [Test 3] Validate .flow File
console.log('\n[Test 3] Testing validateProject()...')
const validation = validateProject(exportedProj)
if (!validation.valid) throw new Error(`Test 3 failed: Validation reported errors: ${validation.errors.join(', ')}`)
console.log('✓ Validation passed.')

// [Test 4] Import Native .flow File
console.log('\n[Test 4] Testing importProject() on valid .flow string...')
const importResult = importProject(serialized)
if (!importResult.success || !importResult.project) throw new Error(`Test 4 failed: ${importResult.errors?.join(', ')}`)
if (importResult.legacyUpgraded) throw new Error('Test 4 failed: Native .flow file should not be flagged as legacy upgraded')
console.log('✓ Native .flow import passed:', importResult.project.metadata.name)

// [Test 5] Import Legacy JSON Dump & Verify Transparent Auto-Upgrade
console.log('\n[Test 5] Testing importProject() on legacy JSON dump...')
const legacyJsonDump = JSON.stringify({
  version: "1.5",
  project: { name: 'Legacy Weather Station', platform: 'arduino_uno' },
  schemaNodes: [{ id: 'uno-legacy', type: 'unoNode' }],
  schemaEdges: [],
  flowNodes: [{ id: 'main-start', type: 'baseNode' }],
  flowEdges: [],
  subFlows: {},
  componentPackages: {}
})

const legacyImportResult = importProject(legacyJsonDump)
if (!legacyImportResult.success || !legacyImportResult.project) {
  throw new Error(`Test 5 failed: Legacy import failed: ${legacyImportResult.errors?.join(', ')}`)
}
if (legacyImportResult.project.format !== 'flow' || legacyImportResult.project.version < 1) {
  throw new Error('Test 5 failed: Legacy project was not upgraded to valid flow format')
}
if (legacyImportResult.project.metadata.name !== 'Legacy Weather Station') throw new Error('Test 5 failed: Name mismatch in upgraded legacy project')
console.log('✓ Legacy project auto-upgraded transparently to .flow v2:', legacyImportResult.project.metadata.name)

// [Test 6] Handle Malformed / Corrupted Data Without Crashing
console.log('\n[Test 6] Testing importProject() on invalid / corrupted input...')
const invalidResult = importProject('{ malformed json ...')
if (invalidResult.success) throw new Error('Test 6 failed: Malformed JSON should return success=false')
if (!invalidResult.errors || invalidResult.errors.length === 0) throw new Error('Test 6 failed: Expected clean error messages')
console.log('✓ Malformed JSON handled gracefully without crashing:', invalidResult.errors[0])

// [Test 7] Extract Store State from FlowProject
console.log('\n[Test 7] Testing extractStoreState()...')
const extractedState = extractStoreState(legacyImportResult.project)
if (extractedState.project.name !== 'Legacy Weather Station') throw new Error('Test 7 failed: Extracted name mismatch')
if (extractedState.schemaNodes.length !== 1) throw new Error('Test 7 failed: Extracted schema nodes mismatch')
console.log('✓ Extracted store state passed.')

console.log('\n--- ALL NATIVE .FLOW PROJECT FORMAT TESTS PASSED SUCCESSFULLY ---')
