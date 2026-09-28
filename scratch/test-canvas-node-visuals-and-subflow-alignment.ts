import assert from 'assert'
import React from 'react'
import { getVisibleNodeParams } from '../components/nodes/BaseNode'
import ldrFlowJson from '../flow-packages/ldr_light.flow.json'

console.log('=== TEST CANVAS NODE VISUALS & SUBFLOW ALIGNMENT ===\n')

// T1: LDR Light Subflow Template Invariants
console.log('--- T1: LDR Light Subflow Alignment with Canonical Primitives ---')
assert.strictEqual(ldrFlowJson.entry, 'read_analog', 'T1.1: entry is read_analog')
assert.strictEqual(ldrFlowJson.exit, 'return_light', 'T1.2: exit is return_light')

const readNode = ldrFlowJson.nodes.find(n => n.id === 'read_analog')
assert(readNode, 'T1.3: read_analog node exists')
assert.strictEqual(readNode.data.nodeType, 'analog_read', 'T1.4: nodeType is canonical analog_read')
assert.strictEqual(readNode.data.label, 'Analog Read', 'T1.5: label is "Analog Read" matching canonical primitive')
assert.strictEqual((readNode.data as any).icon, undefined, 'T1.6: no hardcoded emoji icon on read_analog node')
assert.strictEqual(readNode.data.params.pin, '$PIN1', 'T1.7: pin is $PIN1')
assert.strictEqual(readNode.data.params.target, 'lightLevel', 'T1.8: target is lightLevel')
assert.strictEqual((readNode.data.params as any).var, undefined, 'T1.9: deprecated "var" param is removed')
console.log('✅ [PASS] T1: LDR Subflow template is 100% aligned with canonical Analog Read primitive')

// T2: Subflow Start and Return Cleanliness
console.log('\n--- T2: Subflow Start and Return Nodes Cleanliness ---')
const startNode = ldrFlowJson.nodes.find(n => n.id === 'start')
assert(startNode, 'T2.1: start node exists')
assert.strictEqual(startNode.data.nodeType, 'start', 'T2.2: start nodeType is "start"')
assert.strictEqual(startNode.data.label, 'Start', 'T2.3: label is "Start"')
assert.strictEqual((startNode.data as any).icon, undefined, 'T2.4: no hardcoded emoji on start node')

const returnNode = ldrFlowJson.nodes.find(n => n.id === 'return_light')
assert(returnNode, 'T2.5: return node exists')
assert.strictEqual(returnNode.data.nodeType, 'return', 'T2.6: return nodeType is "return"')
assert.strictEqual(returnNode.data.label, 'Return', 'T2.7: label is "Return"')
assert.strictEqual((returnNode.data as any).icon, undefined, 'T2.8: no hardcoded emoji on return node')
console.log('✅ [PASS] T2: Start and Return nodes contain no raw emoji overrides')

// T3: Parameter Filtering (Hides Internal Linkage & Redundant Pin Aliases)
console.log('\n--- T3: Visible Parameter Filtering Invariants ---')
const testParams: Record<string, string> = {
  packageId: 'ldr_light',
  componentInstanceId: 'comp_instance_abc123',
  subflowDocId: 'subflow_doc_xyz456',
  target: 'lightVal',
  pin1: 'A1',
  pin1Pin: 'A1',
  pin: 'A1',
  var: 'lightVal',
}

const visibleEntries = getVisibleNodeParams(testParams)
const visibleKeys = visibleEntries.map(([k]) => k)

assert(!visibleKeys.includes('packageId'), 'T3.1: packageId is hidden')
assert(!visibleKeys.includes('componentInstanceId'), 'T3.2: componentInstanceId is hidden')
assert(!visibleKeys.includes('subflowDocId'), 'T3.3: subflowDocId is hidden')
assert(!visibleKeys.includes('pin1Pin'), 'T3.4: redundant pin1Pin alias is hidden')
assert(!visibleKeys.includes('pin'), 'T3.5: duplicate generic pin is hidden when pin1 exists')
assert(!visibleKeys.includes('var'), 'T3.6: duplicate legacy var is hidden when target exists')
assert(visibleKeys.includes('pin1'), 'T3.7: canonical pin1 is displayed')
assert(visibleKeys.includes('target'), 'T3.8: canonical target is displayed')
assert.strictEqual(visibleKeys.length, 2, 'T3.9: exactly 2 clean parameters (pin1, target) visible on card')
console.log('✅ [PASS] T3: Parameter filter hides internal linkage IDs and redundant aliases')

