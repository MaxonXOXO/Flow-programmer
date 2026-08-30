// ─────────────────────────────────────────────────────────────────
//  Flow-IDE :: Phase 6A Verification Test Suite
//  Canonical Component Migration Template: LDR Light Sensor
// ─────────────────────────────────────────────────────────────────

import {
  getComponentPackage,
  getPackage,
  getAllPackages,
  getAllComponents,
  componentsRegistry,
} from '../lib/registry/components';
import { LDRLightPackage, BasicSensorsManifest } from '../lib/registry/components/sensors/ldr_light';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { instantiatePackageGraph } from '../lib/packages/packageGraphInstantiator';
import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { resolveBackendForTarget } from '../lib/compiler/backend/registry';
import { CompilerValidator } from '../lib/compiler/validators/compilerValidator';
import { validatePinCompatibility } from '../lib/registry/boards';
import { useFlowStore } from '../store/userFlowStore';
import { exportProjectFromState, importProject, extractStoreState } from '../lib/project/projectManager';
import { Node, Edge } from '@xyflow/react';

console.log('=== TEST PHASE 6A: CANONICAL COMPONENT MIGRATION (LDR LIGHT SENSOR) ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────
// T1 — LDR canonical package registration
// ─────────────────────────────────────────────────────────────────
console.log('--- T1: LDR Canonical Package Registration ---');
const basicPkg = getPackage('foton.sensors.basic');
assert(basicPkg !== undefined, 'T1: Basic sensors package manifest retrieved by id "foton.sensors.basic"');
assert(basicPkg?.name === 'Basic Sensors Package', 'T1: Basic sensors package name matches');
assert(basicPkg?.components !== undefined, 'T1: Basic sensors manifest contains components');
const ldrInPkg = (basicPkg?.components as any)['ldr_light'] || (basicPkg?.components as any).ldr_light;
assert(ldrInPkg !== undefined, 'T1: Manifest contains "ldr_light" component');

// ─────────────────────────────────────────────────────────────────
// T2 — LDR canonical component identity
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T2: LDR Canonical Component Identity ---');
const ldrDirect = getComponentPackage('ldr_light');
assert(ldrDirect !== undefined, 'T2: getComponentPackage("ldr_light") resolves canonical LDR');
assert(ldrDirect?.id === 'ldr_light', 'T2: Component id is strictly "ldr_light"');
assert(ldrDirect?.metadata?.id === 'ldr_light', 'T2: Metadata id is "ldr_light"');

// ─────────────────────────────────────────────────────────────────
// T3 — Correct metadata
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T3: Correct Metadata ---');
assert(ldrDirect?.name === 'LDR Light Sensor', 'T3: Name is "LDR Light Sensor"');
assert(ldrDirect?.metadata?.name === 'LDR Light Sensor', 'T3: Metadata name is "LDR Light Sensor"');
assert(ldrDirect?.category === 'sensor', 'T3: Category is "sensor"');
assert(ldrDirect?.icon === '☀️', 'T3: Icon is "☀️"');
assert(ldrDirect?.tags?.includes('light') === true, 'T3: Tags include "light"');
assert(ldrDirect?.tags?.includes('ldr') === true, 'T3: Tags include "ldr"');
assert(ldrDirect?.tags?.includes('photoresistor') === true, 'T3: Tags include "photoresistor"');

// ─────────────────────────────────────────────────────────────────
// T4 — Correct physical pins
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T4: Correct Physical Pins ---');
assert(Array.isArray(ldrDirect?.pins), 'T4: Pins array exists');
assert(ldrDirect?.pins.length === 2, 'T4: Declares exactly 2 physical pins');
const pin1 = ldrDirect?.pins.find(p => p.id === 'pin1');
const pin2 = ldrDirect?.pins.find(p => p.id === 'pin2');
assert(pin1 !== undefined, 'T4: pin1 exists');
assert(pin1?.signal === 'analog_output', 'T4: pin1 signal is "analog_output"');
assert(pin1?.required === true, 'T4: pin1 is required');
assert(pin2 !== undefined, 'T4: pin2 exists');
assert(pin2?.signal === 'ground', 'T4: pin2 signal is "ground"');

// ─────────────────────────────────────────────────────────────────
// T5 — Correct output definition
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T5: Correct Output Definition ---');
assert(Array.isArray(ldrDirect?.outputs), 'T5: Outputs array exists');
assert(ldrDirect?.outputs.length === 1, 'T5: Declares exactly 1 output');
const lightOut = ldrDirect?.outputs[0];
assert(lightOut?.id === 'lightLevel', 'T5: Output id is "lightLevel"');
assert(lightOut?.type === 'int', 'T5: Output type is "int"');

// ─────────────────────────────────────────────────────────────────
// T6 — Correct analog capability requirement
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T6: Correct Analog Capability Requirement ---');
assert(pin1?.signal === 'analog_output', 'T6: Signal pin declares analog_output capability requirement');

// ─────────────────────────────────────────────────────────────────
// T7 & T8 — Explicit graph entry and exit
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T7 & T8: Explicit Graph Entry and Exit ---');
const implUno = ldrDirect?.implementations?.arduino_uno;
assert(implUno !== undefined, 'T7: Arduino Uno implementation defined');
assert(implUno?.strategy === 'graph', 'T7: Implementation strategy is "graph"');
assert(implUno?.entry === 'read_analog', 'T7: Explicit entry is "read_analog"');
assert(implUno?.exit === 'return_light', 'T8: Explicit exit is "return_light"');
assert(Boolean(implUno?.graph?.nodes?.some((n: any) => n.id === 'read_analog')), 'T7: Graph contains entry node "read_analog"');
assert(Boolean(implUno?.graph?.nodes?.some((n: any) => n.id === 'return_light')), 'T8: Graph contains exit node "return_light"');

// ─────────────────────────────────────────────────────────────────
// T9 — Entry/exit remain valid after node array reordering
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T9: Determinism Under Node Reordering ---');
const originalNodes = implUno?.graph?.nodes || [];
const reorderedNodes = [...originalNodes].reverse();
const reorderedGraph = {
  ...implUno?.graph,
  nodes: reorderedNodes,
  edges: implUno?.graph?.edges || [],
  entry: 'read_analog',
  exit: 'return_light',
};
const dummyFlowNodes: Node[] = [
  {
    id: 'ldr_test',
    type: 'baseNode',
    position: { x: 100, y: 100 },
    data: {
      nodeType: 'ldr_light',
      label: 'LDR Light Sensor',
      definition: {
        ...ldrDirect,
        implementation: { strategy: 'graph', version: 1, graph: reorderedGraph },
      },
      params: { varLight: 'ambientLight' },
    },
  },
];
const expandedReordered = expandComponentGraphs(dummyFlowNodes, []);
assert(expandedReordered.hasExpandedComponents === true, 'T9: Reordered graph expanded successfully');
assert(expandedReordered.nodes.some(n => n.id === 'ldr_test_read_analog'), 'T9: Reordered graph preserved entry node identity');
assert(expandedReordered.nodes.some(n => n.id === 'ldr_test_return_light'), 'T9: Reordered graph preserved exit node identity');

// ─────────────────────────────────────────────────────────────────
// T10 & T11 — Target implementation resolution (Uno & ESP32)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T10 & T11: Target Implementation Resolution ---');
const resUno = resolvePackageImplementation(ldrDirect!, 'arduino_uno');
assert(resUno.strategy === 'graph', 'T10: Uno resolved to strategy="graph"');
assert(resUno.entry === 'read_analog', 'T10: Uno resolved entry="read_analog"');

const resESP32 = resolvePackageImplementation(ldrDirect!, 'esp32_arduino');
assert(resESP32.strategy === 'graph', 'T11: ESP32 resolved to strategy="graph"');
assert(resESP32.entry === 'read_analog', 'T11: ESP32 resolved entry="read_analog"');

// ─────────────────────────────────────────────────────────────────
// T12 & T13 — Graph instantiation & package immutability
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T12 & T13: Graph Instantiation & Package Immutability ---');
const ldrInstance = instantiatePackageGraph({ packageId: 'ldr_light', componentInstanceId: 'ldr_1' });
assert(ldrInstance !== undefined, 'T12: LDR graph instantiates cleanly');
assert(ldrInstance.packageId === 'ldr_light', 'T12: PackageId is "ldr_light"');
assert(ldrInstance.entry === 'read_analog', 'T12: Preserved entry="read_analog"');
assert(ldrInstance.exit === 'return_light', 'T12: Preserved exit="return_light"');
assert(ldrInstance.nodes !== ldrDirect?.implementations?.arduino_uno?.graph?.nodes, 'T12: Instance nodes array is isolated reference');

// Mutate instance
((ldrInstance.nodes[0].data as any).params as any).pin = 'A3';
const pristineTemplate = getComponentPackage('ldr_light');
assert(
  (pristineTemplate?.implementations?.arduino_uno?.graph?.nodes[1].data as any).params.pin !== 'A3',
  'T13: Package template in registry remained 100% immutable'
);

// ─────────────────────────────────────────────────────────────────
// T14 & T15 — Universal AST expansion & target independence
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T14 & T15: Universal AST Expansion & Independence ---');
const flowNodesLDR: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'ldr_node', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ldr_light', label: 'LDR Sensor', params: { varLight: 'sunlight' } } },
];
const flowEdgesLDR: Edge[] = [
  { id: 'e1', source: 'start', target: 'ldr_node', sourceHandle: 'flow', targetHandle: 'flow' },
];
const schemaNodesUno: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'ldr_node', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr' } },
];
const schemaEdgesUno: Edge[] = [
  { id: 'se1', source: 'arduino-uno', target: 'ldr_node', sourceHandle: 'A0', targetHandle: 'pin1' },
];

