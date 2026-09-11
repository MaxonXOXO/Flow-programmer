# Flow-IDE Canonical Node Architecture Audit
**Author**: Antigravity Engineering (Google DeepMind)  
**Date**: September 7, 2026  
**Scope**: Canonical Language & Hardware Primitives, Component Package Boundaries, Schema Harmonization, and Compiler De-duplication.

---

## Executive Summary

During Phase 6A.1 and 6A.2, we observed that while component packages like `ldr_light` and `ultrasonic_hcsr04` successfully compile into target Arduino C++, the system contains multiple conflicting representations of identical operations. For example:
- **`Read Light Level`** is semantically an `analogRead(pin)`, but is simultaneously represented across the codebase as:
  1. `nodeType: "ldr"` in `Sidebar.tsx` (a component-specific node type),
  2. `nodeType: "sensor"` in `Sidebar.tsx` (a legacy generic hardware node),
  3. `nodeType: "analog_read"` in `ldr_light.flow.json` (snake_case primitive),
  4. `nodeType: "analogRead"` in `graphParser.ts` (camelCase alias),
  5. `pluginType: "ldr"` in `lib/ir/plugin.ts` (a runtime plugin generating custom C++ strings).

If every new component (Water Level, Soil Moisture, MQ Gas, PIR, LED, Relay, etc.) introduces its own compiler node type, the downstream compiler pipeline fragments combinatorially. Every compiler stage (`componentExpander`, `graphParser`, `semanticAnalyzer`, `arduinoBackend`, `esp32Backend`) would need bespoke handlers for every physical sensor in existence.

### Core Architectural Principle
> **A component package may compose existing canonical Flow-IDE nodes, but it may NEVER introduce a new node type merely to represent a specialized hardware operation.**
> 
> New node types should only exist when the language itself gains a genuinely new semantic primitive (e.g., `digital_read`, `pwm_write`). UI terminology ("Read Light Level", "Turn LED On") is strictly a presentation-layer abstraction and must never leak into the compiler as an ad-hoc AST primitive.

---

## 1. Complete Node Taxonomy Audit

Every node type currently registered or recognized across Flow-IDE has been audited and classified below into four distinct architectural tiers:
- **Tier 1: Canonical Language Primitives** (Core programming language constructs)
- **Tier 2: Canonical Hardware Primitives** (Microcontroller physical I/O primitives)
- **Tier 3: Specialized Component / Template Nodes** (Violating boundaries / duplicate semantics)
- **Tier 4: Legacy / Presentation Aliases** (Inconsistent naming)

### Detailed Taxonomy Table

