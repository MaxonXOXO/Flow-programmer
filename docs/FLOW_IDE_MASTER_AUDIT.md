# Flow-IDE Master Architecture & Technical Audit

**Author**: Antigravity Engineering (Google DeepMind)  
**Target Repository**: `Flow-IDE / Flow / flow-programmer`  
**Scope**: Window Manager, Compiler Hardening Pipeline (B1–B5), Package Execution Model, and Component Subflow Viewer Architecture.

---

# Table of Contents
1. [Audit 1: Window Manager & Dockable Panel Architecture](#1-window-manager--dockable-panel-architecture)
2. [Audit 2: Phase 4 Compiler Hardening Pipeline (B1–B5)](#2-phase-4-compiler-hardening-pipeline-b1b5)
3. [Audit 3: Package Execution Model Audit (HC-SR04 Reference Implementation)](#3-package-execution-model-audit-hc-sr04-reference-implementation)
4. [Audit 4: Phase 5 Component Subflow Viewer Architecture Audit](#4-phase-5-component-subflow-viewer-architecture-audit)
5. [Master File Inventory](#5-master-file-inventory)

---

# 1. Window Manager & Dockable Panel Architecture

## 1.1 Overview & Requirements
The Window Manager provides a multi-docking, resizable, floating panel management layout inspired by professional IDEs (VS Code, Photoshop).

```
ActivityBar ───► LeftDock ───► CenterWorkspace (Authoritative) ───► RightDock
                                      │
                                  BottomDock
                                      │
                                 FloatLayer
```

## 1.2 Architectural Invariants
* **Authoritative Window Manager**: Panel placement is strictly determined by `PanelState.dockPosition` (`'left'`, `'right'`, `'bottom'`, `'float'`), not by hardcoded static slots.
* **Dynamic Center Workspace**: The primary center workspace (`WorkspaceTabBar` + active canvas) is guaranteed to occupy 100% of remaining available space between dock regions.
* **Unified State Store**: All panel states (visibility, dimensions, dock slot, float coordinates, z-index, drag offsets) reside in `usePanelStore.ts`.
* **Viewport Boundaries**: Floating panels are clamped to the visible viewport on resize or dragging.
* **Canvas Pointer Event Isolation**: Floating panels render in an overlay with `pointer-events: none` on the container and `pointer-events: auto` on panel bodies, ensuring zero canvas interference.

---

# 2. Phase 4 Compiler Hardening Pipeline (B1–B5)

The compilation pipeline translates high-level visual flow graphs and hardware schematics into optimized, type-safe Arduino C++ code.

```
Flow Canvas / Schema Canvas
           ↓
Component Expander (expandComponentGraphs)
  ├── Canonical Package Identity (B5)
  ├── Instance-Scoped Internal Variables (B3)
  ├── Explicit Entry/Exit Declarations & Splicing (B4)
  └── Compilation Immutability (B1)
           ↓
GraphToASTCompiler (compile)  [Schema Graph Threading - B2]
           ↓
Universal AST (ProgramNode)
           ↓
Semantic Analyzer (Symbol Table & Type Checking)
           ↓
ArduinoUnoGenerator (generate)
           ↓
Target Arduino C++ Sketch Code
```

## 2.1 B1 — Compilation Immutability
* **Problem**: Compiler mutations previously modified input graphs in-place, causing repeated compilations to accumulate side-effects or corrupt state.
* **Solution**: Deep cloning of input nodes and edges at the entry of `expandComponentGraphs` and `GraphToASTCompiler`. The caller's graph remains 100% immutable across repeated compilation passes.

## 2.2 B2 — Schema Graph Threading
* **Problem**: Hardware schematic graphs (`schemaNodes`, `schemaEdges`) were bypassed in certain compiler paths, preventing automatic hardware pin verification.
* **Solution**: Fully threaded schematic nodes and edges into `GraphToASTCompiler` and `ArduinoUnoGenerator` for automated hardware pin validation and pin mode declarations.

## 2.3 B5 — Canonical Package Identity Resolution
* **Problem**: Package identity was previously resolved using heuristic string pattern matching against human-readable UI labels (`if (label.toLowerCase().includes('ultrasonic')) ...`).
* **Solution**: Replaced label pattern matching with canonical property lookup (`params.packageId` / `definition.id`) in `resolvePackageImplementation()`. Label changes no longer affect component execution identity.

## 2.4 B3 — Instance-Scoped Internal Variable Isolation
* **Problem**: Internal variables inside component subflow graphs (such as `duration` in HC-SR04) caused name collisions and duplicate variable declarations when multiple instances of the same sensor were placed on the canvas.
* **Solution**: Implemented automated internal variable discovery and instance-scoped namespacing (`${sanitizedInstanceId}_${varName}`) using token-aware regular expression replacement (`\bvar\b`), while strictly protecting external output variables (`measured_distance`).

## 2.5 B4 — Explicit Subflow Entry/Exit Declarations
* **Problem**: Subflow boundary nodes were previously inferred via array index fallbacks (`internalNodes[internalNodes.length - 1]`) and return-node heuristics, making graphs fragile against node reordering.
* **Solution**: Mandated explicit `entry` and `exit` declarations in package graphs (`PackageGraphDefinition`). Edge splicing now redirects incoming edges directly to `${instanceId}_${entry}` and outgoing edges from `${instanceId}_${exit}` with strict validation.

---

# 3. Package Execution Model Audit (HC-SR04 Reference Implementation)

## 3.1 Package Definition (`ultrasonic_hcsr04.ts`)
```typescript
export const UltrasonicHCSR04Package: PackageDefinition = {
  metadata: {
    id: 'ultrasonic_hcsr04',
    name: 'Ultrasonic HC-SR04',
    description: 'Ultrasonic distance sensor — measures distance via echo timing',
    category: 'sensor',
    icon: '📡',
    tags: ['distance', 'ultrasonic', 'hcsr04'],
  },
  pins: [
    { id: 'vcc',  label: 'VCC',  signal: 'power',          required: true },
    { id: 'trig', label: 'TRIG', signal: 'digital_input',  required: true },
    { id: 'echo', label: 'ECHO', signal: 'digital_output', required: true },
    { id: 'gnd',  label: 'GND',  signal: 'ground',         required: true },
  ],
  outputs: [
    { id: 'distance', label: 'Distance', type: 'float', description: 'Measured distance in centimetres' },
  ],
  properties: [
    { id: 'trigPin', label: 'Trigger Pin', type: 'pin', defaultValue: '', description: 'Arduino pin connected to TRIG' },
    { id: 'echoPin', label: 'Echo Pin',    type: 'pin', defaultValue: '', description: 'Arduino pin connected to ECHO' },
  ],
  dependencies: {
    includes: [],
    globals:  [],
    setup: [
      'pinMode($trigPin, OUTPUT)',
      'pinMode($echoPin, INPUT)',
    ],
  },
  implementation: {
    strategy: 'builtin',
    version: 1,
    graph: {
      entry: 'trig_low_1',
      exit: 'return_distance',
      nodes: [ /* 9 internal nodes */ ],
      edges: [ /* 8 internal edges */ ],
    },
  },
};
```

## 3.2 Internal Subflow Graph Breakdown
1. **`start`** (`start`): Visual entry indicator (skipped in expansion).
2. **`trig_low_1`** (`gpio`, `pin: "$TRIG"`, `value: "LOW"`): **Explicit Entry**. Clears trigger line.
3. **`delay_2us`** (`delay`, `duration: 2`, `unit: "us"`): Microsecond settling delay.
4. **`trig_high`** (`gpio`, `pin: "$TRIG"`, `value: "HIGH"`): Sets trigger line high.
5. **`delay_10us`** (`delay`, `duration: 10`, `unit: "us"`): Emits 10µs ultrasonic burst pulse.
6. **`trig_low_2`** (`gpio`, `pin: "$TRIG"`, `value: "LOW"`): Concludes trigger pulse.
7. **`pulse_in_echo`** (`pulse_in`, `pin: "$ECHO"`, `value: "HIGH"`, `var: "duration"`): Measures echo return duration.
8. **`calc_distance`** (`assignment`, `target: "distance"`, `expression: "duration * 0.034 / 2"`): Computes distance in cm.
9. **`return_distance`** (`return`, `value: "distance"`): **Explicit Exit**. Outputs final distance value.

## 3.3 Intermediate Representations Across Compilation

### Input Node Object
```json
{
  "id": "sensor_front",
  "type": "componentNode",
  "data": {
    "label": "Front Sensor",
    "params": {
      "packageId": "ultrasonic_hcsr04",
      "varDist": "front_dist",
      "trigPin": "9",
      "echoPin": "10"
    }
  }
}
```

### Expanded Graph Nodes & Edges
```json
{
  "nodes": [
    { "id": "sensor_front_trig_low_1", "data": { "nodeType": "gpio", "params": { "pin": "9", "value": "LOW" } } },
    { "id": "sensor_front_delay_2us", "data": { "nodeType": "delay", "params": { "duration": "2", "unit": "us" } } },
    { "id": "sensor_front_trig_high", "data": { "nodeType": "gpio", "params": { "pin": "9", "value": "HIGH" } } },
    { "id": "sensor_front_delay_10us", "data": { "nodeType": "delay", "params": { "duration": "10", "unit": "us" } } },
    { "id": "sensor_front_trig_low_2", "data": { "nodeType": "gpio", "params": { "pin": "9", "value": "LOW" } } },
    { "id": "sensor_front_pulse_in_echo", "data": { "nodeType": "pulse_in", "params": { "pin": "10", "value": "HIGH", "var": "sensor_front_duration" } } },
    { "id": "sensor_front_calc_distance", "data": { "nodeType": "assignment", "params": { "target": "front_dist", "expression": "sensor_front_duration * 0.034 / 2" } } },
    { "id": "sensor_front_return_distance", "data": { "nodeType": "assignment", "params": { "target": "front_dist", "expression": "front_dist" } } }
  ]
}
```

### Generated AST Representation (`ProgramNode`)
```typescript
{
  kind: 'Program',
  body: [
    { kind: 'ExpressionStatement', expression: { kind: 'CallExpression', callee: 'digitalWrite', arguments: [ { kind: 'Literal', value: 9 }, { kind: 'Literal', value: 'LOW' } ] } },
    { kind: 'ExpressionStatement', expression: { kind: 'CallExpression', callee: 'delayMicroseconds', arguments: [ { kind: 'Literal', value: 2 } ] } },
    { kind: 'ExpressionStatement', expression: { kind: 'CallExpression', callee: 'digitalWrite', arguments: [ { kind: 'Literal', value: 9 }, { kind: 'Literal', value: 'HIGH' } ] } },
    { kind: 'ExpressionStatement', expression: { kind: 'CallExpression', callee: 'delayMicroseconds', arguments: [ { kind: 'Literal', value: 10 } ] } },
    { kind: 'ExpressionStatement', expression: { kind: 'CallExpression', callee: 'digitalWrite', arguments: [ { kind: 'Literal', value: 9 }, { kind: 'Literal', value: 'LOW' } ] } },
    { kind: 'Assignment', name: 'sensor_front_duration', value: { kind: 'CallExpression', callee: 'pulseIn', arguments: [ { kind: 'Literal', value: 10 }, { kind: 'Literal', value: 'HIGH' } ] } },
    { kind: 'Assignment', name: 'front_dist', value: { kind: 'BinaryExpression', operator: '/', left: { kind: 'BinaryExpression', operator: '*', left: { kind: 'Identifier', name: 'sensor_front_duration' }, right: { kind: 'Literal', value: 0.034 } }, right: { kind: 'Literal', value: 2 } } }
  ]
}
```

### Final Generated Arduino C++ Code
```cpp
/*
 * Generated by Flow Programmer (Universal AST compiler)
 * Platform: Arduino Uno
 * Components:
 *   - Ultrasonic Front Sensor
 */

// Pin Definitions
#define ULTRASONIC_FRONT_TRIG d9
#define ULTRASONIC_FRONT_ECHO d10

void setup() {
  Serial.begin(9600);
  pinMode(d9, OUTPUT); // HC-SR04 TRIG
  pinMode(d10, INPUT);  // HC-SR04 ECHO
}

void loop() {
  digitalWrite(9, LOW);
  delayMicroseconds(2);
  digitalWrite(9, HIGH);
  delayMicroseconds(10);
  digitalWrite(9, LOW);
  unsigned long sensor_front_duration = pulseIn(10, HIGH);
  front_dist = ((sensor_front_duration * 0.034) / 2);
  front_dist = front_dist;
  Serial.println(front_dist);
}
```

---

# 4. Phase 5 Component Subflow Viewer Architecture Audit

## 4.1 Objective
Enable users to double-click an HC-SR04 (or any package component) in the Flow or Schema Canvas to inspect its internal execution graph in **read-only** mode using the existing canvas infrastructure.

## 4.2 Canvas Reusability Audit
* **Canvas Selection**: `<FlowCanvas />` ([FlowCanvas.tsx](file:///e:/Flow-IDE/Flow/flow-programmer/components/editor/FlowCanvas.tsx)) is the primary visual flow renderer. It natively understands and renders all subflow nodes (`start`, `gpio`, `delay`, `pulse_in`, `assignment`, `return`).
* **Zero Duplication**: No new canvas engine or secondary renderer is created.

## 4.3 Navigation Model Decision
* **Authoritative Model (Option A - Workspace Tab Navigation)**:
  * Double-clicking a component opens a new tab in `WorkspaceTabBar`: `[📦 HC-SR04 Subflow]`.
  * Allows toggling between Main Flow, Schema, and Subflow tabs without loss of canvas state or viewport position.
  * Supplemented by a header badge: `🔒 Component Subflow: Ultrasonic HC-SR04 (Read-Only)`.

## 4.4 Read-Only Mode Enforcement Matrix

| Capability | Main Flow Canvas | Component Subflow Viewer | Mechanism |
| :--- | :--- | :--- | :--- |
| **Node Dragging** | Enabled | **Disabled** | `nodesDraggable={!isReadOnly}` |
| **Edge Connection** | Enabled | **Disabled** | `nodesConnectable={!isReadOnly}` |
| **Selection & Inspection** | Enabled | **Enabled** | `elementsSelectable={true}` (inspect properties in right panel) |
| **Node Deletion** | Enabled | **Disabled** | `deleteKeyCode={isReadOnly ? null : ['Backspace', 'Delete']}` |
| **Palette Dropping** | Enabled | **Disabled** | Drops rejected when `isReadOnly === true` |
| **Quick Edit Panel** | Enabled | **Disabled** | Suppressed in subflow mode |
| **Context Menu** | Full (Edit, Dup, Delete) | **Inspect Only** | Mutation actions stripped |

## 4.5 Subflow Document Context Interface
```typescript
export interface SubflowDocumentContext {
  id: string                   // "pkg_subflow_ultrasonic_hcsr04"
  title: string                // "HC-SR04 Subflow"
  type: 'subflow'
  targetId: string             // "ultrasonic_hcsr04"
  componentInstanceId?: string // "sensor_front"
  readOnly: boolean            // true
  icon?: string
}
```

---

# 5. Master File Inventory

| Category | File | Description |
| :--- | :--- | :--- |
| **Window Manager** | [types.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/windowManager/types.ts) | Window manager type interfaces & dock position definitions |
| **Window Manager** | [usePanelStore.ts](file:///e:/Flow-IDE/Flow/flow-programmer/store/usePanelStore.ts) | Authoritative panel layout & window state store |
| **Window Manager** | [page.tsx](file:///e:/Flow-IDE/Flow/flow-programmer/app/editor/page.tsx) | Editor layout shell, dock regions & center workspace rendering |
| **Document Tabs** | [userFlowStore.ts](file:///e:/Flow-IDE/Flow/flow-programmer/store/userFlowStore.ts) | Flow state, documents, subflow graphs, active canvas resolution |
| **Document Tabs** | [WorkspaceTabBar.tsx](file:///e:/Flow-IDE/Flow/flow-programmer/components/editor/WorkspaceTabBar.tsx) | Document tab bar navigation & tab switching |
| **Canvas** | [FlowCanvas.tsx](file:///e:/Flow-IDE/Flow/flow-programmer/components/editor/FlowCanvas.tsx) | Main ReactFlow flow graph editor & subflow renderer |
| **Canvas** | [SchemaCanvas.tsx](file:///e:/Flow-IDE/Flow/flow-programmer/components/schema/SchemaCanvas.tsx) | Arduino Uno hardware wiring & component schematic canvas |
| **Package Definition** | [types.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/registry/components/types.ts) | Component package schemas (`PackageDefinition`, `PackageGraphDefinition`) |
| **Package Definition** | [ultrasonic_hcsr04.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/registry/components/sensors/ultrasonic_hcsr04.ts) | HC-SR04 reference package implementation |
| **Package Definition** | [ultrasonic_hcsr04.flow.json](file:///e:/Flow-IDE/Flow/flow-programmer/flow-packages/ultrasonic_hcsr04.flow.json) | HC-SR04 internal subflow graph JSON |
| **Compiler Pipeline** | [packageResolver.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/compiler/packages/packageResolver.ts) | Exact package identity & execution strategy resolver |
| **Compiler Pipeline** | [componentExpander.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/compiler/packages/componentExpander.ts) | Subflow graph expansion, variable isolation, and entry/exit splicing |
| **Compiler Pipeline** | [graphParser.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/compiler/parser/graphParser.ts) | Universal AST compiler from flow graph |
| **Compiler Pipeline** | [ast.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/compiler/ast/ast.ts) | Universal AST node interfaces |
| **Compiler Pipeline** | [semanticAnalyzer.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/compiler/semantic/semanticAnalyzer.ts) | Symbol table validation & type checking |
| **Compiler Pipeline** | [arduinoGenerator.ts](file:///e:/Flow-IDE/Flow/flow-programmer/lib/compiler/generator/arduinoGenerator.ts) | Target Arduino C++ code generation |