const compilerUno = new GraphToASTCompiler(flowNodesLDR, flowEdgesLDR, {}, {}, schemaNodesUno, schemaEdgesUno, { targetId: 'arduino_uno' });
const astUno = compilerUno.compile();
assert(astUno.kind === 'Program', 'T14: AST produced is a ProgramNode');
assert(astUno.body.length >= 2, 'T14: AST contains expanded subflow statements');

const compilerESP = new GraphToASTCompiler(flowNodesLDR, flowEdgesLDR, {}, {}, schemaNodesUno, schemaEdgesUno, { targetId: 'esp32_arduino' });
const astESP = compilerESP.compile();
assert(JSON.stringify(astUno) === JSON.stringify(astESP), 'T15: Universal AST structure is completely target-independent');

// ─────────────────────────────────────────────────────────────────
// T16 & T17 — Backend code generation (Arduino & ESP32)
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T16 & T17: Backend Code Generation ---');
const backendUno = resolveBackendForTarget('arduino_uno');
const generatedUno = backendUno.generate(astUno, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesUno, schemaEdges: schemaEdgesUno });
assert(generatedUno.main.includes('Platform: Arduino Uno'), 'T16: Generated Arduino code contains header');
assert(generatedUno.main.includes('analogRead(A0)'), 'T16: Generated Arduino code calls analogRead(A0)');
assert(generatedUno.main.includes('sunlight ='), 'T16: Generated Arduino code assigns to bound variable "sunlight"');