| Node Type Identifier | Category / Tier | Canonical? | Duplicate Semantic? | Used by Components? | Language Primitive vs Composition Verdict |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `start` | Tier 1: Language | ✅ Yes | None | All Flows & Subflows | **Language Primitive**: Entry execution anchor. |
| `end` | Tier 1: Language | ✅ Yes | None | Terminal Flows | **Language Primitive**: Execution termination. |
| `return` | Tier 1: Language | ✅ Yes | None | Subflows, Functions | **Language Primitive**: Returns expression value from block. |
| `condition` / `if` | Tier 1: Language | ✅ Yes | None | Control Logic | **Language Primitive**: Binary branching (`IfStatement`). |
| `loop` / `for` / `while` | Tier 1: Language | ✅ Yes | None | Control Logic | **Language Primitive**: Bounded/unbounded iteration. |
| `delay` | Tier 1: Language | ✅ Yes | None | Ultrasonic, Buzzer | **Language Primitive**: Execution timing pause (`ms`/`us`). |
| `variable` | Tier 1: Language | ✅ Yes | None | General Data | **Language Primitive**: Typed variable declaration. |
| `assignment` | Tier 1: Language | ✅ Yes | None | Ultrasonic, Math | **Language Primitive**: Value assignment (`target = expr`). |
| `function` | Tier 1: Language | ✅ Yes | None | Subflow Functions | **Language Primitive**: Subflow function definition. |
| `function_call` | Tier 1: Language | ✅ Yes | None | Invocation | **Language Primitive**: Call expression with argument bindings. |
| `print` | Tier 1: Language | ✅ Yes | None | Debug Output | **Language Primitive**: Stream serialization (`Serial.println`). |
| `input` | Tier 1: Language | ✅ Yes | None | Interactive I/O | **Language Primitive**: Stream reading (`Serial.parseInt`). |
| `pulse_in` | Tier 2: Hardware | ✅ Yes | None | Ultrasonic HC-SR04 | **Hardware Primitive**: Microsecond digital pulse timing. |
| `analog_read` | Tier 2: Hardware | ✅ Yes | None | LDR, Water, Soil, Gas | **Hardware Primitive**: Microcontroller ADC read (0–1023). |
| `analogRead` | Tier 4: Alias | ❌ No | Duplicate of `analog_read` | None | **Alias**: CamelCase duplicate in `graphParser.ts`. Remove. |
| `sensor` | Tier 4: Alias | ❌ No | Duplicate of `analog_read` | Legacy FlowCanvas | **Legacy Name**: Vague name for `analog_read`. Deprecate. |
| `gpio` | Tier 2: Hardware | ⚠️ Partial | Writes only (`digitalWrite`) | HC-SR04, LED, Relay | **Incomplete**: Only performs digital write. Needs rename to `digital_write` or split into read/write. |
| `digital_read` | Tier 2: Hardware | ❌ Missing | None | PIR, IR, Button, Flame | **Missing Primitive**: Flow-IDE has NO canonical digital read node! |
| `pwm_write` | Tier 2: Hardware | ❌ Missing | None | Motor Speed, LED Dim | **Missing Primitive**: Currently missing from AST compiler. |
| `api` | Tier 1: Language | ⚠️ Mock | None | Simulated HTTP | **Language Primitive**: Mock external HTTP call. |
| `ldr` | Tier 3: Component | ❌ No | 100% duplicate of `analog_read` | LDR Light Sensor | **Component Composition**: Must NOT be a node type. |
| `waterLevel` | Tier 3: Component | ❌ No | 100% duplicate of `analog_read` | Water Level Sensor | **Component Composition**: Must NOT be a node type. |
| `soilMoisture`| Tier 3: Component | ❌ No | 100% duplicate of `analog_read` | Soil Moisture Sensor| **Component Composition**: Must NOT be a node type. |
| `mqGas` | Tier 3: Component | ❌ No | 100% duplicate of `analog_read` | MQ Gas Sensor | **Component Composition**: Must NOT be a node type. |
| `pir` | Tier 3: Component | ❌ No | 100% duplicate of `digital_read` | PIR Motion Sensor | **Component Composition**: Must NOT be a node type. |
| `ir` | Tier 3: Component | ❌ No | 100% duplicate of `digital_read` | IR Obstacle Sensor | **Component Composition**: Must NOT be a node type. |
| `vibration` | Tier 3: Component | ❌ No | 100% duplicate of `digital_read` | Vibration Sensor | **Component Composition**: Must NOT be a node type. |
| `flame` | Tier 3: Component | ❌ No | Duplicate of `digital_read`/`analog_read`| Flame Sensor | **Component Composition**: Must NOT be a node type. |
| `ultrasonic` | Tier 3: Component | ❌ No | Composed of GPIO, Delay, PulseIn | HC-SR04 | **Component Package**: Subflow composition, not primitive. |
| `servo` | Tier 3: Component | ❌ No | Actuator driver call | Servo Motor | **Component Package**: Driver library call, not primitive. |
| `lcd` | Tier 3: Component | ❌ No | Display driver call | LCD 16x2 | **Component Package**: Driver library call, not primitive. |
| `oled` | Tier 3: Component | ❌ No | Display driver call | OLED Display | **Component Package**: Driver library call, not primitive. |
| `l298n` / `l293d`| Tier 3: Component | ❌ No | Composed GPIO / PWM writes | Motor Drivers | **Component Package**: Subflow composition, not primitive. |

---

## 2. Schema & Parameter Fragmentation Analysis

An inspection of node parameter structures reveals deep schema inconsistency across the codebase:

