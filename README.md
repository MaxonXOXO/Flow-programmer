# ⚡ Flow-IDE: Visual Programming Environment for Arduino

**Flow-IDE** is a professional, node-based visual development environment designed to simplify microcontroller programming. By combining a **Hardware Schema Designer** and a **Logic Flow Editor** with a custom **AST-driven compiler**, Flow-IDE allows developers to visually wire hardware components, design sequential algorithms, simulate execution, and compile clean, production-ready Arduino C++ code.

---

## 🚀 Key Features

* **🎨 Hardware Schema Designer**: Visually wire sensors, actuator templates (DHT, PIR, Moisture, Gas, L298N Motor Drivers, LCDs), and power pins directly to an interactive microcontroller board.
* **🔁 Logic Flow Editor**: Program microcontroller behaviors using structured flowchart elements including control statements (`If Condition`, `For Loop`), delays, GPIO operations, and variables.
* **🧩 Modular Sub-Flows (Function Definition vs Call)**: 
  * Define reusable logic by creating **Function Definition** nodes. Double-click to design their internal operations in a nested subflow view.
  * Invoke them anywhere on the main canvas with **Function Call** nodes, which dynamically adapt to accept arguments and assign outputs to variables.
* **🧠 AST-Driven Compiler Core**:
  * **Parser**: Converts visual canvas graphs into a standard Abstract Syntax Tree (AST).
  * **Semantic Analyzer**: Performs compile-time checks (variable scopes, function signatures, argument validation, and return type checking).
  * **Code Generator**: Translates the checked AST into clean, scoped, optimized Arduino C++ code.
* **💻 Interactive Simulation Engine**: Run and step through visual code logic with real-time state inspections, variable tracing, and edge animations directly on the canvas.
* **✨ Modern Neon UI**: High-fidelity dark mode interface equipped with responsive property inspectors, custom node themes, and inline **Quick Edit** panels.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [Next.js](https://nextjs.org/) (React)
* **Canvas Engine**: [React Flow](https://reactflow.dev/) (interactive custom nodes, connection routing, viewport management)
* **Icons**: [Lucide React](https://lucide.dev/)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Styling**: Tailwind CSS & CSS Variables (Neon Dark Mode system)
* **Compiler Layer**: TypeScript AST representation, semantic analyser, and transpiler pipeline.

---

## 📂 Project Structure

```bash
├── app/                  # Next.js App Router & main editor entrypoints
├── components/
│   ├── editor/           # Canvas controllers, Properties Inspector, Quick Edit panels
│   ├── nodes/            # Custom React Flow nodes (BaseNode, Start, End, etc.)
│   └── schema/           # Hardware Schema design canvas and board models
├── lib/
│   └── compiler/
│       ├── ast/          # Abstract Syntax Tree type definitions
│       ├── parser/       # Graph-to-AST parser & expression parser
│       ├── semantic/     # Semantic validation rules & scope analyser
│       ├── generator/    # Arduino C++ code transpile engine
│       └── runtime/      # Virtual simulation state and step execution engine
├── store/                # Zustand global state store
└── public/               # Static assets & component icons
```

---

## ⚡ Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later)
* npm, yarn, or pnpm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/flow-programmer.git
   cd flow-programmer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the local development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to access the editor.

### Compiling to Hardware
1. Connect components on the **Schema Designer** tab.
2. Build your program logic on the **Logic Editor** tab.
3. Click **Code Output** in the top-right toolbar.
4. Copy the compiled C++ code into your Arduino IDE and upload it to your board!