const schemaNodesESP: Node[] = [
  { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'esp32' } },
  { id: 'ldr_node', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr' } },
];
const schemaEdgesESP: Edge[] = [
  { id: 'se2', source: 'board', target: 'ldr_node', sourceHandle: 'GPIO34', targetHandle: 'pin1' },
];
const compilerESP32 = new GraphToASTCompiler(flowNodesLDR, flowEdgesLDR, {}, {}, schemaNodesESP, schemaEdgesESP, { targetId: 'esp32_arduino' });
const astESP32 = compilerESP32.compile();
const backendESP32 = resolveBackendForTarget('esp32_arduino');
const generatedESP32 = backendESP32.generate(astESP32, { targetId: 'esp32_arduino', boardId: 'esp32', schemaNodes: schemaNodesESP, schemaEdges: schemaEdgesESP });
assert(generatedESP32.main.includes('Platform: ESP32 (Arduino Framework)'), 'T17: Generated ESP32 code contains header');
assert(generatedESP32.main.includes('analogRead(GPIO34)') || generatedESP32.main.includes('analogRead(34)'), 'T17: Generated ESP32 code calls analogRead with GPIO34');
assert(generatedESP32.main.includes('sunlight ='), 'T17: Generated ESP32 code assigns to bound variable "sunlight"');