### 2.1 Analog Sensor Schema Fragmentation
When an analog read occurs, different parts of the system expect completely different parameter keys:
- `ldr_light.flow.json`: `{ "pin": "$PIN1", "var": "lightLevel", "target": "lightLevel" }`
- `graphParser.ts` (line 320): `data.params.target || data.params.var || 'sensorVal'`
- `Sidebar.tsx` (under Hardware): `{ "pin": "A0", "var": "sensorVal" }`
- `Sidebar.tsx` (under Sensor Templates):
  - `ldr`: `{ packageId: "ldr_light", varLight: "lightVal", pin: "A0" }`
  - `soilMoisture`: `{ packageId: "soil_moisture", varMoisture: "moisture", pin: "A1" }`
  - `waterLevel`: `{ packageId: "water_level", varLevel: "waterLevel", pin: "A2" }`
  - `mqGas`: `{ packageId: "mq_gas", varGas: "gasVal", pin: "A3" }`
- `lib/ir/plugin.ts`: Generates code using `params[defaultVar] || defaultVar` where `defaultVar` is `lightVal`, `moisture`, etc.

**Problem**: Every sensor template invented a bespoke parameter key for its output variable (`varLight`, `varMoisture`, `varLevel`, `varGas`).  
**Canonical Schema Solution**: Standardize on canonical parameter names:
```json
{
  "pin": "A0",
  "target": "lightLevel"
}
```

### 2.2 Digital Output Schema (`gpio` vs Actuators)
- `gpio`: `{ "pin": "13", "value": "HIGH" }`
- In `Sidebar.tsx`, `gpio` is labeled "GPIO Write".
- In `graphParser.ts` (line 286), `type === 'gpio'` compiles unconditionally to:
  ```typescript
  callee: 'digitalWrite',
  arguments: [pin, value]
  ```
- **Limitation**: There is no way to perform a `digitalRead()` using canonical nodes. If a user wants to read a push button or digital sensor, they are forced to use an ad-hoc template (`pir`, `ir`, `flame`) that triggers hardcoded plugin strings.

### 2.3 Delay Parameter Divergence
- `Sidebar.tsx`: `{ ms: "500" }`
- `ultrasonic_hcsr04.flow.json`: `{ duration: "2", unit: "us" }`
- `graphParser.ts` (line 273): Handles both via `data.params.duration || data.params.ms || '1000'`.  
**Canonical Schema Solution**: Standardize canonical `delay` on:
```json
{
  "duration": "500",
  "unit": "ms"
}
```

---

## 3. End-to-End Pipeline Tracing

### 3.1 The Ideal Pipeline (Data-Driven & Unified)
In a clean canonical architecture, component packages compose canonical primitives without compiler intervention:

```
Component Package (.flow.json)
      │
      ▼
Flow Canvas (Component Node)
      │
      ▼ [Component Expander]
Splices internal graph: canonical primitives (analog_read, digital_write, delay, etc.)
Pins bound via package declared pins ($PIN1 -> A1). Output mapped to user variable.
      │
      ▼ [Graph Parser]
Translates canonical primitives directly into Universal AST (CallExpression, VariableDeclaration, etc.)
ZERO component checks. ZERO label matching.
      │
      ▼ [Universal AST]
ProgramNode -> FunctionDeclaration / BlockStatement / CallExpression
      │
      ▼ [Target Backend (Arduino / ESP32)]
Emits target C++ (analogRead, digitalWrite, delay). Includes/Setup emitted from package manifest.
```

### 3.2 The Current Fractured Pipeline
Currently, because nodes like `ldr`, `pir`, `soilMoisture` exist alongside canonical nodes, the pipeline contains fragile branching:

```
User drags "LDR Light" from Sidebar
      │
      ▼
nodeType = "ldr" (Component-specific type placed on FlowCanvas)
      │
      ├─► FlowCanvas.tsx: 120-line if (nodeConfig.nodeType === 'ldr') matches label "LDR" to find pin
      │
      ├─► Component Expander: Checks if (label.includes('ldr') || nodeType === 'ldr')
      │     ├── If package matches: Replaces node with subflow (analog_read)
      │     └── If package DOES NOT have subflow (e.g. soilMoisture, waterLevel): Leaves node as "soilMoisture"
      │
      ├─► Graph Parser:
      │     ├── If "analog_read": Compiles to analogRead AST node ✅
      │     └── If "soilMoisture": Hits pluginRegistry fallback -> emits fake soilMoisture.custom() ❌
      │
      └─► Backend:
            └── arduinoBackend.ts: Calls mapLabelToPluginType(label) to guess what sensor it was! ❌
```

---

