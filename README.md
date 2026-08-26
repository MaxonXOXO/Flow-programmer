# ⚡ Flow-IDE: Universal Visual Programming Environment & Compiler for Embedded Systems

**Flow-IDE** is a professional, node-based visual development environment and compiler pipeline for embedded microcontrollers. By unifying a **Data-Driven Hardware Schema Designer**, a **Logic Flowchart Editor**, and an **Extensible Universal AST Compiler Backend**, Flow-IDE enables developers to visually wire physical electronics, customize component implementations via editable subflows, simulate behavior in real-time, and compile target-specific, production-ready embedded C++ code.

---

## 🚀 Key Features

### 🎨 1. Data-Driven Hardware Schema Canvas (`BoardNode`)
* **Dynamic Board Resolution**: Authoritatively renders boards from project hardware declarations (`hardware: { boardId, targetId }`).
* **Multi-MCU Support**: Built-in canonical board definitions for:
  * **Arduino Uno** (ATmega328P · AVR)
  * **Arduino Mega 2560** (ATmega2560 · AVR)
  * **ESP32 DevKitC** (ESP32-WROOM-32 · Xtensa Dual-Core)
  * **NodeMCU V2** (ESP8266EX · Tensilica)
  * **STM32 BluePill** (STM32F103C8T6 · ARM Cortex-M3)
  * **Raspberry Pi Pico** (RP2040 · Dual ARM Cortex-M0+)
* **Semantic Pin Capability System**: Automatic badging and handle styling for **PWM**, **ADC**, **DAC**, **I2C**, **SPI**, **UART**, **Touch**, **Power**, and **Ground**.
* **Visual Wire Routing**: Interactive connection rails between sensor breakout pins and board pin headers.

### 🔁 2. Logic Flow Editor & Modular Subflows
* **Sequential Flow Programming**: Construct algorithms using visual flow nodes: `Start`, `End`, `GPIO`, `Delay`, `If / Else Conditions`, `For Loops`, `Assignments`, `Variables`, and `Print`.
* **Component Subflow Overrides (Whitebox Hardware)**:
  * Double-click any sensor or actuator to open its internal driver subflow in a read-only viewer.
  * **Unlock & Customize**: Modify internal driver logic (e.g. adjust trigger pulse width, calibration offsets, or custom filtering).
  * **Deterministic Persistence**: Subflow modifications are saved locally to the `.flow` project as instance-scoped overrides and seamlessly pass to the compiler.
  * **Revert Semantics**: Discard modifications at any time to restore the package template without mutating global definitions.

### 🧠 3. Target-Aware Compiler Backend Architecture
* **Universal AST**: Graph-to-AST parsing produces a clean, target-agnostic Universal Abstract Syntax Tree.
* **Pluggable `CompilerBackend` Pipeline**:
  ```
  Flow Graph ──> Component Expansion ──> Universal AST ──> Target Resolution ──> CompilerBackend ──> Target C++
  ```
* **Supported Backends**:
  * **Arduino C++ Backend** (`Platform: Arduino Uno / Mega 2560`, 9600 baud)
  * **ESP32 Arduino Backend** (`Platform: ESP32 (Arduino Framework)`, 115200 baud, native `#include <Arduino.h>`)
* **Backend Capability Model**: Validates whether target hardware natively supports AST primitives (e.g. enforcing PWM/DAC requirements on ESP32 rather than AVR `analogWrite`).
* **Strict Resolution**: Decoupled from board names; throws explicit diagnostics for unsupported targets without silent fallbacks.

### 💾 4. Native `.flow` (v2) Project Format
* **Self-Contained Projects**: Stores project metadata, hardware configuration (`boardId`, `targetId`), flow canvas graphs, schema topology, subflow documents, and instance-specific component overrides.
* **Automated Migration**: Transparently upgrades legacy v1 JSON dumps to the canonical v2 schema on import.

### 💻 5. Virtual Simulation Engine & Live Inspection
* **Real-Time Stepping**: Step-by-step execution tracer with variable state inspection, active execution frame visualization, and animated flow edges.
* **Component State Isolation**: Peripheral simulation engine isolates hardware components and simulates sensor/actuator interactions.