// ─────────────────────────────────────────────────────────────────
// T18, T19, T20, T21 — Schema pin compatibility validation
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T18 to T21: Schema Pin Capability Validation ---');
const unoA0Check = validatePinCompatibility('arduino_uno', 'A0', 'analog_in');
assert(unoA0Check.compatible === true, 'T18: Arduino Uno A0 supports analog input');

const unoD13Check = validatePinCompatibility('arduino_uno', 'D13', 'analog_in');
assert(unoD13Check.compatible === false, 'T19: Arduino Uno D13 rejects analog input');

const espGPIO34Check = validatePinCompatibility('esp32', 'GPIO34', 'analog_in');
assert(espGPIO34Check.compatible === true, 'T20: ESP32 GPIO34 supports analog input');

const espGPIO23Check = validatePinCompatibility('esp32', 'GPIO23', 'analog_in');
assert(espGPIO23Check.compatible === false, 'T21: ESP32 GPIO23 rejects analog input (digital only)');

// Also verify CompilerValidator with invalid schema connection
const validator = new CompilerValidator();
const invalidSchemaNodes: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'ldr_bad', type: 'componentNode', position: { x: 200, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr', definition: ldrDirect } },
];
const invalidSchemaEdges: Edge[] = [
  { id: 'bad_e', source: 'arduino-uno', target: 'ldr_bad', sourceHandle: 'D13', targetHandle: 'pin1' },
];
const valErrors = validator.validate(astUno, invalidSchemaNodes, invalidSchemaEdges, 'arduino_uno');
assert(valErrors.some(e => e.message.includes('non-analog pin "D13"')), 'T19: CompilerValidator flags connection of LDR to digital-only D13');

// ─────────────────────────────────────────────────────────────────
// T22 to T25 — Subflow viewer, unlock, revert, & compiler override
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T22 to T25: Subflow Viewer, Unlock, Revert, & Compiler Override ---');

// T22: Open Subflow Document
const docId = useFlowStore.getState().openSubflowDocument({
  packageId: 'ldr_light',
  componentInstanceId: 'ldr_front',
  title: 'Front LDR Sensor'
});
assert(docId === 'subflow_ldr_light_ldr_front', 'T22: Double-click opened LDR subflow document');
const initialDoc = useFlowStore.getState().documents.find(d => d.id === docId) as any;
assert(initialDoc.readOnly === true, 'T22: Subflow document starts locked (readOnly = true)');

// T23: Unlock Document & Mutate Instance
useFlowStore.getState().unlockSubflowDocument(docId);
const unlockedDoc = useFlowStore.getState().documents.find(d => d.id === docId) as any;
const unlockedInst = useFlowStore.getState().subflowInstances[docId];
assert(unlockedDoc.readOnly === false, 'T23: Document readOnly transitioned to false');
assert(unlockedDoc.unlocked === true, 'T23: Document unlocked flag is true');
assert(unlockedInst.unlocked === true, 'T23: Instance unlocked flag is true');

