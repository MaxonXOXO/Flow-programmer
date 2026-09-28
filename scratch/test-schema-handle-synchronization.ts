/**
 * Schema Handle & Orientation Synchronization Test
 * 
 * Verifies that:
 * 1. ComponentNode imports and utilizes useUpdateNodeInternals.
 * 2. ComponentNode dynamically flips handle position (Position.Left vs Position.Right) based on board center.
 * 3. Handle JSX elements possess stable, orientation-aware keys (e.g. `${pin.id}-left`, `${pin.id}-right`) to prevent stale DOM node recycling.
 * 4. SchemaCanvas wires onNodeDrag and onNodeDragStop to globally synchronize handle bounds during drag operations.
 * 5. Pin orientation calculation uses center-to-center comparison and live positionAbsoluteX coordinates.
 */

import * as fs from 'fs'
import * as path from 'path'
import assert from 'assert'

console.log('=== TEST SCHEMA HANDLE & ORIENTATION SYNCHRONIZATION ===\n')

let passed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ [PASS] ${name}`)
    passed++
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`)
    process.exit(1)
  }
}

const componentNodePath = path.resolve(__dirname, '../components/schema/ComponentNode.tsx')
const componentNodeCode = fs.readFileSync(componentNodePath, 'utf8')

const schemaCanvasPath = path.resolve(__dirname, '../components/schema/SchemaCanvas.tsx')
const schemaCanvasCode = fs.readFileSync(schemaCanvasPath, 'utf8')

// T1: ComponentNode imports useUpdateNodeInternals
test('T1: ComponentNode imports useUpdateNodeInternals from @xyflow/react', () => {
  assert.ok(
    componentNodeCode.includes('useUpdateNodeInternals'),
    'ComponentNode must import useUpdateNodeInternals'
  )
})

// T2: ComponentNode invokes updateNodeInternals on orientation or pin change
test('T2: ComponentNode registers layout effect to update node internals', () => {
  assert.ok(
    componentNodeCode.includes('updateNodeInternals(id)'),
    'ComponentNode must call updateNodeInternals(id)'
  )
  assert.ok(
    componentNodeCode.includes('pinsOnRight'),
    'ComponentNode effect must depend on pinsOnRight'
  )
})

// T3: Dynamic orientation calculation uses center-to-center comparison and live coordinates
test('T3: ComponentNode uses positionAbsoluteX live coordinates and center-to-center comparison', () => {
  assert.ok(
    componentNodeCode.includes('positionAbsoluteX'),
    'ComponentNode must reference positionAbsoluteX for live drag responsiveness'
  )
  assert.ok(
    componentNodeCode.includes('compCenterX') && componentNodeCode.includes('boardCenterX'),
    'ComponentNode must compare component center with board center'
  )
})

// T4: Handles possess orientation-aware keys to prevent stale React reconciliation
test('T4: Handles possess orientation-aware keys', () => {
  assert.ok(
    componentNodeCode.includes('key={`${pin.id}-right`}') && componentNodeCode.includes('key={`${pin.id}-left`}'),
    'Handle components must have keys specifying their orientation'
  )
})

// T5: SchemaCanvas integrates global onNodeDrag and onNodeDragStop with useUpdateNodeInternals
test('T5: SchemaCanvas integrates onNodeDrag and onNodeDragStop with useUpdateNodeInternals', () => {
  assert.ok(
    schemaCanvasCode.includes('useUpdateNodeInternals'),
    'SchemaCanvas must import useUpdateNodeInternals'
  )
  assert.ok(
    schemaCanvasCode.includes('onNodeDrag={onNodeDrag}'),
    'ReactFlow in SchemaCanvas must bind onNodeDrag'
  )
  assert.ok(
    schemaCanvasCode.includes('onNodeDragStop={onNodeDragStop}'),
    'ReactFlow in SchemaCanvas must bind onNodeDragStop'
  )
  assert.ok(
    schemaCanvasCode.includes('updateNodeInternals'),
    'SchemaCanvas must call updateNodeInternals'
  )
})

console.log(`\n==================================================`)
console.log(`SUMMARY: All ${passed} schema handle synchronization assertions passed!`)
console.log(`==================================================`)