---

## 🛠️ Technology Stack

* **Frontend Engine**: [Next.js](https://nextjs.org/) (React 18 / 19, TypeScript)
* **Visual Graph Canvas**: [React Flow (@xyflow/react)](https://reactflow.dev/) (Loose connection mode, custom handles, interactive PCB silkscreen)
* **Code Editor & Tokenizer**: Monaco Editor & custom Lexer/Parser for bidirectional C++ AST sync
* **State Management**: [Zustand](https://github.com/pmndrs/zustand) with deep clone isolation & deterministic history stack
* **Icons & Styling**: Lucide React & Neon Dark Theme Design System

---

## 📂 Project Architecture

```bash
flow-programmer/
├── components/
│   ├── editor/           # Workspace, Activity Bar, Properties Inspector, CodePanel
│   ├── nodes/            # Flowchart execution nodes (Start, Loop, GPIO, Delay, etc.)
│   └── schema/           # Schema Designer, BoardNode (PCB renderer), ComponentNode
├── lib/
│   ├── compiler/
│   │   ├── ast/          # Universal Abstract Syntax Tree definitions
│   │   ├── backend/      # CompilerBackend interface, Registry, BaseCpp, Arduino & ESP32 backends
│   │   ├── generator/    # Target generator adapters
│   │   ├── packages/     # Package Graph Resolver, Instantiator, & Dispatcher
│   │   ├── parser/       # GraphToASTCompiler & expression parser
│   │   ├── runtime/      # Virtual SimulationEngine & execution frames
│   │   └── validators/   # Hardware pin capability & semantic validators
│   ├── project/          # FlowProject schema (v2), ProjectManager, HardwareValidator
│   └── registry/
│       ├── boards/       # Canonical Board, MCU, Architecture, Target, & Pin capabilities
│       └── components/   # Component Packages (sensors, actuators, displays, motor drivers)
├── store/                # Zustand global state store (userFlowStore)
└── scratch/              # Regression test suites (15+ automated suites)
```

---

## ⚡ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later)
* `npm`, `pnpm`, or `yarn`

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/MaxonXOXO/Flow-programmer.git
   cd Flow-programmer/Flow/flow-programmer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Flow-IDE maintains a strict automated test suite covering all hardware models, compiler backends, subflow lifecycles, and serialization contracts:

```bash
# Run all automated test suites
npx tsx scratch/test-target-aware-backends.ts
npx tsx scratch/test-generic-board-renderer.ts
npx tsx scratch/test-project-hardware-contract.ts
npx tsx scratch/test-canonical-hardware-model.ts
npx tsx scratch/test-subflow-override-persistence.ts
npx tsx scratch/test-subflow-override-lifecycle.ts
npx tsx scratch/test-canonical-package-contract.ts
npx tsx scratch/test-project-manager.ts

# TypeScript Typecheck
npx tsc --noEmit
```

---

## 🗺️ Roadmap & Architectural Phases

- [x] **Phase 5A–5G**: Component Subflow Document Model, Unlock Flow, and Project Override Persistence
- [x] **Phase 5H**: Canonical Package Manifest & Target-Aware Package Strategy
- [x] **Phase 5I–5K**: Component Library Audit & Canonical Board/MCU/Target Pin Capability Model
- [x] **Phase 5L**: Project Hardware Contract (`hardware: { boardId, targetId }`) & Generic `BoardNode` Renderer
- [x] **Phase 5M**: Pluggable `CompilerBackend` Architecture & Multi-Target Code Generation (Arduino + ESP32)
- [ ] **Phase 6A**: Level 1 Component Library Migration (LDR, Water, MQ Gas, Soil, LED, Relay, Buzzer)
- [ ] **Phase 6B**: Level 2 Component Migration (PIR, IR Obstacle, Vibration, Push Button, Flame Sensor, L298N, L293D)
- [ ] **Phase 7**: Package Manager & Component Store

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