## 4. Component Package Definitions Audit

### 4.1 `ldr_light.flow.json`
```json
{
  "id": "ldr_light",
  "name": "LDR Light Sensor",
  "nodes": [
    {
      "id": "read_analog",
      "type": "baseNode",
      "data": {
        "label": "Read Light Level",
        "nodeType": "analog_read",
        "params": {
          "pin": "$PIN1",
          "var": "lightLevel",
          "target": "lightLevel"
        }
      }
    },
    {
      "id": "return_light",
      "type": "baseNode",
      "data": {
        "label": "Output Light Level",
        "nodeType": "return",
        "params": { "value": "lightLevel" }
      }
    }
  ]
}
```
**Key Discovery**: Inside `ldr_light.flow.json`, the node type is **ALREADY** `analog_read`!
- The subflow author correctly used the generic primitive `analog_read`.
- The presentation label is `"Read Light Level"`.
- The architectural breakdown occurred because the **Sidebar** defined `{ nodeType: 'ldr' }` instead of instantiating the package, and `graphParser.ts` had duplicate aliases (`sensor`, `analog_read`, `analogRead`).

### 4.2 `ultrasonic_hcsr04.flow.json`
- Contains 9 nodes: `start`, `gpio` (LOW), `delay` (2us), `gpio` (HIGH), `delay` (10us), `gpio` (LOW), `pulse_in` (HIGH), `assignment` (duration * 0.034 / 2), `return` (distance).
- **Proof of Concept**: A complex dual-pin sensor is 100% implemented using only 5 canonical primitives:
  `gpio`, `delay`, `pulse_in`, `assignment`, `return`.
- It requires **ZERO** specialized ultrasonic compiler AST nodes.

### 4.3 Non-migrated Components (`lib/registry/components/`)
All 20 remaining components (`soil_moisture.ts`, `water_level.ts`, `led.ts`, `relay.ts`, etc.) currently have:
`implementation: { type: 'builtin' }`.
Because `digital_read` and `pwm_write` were missing from the canonical primitives set, these components could not yet be expressed as package subflows and were forced to rely on legacy generator hooks.

---

## 5. Separation of Semantics from Presentation

To prevent compiler fragmentation, we establish a strict boundary between the UI Presentation Layer and the Language Semantics Layer:

| UI Presentation Label | Visual Icon | Underlying Canonical `nodeType` | AST Call Expression | Generated Target C++ |
| :--- | :---: | :--- | :--- | :--- |
| **"Read Light Level"** | ☀ Sun | `analog_read` | `CallExpression("analogRead", [pin])` | `analogRead(A0)` |
| **"Read Water Level"** | 💧 Droplet | `analog_read` | `CallExpression("analogRead", [pin])` | `analogRead(A1)` |
| **"Read Soil Moisture"** | 🌱 Sprout | `analog_read` | `CallExpression("analogRead", [pin])` | `analogRead(A2)` |
| **"Read Gas Level"** | 💨 Wind | `analog_read` | `CallExpression("analogRead", [pin])` | `analogRead(A3)` |
| **"Read Motion (PIR)"** | 👁 Eye | `digital_read` | `CallExpression("digitalRead", [pin])` | `digitalRead(2)` |
| **"Read Obstacle (IR)"**| 👁 Eye | `digital_read` | `CallExpression("digitalRead", [pin])` | `digitalRead(3)` |
| **"Read Button State"** | ⬛ Switch | `digital_read` | `CallExpression("digitalRead", [pin])` | `digitalRead(4)` |
| **"Turn LED ON"** | 💡 Bulb | `digital_write` | `CallExpression("digitalWrite", [pin, HIGH])` | `digitalWrite(13, HIGH)` |
| **"Turn Relay ON"** | ⚡ Zap | `digital_write` | `CallExpression("digitalWrite", [pin, HIGH])` | `digitalWrite(7, HIGH)` |
| **"Activate Buzzer"** | 🔔 Bell | `digital_write` | `CallExpression("digitalWrite", [pin, HIGH])` | `digitalWrite(8, HIGH)` |
| **"Set Motor Speed"** | 🔌 Motor | `pwm_write` | `CallExpression("analogWrite", [pin, speed])` | `analogWrite(9, 200)` |