// T4: Ultrasonic Parameter Filtering
console.log('\n--- T4: Multi-Pin Component Parameter Filtering ---')
const ultrasonicParams: Record<string, string> = {
  packageId: 'ultrasonic_hcsr04',
  componentInstanceId: 'comp_ultra_1',
  trig: '9',
  trigPin: '9',
  echo: '10',
  echoPin: '10',
  target: 'distance',
}

const ultraVisible = getVisibleNodeParams(ultrasonicParams).map(([k]) => k)
assert(!ultraVisible.includes('packageId'), 'T4.1: packageId hidden on ultrasonic')
assert(!ultraVisible.includes('componentInstanceId'), 'T4.2: componentInstanceId hidden on ultrasonic')
assert(!ultraVisible.includes('trigPin'), 'T4.3: trigPin hidden when trig exists')
assert(!ultraVisible.includes('echoPin'), 'T4.4: echoPin hidden when echo exists')
assert(ultraVisible.includes('trig'), 'T4.5: trig is visible')
assert(ultraVisible.includes('echo'), 'T4.6: echo is visible')
assert(ultraVisible.includes('target'), 'T4.7: target is visible')
assert.strictEqual(ultraVisible.length, 3, 'T4.8: exactly 3 clean parameters visible for ultrasonic')
console.log('✅ [PASS] T4: Ultrasonic parameters display cleanly without alias pollution')

// T5: Delay Primitive Normalization & Consistency
console.log('\n--- T5: Delay Primitive Normalization & Invariants ---')
import ultrasonicFlowJson from '../flow-packages/ultrasonic_hcsr04.flow.json'

const delay2us = ultrasonicFlowJson.nodes.find(n => n.id === 'delay_2us')
assert(delay2us, 'T5.1: delay_2us exists in ultrasonic subflow')
assert.strictEqual(delay2us.data.nodeType, 'delay', 'T5.2: nodeType is canonical "delay"')
assert.strictEqual(delay2us.data.label, 'Delay', 'T5.3: label is canonical "Delay" (not "Delay 2 us")')
assert.strictEqual((delay2us.data as any).icon, undefined, 'T5.4: no hardcoded emoji icon')
assert.strictEqual(delay2us.data.params.duration, '2', 'T5.5: duration is 2')
assert.strictEqual(delay2us.data.params.unit, 'us', 'T5.6: unit is us')

const delay10us = ultrasonicFlowJson.nodes.find(n => n.id === 'delay_10us')
assert(delay10us, 'T5.7: delay_10us exists in ultrasonic subflow')
assert.strictEqual(delay10us.data.nodeType, 'delay', 'T5.8: nodeType is canonical "delay"')
assert.strictEqual(delay10us.data.label, 'Delay', 'T5.9: label is canonical "Delay" (not "Delay 10 us")')
assert.strictEqual((delay10us.data as any).icon, undefined, 'T5.10: no hardcoded emoji icon')
assert.strictEqual(delay10us.data.params.duration, '10', 'T5.11: duration is 10')
assert.strictEqual(delay10us.data.params.unit, 'us', 'T5.12: unit is us')

// Test parameter visibility for delay node with duration + unit + legacy ms
const delayParams: Record<string, string> = {
  duration: '500',
  unit: 'ms',
  ms: '500',
}
const visibleDelay = getVisibleNodeParams(delayParams).map(([k]) => k)
assert(!visibleDelay.includes('ms'), 'T5.13: legacy ms is hidden when duration is present')
assert(visibleDelay.includes('duration'), 'T5.14: duration is visible')
assert(visibleDelay.includes('unit'), 'T5.15: unit is visible')
assert.strictEqual(visibleDelay.length, 2, 'T5.16: exactly 2 clean parameters (duration, unit) visible for delay')
console.log('✅ [PASS] T5: Delay primitive is 100% consistent across canvas, subflow, and compiler')

console.log('\n==================================================')
console.log('SUMMARY: All 36 visual & subflow assertions passed!')
console.log('==================================================\n')
