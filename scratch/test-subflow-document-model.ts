import { useFlowStore, SubflowDocument } from '../store/userFlowStore'

console.log('=== TEST PHASE 5A: SUBFLOW DOCUMENT INFRASTRUCTURE ===\n')

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

// Reset store documents to clean initial state
const store = useFlowStore.getState()

// ─────────────────────────────────────────────────────────────────
// T1 — Existing Flow documents still function
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: Existing Flow Documents ---')
const initialDocs = useFlowStore.getState().documents
const mainFlowDoc = initialDocs.find(d => d.id === 'main_flow')

assert(mainFlowDoc !== undefined, 'T1: Default document list contains "main_flow"')
assert(mainFlowDoc?.type === 'flow', 'T1: Main Flow document type is "flow"')

useFlowStore.getState().setActiveDocument('main_flow')
assert(useFlowStore.getState().activeDocumentId === 'main_flow', 'T1: Main Flow document can become active')
assert(useFlowStore.getState().activeCanvas === 'flow', 'T1: Active canvas resolved to "flow"')


// ─────────────────────────────────────────────────────────────────
// T2 — Existing Schema documents still function
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: Existing Schema Documents ---')
const schemaDoc = useFlowStore.getState().documents.find(d => d.id === 'schema')

assert(schemaDoc !== undefined, 'T2: Default document list contains "schema"')
assert(schemaDoc?.type === 'schema', 'T2: Schema document type is "schema"')

useFlowStore.getState().setActiveDocument('schema')
assert(useFlowStore.getState().activeDocumentId === 'schema', 'T2: Schema document can become active')
assert(useFlowStore.getState().activeCanvas === 'schema', 'T2: Active canvas resolved to "schema"')


// ─────────────────────────────────────────────────────────────────
// T3 — A SubflowDocument can be created (Metadata Only)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: SubflowDocument Creation ---')
const subflowDocId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  title: 'HC-SR04 Subflow',
  readOnly: true,
  activate: false,
})

const createdDoc = useFlowStore.getState().documents.find(d => d.id === subflowDocId) as SubflowDocument | undefined

assert(createdDoc !== undefined, 'T3: Subflow document exists in store documents list')
assert(createdDoc?.type === 'subflow', 'T3: Document type is explicitly "subflow"')
assert(createdDoc?.packageId === 'ultrasonic_hcsr04', 'T3: Document packageId is "ultrasonic_hcsr04"')
assert(createdDoc?.readOnly === true, 'T3: Document readOnly property is true')
assert(createdDoc?.closable === true, 'T3: Subflow document is closable')
assert((createdDoc as any).nodes === undefined, 'T3: Document stores metadata only (no nodes attached)')
assert((createdDoc as any).edges === undefined, 'T3: Document stores metadata only (no edges attached)')


// ─────────────────────────────────────────────────────────────────
// T4 — A SubflowDocument can become the active document
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: SubflowDocument Active State ---')
useFlowStore.getState().setActiveDocument(subflowDocId)

assert(
  useFlowStore.getState().activeDocumentId === subflowDocId,
  'T4: Subflow document is now the activeDocumentId'
)
assert(
  useFlowStore.getState().activeCanvas === 'flow',
  'T4: Subflow document resolves activeCanvas to "flow"'
)


// ─────────────────────────────────────────────────────────────────
// T5 — A SubflowDocument can be closed
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: SubflowDocument Close Operation ---')
assert(
  useFlowStore.getState().isSubflowDocumentOpen('ultrasonic_hcsr04'),
  'T5: isSubflowDocumentOpen confirms subflow is currently open'
)

useFlowStore.getState().closeSubflowDocument('ultrasonic_hcsr04')

const docAfterClose = useFlowStore.getState().documents.find(d => d.id === subflowDocId)
assert(docAfterClose === undefined, 'T5: Subflow document was removed from store documents list')
assert(
  !useFlowStore.getState().isSubflowDocumentOpen('ultrasonic_hcsr04'),
  'T5: isSubflowDocumentOpen returns false after close'
)
assert(
  useFlowStore.getState().activeDocumentId !== subflowDocId,
  'T5: Active document automatically switched to a remaining document upon close'
)


// ─────────────────────────────────────────────────────────────────
// T6 — Multiple document types can coexist
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Multiple Document Types Coexistence ---')
// Open a function document
const fnId = useFlowStore.getState().createFunctionNode('calculateAverage')
// Open two distinct subflow documents (with and without instanceId)
const subflow1 = useFlowStore.getState().openSubflowDocument({ packageId: 'ultrasonic_hcsr04', componentInstanceId: 'sensor_1' })
const subflow2 = useFlowStore.getState().openSubflowDocument({ packageId: 'dht11' })

const allDocs = useFlowStore.getState().documents
const hasSchema = allDocs.some(d => d.type === 'schema')
const hasFlow = allDocs.some(d => d.type === 'flow')
const hasFunction = allDocs.some(d => d.type === 'function')
const hasSubflow = allDocs.some(d => d.type === 'subflow')

assert(hasSchema, 'T6: Schema document coexists in document list')
assert(hasFlow, 'T6: Main flow document coexists in document list')
assert(hasFunction, 'T6: Function document coexists in document list')
assert(hasSubflow, 'T6: Subflow documents coexist in document list')
assert(
  allDocs.filter(d => d.type === 'subflow').length >= 2,
  'T6: Multiple independent Subflow documents can be open simultaneously'
)


// ─────────────────────────────────────────────────────────────────
// T7 — Repeated open operations do not create duplicate subflow documents
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7: Idempotent Subflow Opening (No Duplicates) ---')
const countBefore = useFlowStore.getState().documents.length

// Re-open existing subflow1 ('ultrasonic_hcsr04' with instance 'sensor_1')
const reopenedId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'sensor_1',
  activate: true,
})

const countAfter = useFlowStore.getState().documents.length

assert(reopenedId === subflow1, 'T7: Reopening returns existing document ID')
assert(countBefore === countAfter, 'T7: Document list length did not increase (zero duplicate tabs)')
assert(useFlowStore.getState().activeDocumentId === subflow1, 'T7: Existing subflow document was focused/activated')

console.log('\n==================================================')
console.log(`SUMMARY: ${passed} passed, ${failed} failed`)
console.log('==================================================\n')

if (failed > 0) process.exit(1)