### The Golden Rule:
> **The user can see and search for "Read Light Level" in the UI. But the compiler only ever sees `analog_read`.**

---

## 6. Inventory of Hardcoded Component-Specific Compiler Paths

The following is the exhaustive list of hardcoded component-specific paths across Flow-IDE that must be refactored before Phase 6B:

### 1. `lib/compiler/packages/componentExpander.ts`
- **Lines 94–100**: Heuristic label matching:
  ```typescript
  if (label.includes('ultrasonic')) pkgResolved = resolvePackageImplementation('ultrasonic_hcsr04', targetId);
  else if (label.includes('ldr') || label.includes('light')) pkgResolved = resolvePackageImplementation('ldr_light', targetId);
  ```
- **Lines 280–286**: Component-specific string checks for matching schema nodes:
  ```typescript
  (packageId === 'ldr_light' && (sType === 'ldr' || sType === 'ldr_light' || sLabel.includes('ldr') || sLabel.includes('light'))) ||
  (packageId === 'ultrasonic_hcsr04' && (sType === 'ultrasonic' || sType === 'ultrasonic_hcsr04' || sType === 'hcsr04' || sLabel.includes('ultrasonic')))
  ```
- **Lines 386–395**: Hardcoded sensor pin name aliases (`ao`, `signal`, `trigpin`, `echopin`).
- **Lines 406–419**: Hardcoded placeholder aliases (`$PIN`, `$AO`, `$SIGNAL`, `$TRIGPIN`, `$ECHOPIN`).
- **Lines 425–441**: Hardcoded fallback pin values (`$TRIG -> '9'`, `$ECHO -> '10'`, `$PIN1 -> 'A0'`).

### 2. `lib/compiler/packages/packageResolver.ts`
- **Lines 63–67**: Heuristic string alias matching:
  ```typescript
  if (pkgOrId.includes('ultrasonic') || pkgOrId === 'hcsr04') pkg = getComponentPackage('ultrasonic_hcsr04');
  else if (pkgOrId === 'ldr' || pkgOrId.includes('ldr_light') || pkgOrId.includes('ldr')) pkg = getComponentPackage('ldr_light');
  ```

### 3. `lib/compiler/backend/arduinoBackend.ts` & `esp32Backend.ts`
- **Line 79 (Arduino) / Line 72 (ESP32)**:
  ```typescript
  const pluginType = mapLabelToPluginType(conn.componentLabel) || 
    (packageId === 'ldr_light' ? 'ldr' : packageId === 'ultrasonic_hcsr04' ? 'ultrasonic' : packageId) || 
    conn.componentType;
  ```

### 4. `lib/compiler/backend/baseCppGenerator.ts`
- **Lines 140–155 & 200–220**: Hardcoded sensor pin names:
  `pinsMap['trig']`, `pinsMap['echo']`, `pinsMap['trigPin']`, `pinsMap['echoPin']`, `pinsMap['$TRIG']`, `pinsMap['$ECHO']`.

### 5. `lib/compiler/parser/graphParser.ts`
- **Line 319**: Accepts three different alias names for the same node:
  ```typescript
  } else if (type === 'sensor' || type === 'analog_read' || type === 'analogRead') {
  ```
- **Line 286**: `gpio` is strictly hardcoded to `digitalWrite` (no digital read support).
- **Line 334**: Emits invalid `${type}.custom(...)` call expression for unexpanded sensor templates.

### 6. `lib/ir/plugin.ts`
- **Lines 3–20**: `mapLabelToPluginType` contains string checks for `dht`, `ultrasonic`, `hcsr04`, `servo`, `lcd`, `oled`, `ldr`, `soil`, `water`, `gas`, `pir`, `ir`, `vibration`, `flame`, `l298n`, `l293d`.
- **Lines 314–389**: `registerAnalogSensor` and `registerDigitalSensor` maintaining ad-hoc parallel C++ codegen.

### 7. `components/editor/Sidebar.tsx`
- **Lines 55–78**: Hardcodes 15 separate component nodes under "Sensor Templates" and "Control Devices" with ad-hoc `nodeType` values (`dht`, `ultrasonic`, `pir`, `ldr`, `ir`, `flame`, `soilMoisture`, `waterLevel`, `mqGas`, `vibration`, `servo`, `lcd`, `oled`, `l298n`, `l293d`).