// Mutate instance graph
const customNodes = unlockedInst.nodes.map(n => {
  if (n.id === 'read_analog') {
    return {
      ...n,
      data: {
        ...n.data,
        params: { ...((n.data as any)?.params || {}), pin: '$PIN1', var: 'customLdrVal', target: 'customLdrVal' }
      }
    };
  }
  return n;
});
useFlowStore.setState(s => ({
  subflowInstances: {
    ...s.subflowInstances,
    [docId]: {
      ...s.subflowInstances[docId],
      nodes: customNodes,
      dirty: true,
    }
  }
}));
assert(useFlowStore.getState().subflowInstances[docId].dirty === true, 'T23: Subflow instance marked dirty after edit');

// T25: Modified instance reaches compiler
const flowNodesOverride: Node[] = [
  { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start', label: 'Start' } },
  { id: 'ldr_front', type: 'baseNode', position: { x: 200, y: 0 }, data: { nodeType: 'ldr_light', label: 'LDR Sensor', params: { varLight: 'sunlight' } } },
];
const flowEdgesOverride: Edge[] = [
  { id: 'e1', source: 'start', target: 'ldr_front', sourceHandle: 'flow', targetHandle: 'flow' },
];
const schemaNodesOverride: Node[] = [
  { id: 'arduino-uno', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno' } },
  { id: 'ldr_front', type: 'componentNode', position: { x: 300, y: 0 }, data: { label: 'LDR Sensor', componentType: 'ldr' } },
];
const schemaEdgesOverride: Edge[] = [
  { id: 'se1', source: 'arduino-uno', target: 'ldr_front', sourceHandle: 'A0', targetHandle: 'pin1' },
];

const contextWithOverride = {
  subflowOverrides: { [docId]: useFlowStore.getState().subflowInstances[docId] },
  targetId: 'arduino_uno',
};
const compilerWithOverride = new GraphToASTCompiler(flowNodesOverride, flowEdgesOverride, {}, {}, schemaNodesOverride, schemaEdgesOverride, contextWithOverride);
const astOverride = compilerWithOverride.compile();
const genOverride = backendUno.generate(astOverride, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesOverride, schemaEdges: schemaEdgesOverride });
assert(genOverride.main.includes('customLdrVal = analogRead(A0)'), 'T25: Modified LDR subflow parameter compiled into C++');

// T24: Revert restores package template
useFlowStore.getState().revertSubflowOverride(docId);
const revertedInst = useFlowStore.getState().subflowInstances[docId];
assert(revertedInst.dirty === false, 'T24: Reverted instance dirty is false');
assert(
  (revertedInst?.nodes.find(n => n.id === 'read_analog')?.data as any)?.params?.target === 'lightLevel',
  'T24: Revert restored pristine package template target parameter "lightLevel"'
);

// ─────────────────────────────────────────────────────────────────
// T26 & T27 — Project persistence & reload
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T26 & T27: Override Persistence & Reload Round-Trip ---');
// Modify again for persistence test
useFlowStore.getState().unlockSubflowDocument(docId);
const modifiedNodes = useFlowStore.getState().subflowInstances[docId].nodes.map(n => {
  if (n.id === 'read_analog') {
    return {
      ...n,
      data: {
        ...n.data,
        params: { ...((n.data as any)?.params || {}), target: 'persistedLightVal', var: 'persistedLightVal' }
      }
    };
  }
  return n;
});
useFlowStore.setState(s => ({
  subflowInstances: {
    ...s.subflowInstances,
    [docId]: {
      ...s.subflowInstances[docId],
      nodes: modifiedNodes,
      dirty: true,
    }
  }
}));

// Export project
useFlowStore.setState({
  project: { name: 'LDR Test Project', platform: 'arduino_uno', hardware: { boardId: 'arduino_uno', targetId: 'arduino_uno' }, createdAt: Date.now() }
});
const exportedProject = exportProjectFromState(useFlowStore.getState());
assert(exportedProject.componentOverrides !== undefined, 'T26: Exported project contains componentOverrides section');
assert(exportedProject.componentOverrides?.[docId] !== undefined, 'T26: ldr_front override present in serialized project');

// Import and compile reloaded project
const importedProjectResult = importProject(JSON.stringify(exportedProject));
assert(importedProjectResult.success === true, 'T27: Project imported successfully');
const restoredStoreState = extractStoreState(importedProjectResult.project!);
assert(restoredStoreState.subflowInstances[docId] !== undefined, 'T27: Deserialized project restored subflowInstances');
const compilerReloaded = new GraphToASTCompiler(flowNodesOverride, flowEdgesOverride, {}, {}, schemaNodesOverride, schemaEdgesOverride, {
  subflowOverrides: restoredStoreState.subflowInstances,
  targetId: 'arduino_uno',
});
const astReloaded = compilerReloaded.compile();
const genReloaded = backendUno.generate(astReloaded, { targetId: 'arduino_uno', boardId: 'arduino_uno', schemaNodes: schemaNodesOverride, schemaEdges: schemaEdgesOverride });
assert(genReloaded.main.includes('persistedLightVal = analogRead(A0)'), 'T27: Reloaded project compiled with persisted override');

// ─────────────────────────────────────────────────────────────────
// T28 — Multiple LDR instances remain isolated
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T28: Multiple LDR Instances Isolation ---');
const docFront = useFlowStore.getState().openSubflowDocument({ packageId: 'ldr_light', componentInstanceId: 'ldr_front_sensor' });
const docRear = useFlowStore.getState().openSubflowDocument({ packageId: 'ldr_light', componentInstanceId: 'ldr_rear_sensor' });
assert(docFront !== docRear, 'T28: Front and Rear LDR produce distinct document IDs');
useFlowStore.getState().unlockSubflowDocument(docFront);
const customFrontNodes = useFlowStore.getState().subflowInstances[docFront].nodes.map(n => ({
  ...n,
  data: { ...n.data, customMarker: 'front_only' }
}));
useFlowStore.setState(s => ({
  subflowInstances: {
    ...s.subflowInstances,
    [docFront]: {
      ...s.subflowInstances[docFront],
      nodes: customFrontNodes,
      dirty: true,
    }
  }
}));
assert(useFlowStore.getState().subflowInstances[docFront].dirty === true, 'T28: Front LDR is dirty');
assert(useFlowStore.getState().subflowInstances[docRear].dirty === false, 'T28: Rear LDR remains clean (isolated)');
assert((useFlowStore.getState().subflowInstances[docRear].nodes[0].data as any).customMarker === undefined, 'T28: Rear LDR did not receive front mutation');

// ─────────────────────────────────────────────────────────────────
// T29 — Legacy project compatibility
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T29: Legacy Project Compatibility ---');
const legacyNode: Node = {
  id: 'legacy_ldr_node',
  type: 'baseNode',
  position: { x: 100, y: 100 },
  data: {
    nodeType: 'ldr',
    label: 'LDR Sensor',
    params: { pin: 'A1', var: 'lightVal' }
  }
};
const legacyCompiler = new GraphToASTCompiler([legacyNode], [], {}, {}, [], [], { targetId: 'arduino_uno' });
const legacyAst = legacyCompiler.compile();
assert(legacyAst.kind === 'Program', 'T29: Legacy node compiled cleanly into Program AST');

// ─────────────────────────────────────────────────────────────────
// T30 — No duplicate LDR identity exists in registry
// ─────────────────────────────────────────────────────────────────
console.log('\n--- T30: No Duplicate LDR Identity ---');
const allComponents = getAllComponents();
const ldrMatches = allComponents.filter(c => c.id === 'ldr_light' || c.metadata?.id === 'ldr_light');
assert(ldrMatches.length === 1, 'T30: Exactly ONE canonical component exists for "ldr_light" in registry');

// ─────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────
console.log(`\n==================================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`==================================================\n`);

if (failed > 0) {
  process.exit(1);
}