### 8. `components/editor/FlowCanvas.tsx`
- **Lines 330–452**: 122 lines of ad-hoc pin auto-mapping:
  `if (nodeConfig.nodeType === 'ultrasonic') ... else if (nodeConfig.nodeType === 'dht') ... else if (nodeConfig.nodeType === 'ldr') ...`

### 9. `components/nodes/BaseNode.tsx` & `PropertiesPanel.tsx`
- Contains hardcoded icon and description switch-cases for all 15 component template types.

---

## 7. Canonical Primitive Instruction Set & Phase 6B Architecture

To eliminate all component-specific compiler paths, Flow-IDE must establish the following canonical instruction set:

### 7.1 Minimal Canonical Primitive Set

```
Canonical Flow-IDE Instruction Set
├── Control Flow
│   ├── start            (Execution entry point)
│   ├── end              (Execution terminal)
│   ├── return           (Subflow/Function return value)
│   ├── condition        (Boolean Branch: If / Else)
│   └── loop             (Iteration: For / While)
├── Timing
│   └── delay            (Duration + Unit: ms / us)
├── Digital I/O
│   ├── digital_read     (NEW: pin -> target variable)
│   └── digital_write    (Renamed from gpio: pin + value)
├── Analog & PWM I/O
│   ├── analog_read      (pin -> target variable)
│   └── pwm_write        (NEW: pin + dutyCycle expression)
├── Signal Timing
│   └── pulse_in         (pin + state -> duration variable)
├── Data & State
│   ├── variable         (type + name + initial value)
│   └── assignment       (target variable = expression)
├── Modular Logic
│   ├── function         (Function definition + inputs/outputs)
│   └── function_call    (Function invocation + argument binding)
└── Stream I/O
    ├── print            (Serial.println / Serial.print)
    └── input            (Serial.parseInt)
```

### 7.2 Step-by-Step Refactoring Map for Phase 6B

1. **Step 1: Formalize Canonical Hardware Primitives in `graphParser.ts`**
   - Add first-class support for `digital_read`:
     Compiles to `VariableDeclaration` or `Assignment` with `callee: 'digitalRead', arguments: [pin]`.
   - Add first-class support for `pwm_write`:
     Compiles to `ExpressionStatement` with `callee: 'analogWrite', arguments: [pin, value]`.
   - Support `digital_write` (and keep `gpio` as backward-compatible alias).
   - Standardize `analog_read` (and keep `sensor` as legacy alias).

2. **Step 2: Generic Pin Auto-Mapping in `FlowCanvas.tsx`**
   - Replace the 120 lines of `if (nodeType === 'ldr') ... else if (nodeType === 'ultrasonic')` with generic metadata-driven pin auto-mapping:
     Read `packageDef.pins` -> find matching unused board pin of the required `signal` type (`analog_output`, `digital_output`, `pwm`, etc.).

3. **Step 3: Clean Expander & Backend Heuristics**
   - In `componentExpander.ts`, eliminate label string matching (`label.includes('ldr')`). The expander matches strictly on `packageId` and package pin declarations (`pkgDef.pins`).
   - In `arduinoBackend.ts` and `esp32Backend.ts`, eliminate `mapLabelToPluginType`. Subflows expand to canonical AST nodes; native dependencies emit from `pkgDef.dependencies`.

4. **Step 4: Migrate Level 1 & Level 2 Components (Phase 6B)**
   - Now that `analog_read`, `digital_read`, and `digital_write` exist as canonical primitives, author `.flow.json` subflows for:
     - **Analog Sensors**: `water_level`, `soil_moisture`, `mq_gas` (identical 2-node subflow as `ldr_light`: `analog_read` -> `return`).
     - **Digital Actuators**: `led`, `relay`, `buzzer` (`digital_write`).
     - **Digital Sensors**: `pir_motion`, `ir_obstacle`, `vibration_sensor`, `push_button` (`digital_read` -> `return`).
   - Each package provides its own friendly label ("Read Water Level", "Turn LED ON") while composing identical, canonical compiler primitives.

---

## Conclusion

By executing this Canonical Node Architecture refactoring, Flow-IDE completely decouples presentation from compiler semantics. The component library can scale to hundreds of sensors and actuators without adding a single line of component-specific code to the compiler pipeline.
