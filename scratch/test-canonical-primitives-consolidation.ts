import { GraphToASTCompiler } from '../lib/compiler/parser/graphParser';
import { normalizeFlowGraph, normalizeFlowGraphNode } from '../lib/compiler/parser/nodeNormalizer';
import { expandComponentGraphs } from '../lib/compiler/packages/componentExpander';
import { resolvePackageImplementation } from '../lib/compiler/packages/packageResolver';
import { resolveBackendForTarget } from '../lib/compiler/backend/registry';
import { getComponentPackage } from '../lib/registry/components';
import { Node, Edge } from '@xyflow/react';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

function generateArduinoCode(ast: any, schemaNodes: any[] = [], schemaEdges: any[] = []): string {
  const backend = resolveBackendForTarget('arduino_uno');
  const result = backend.generate(ast, {
    targetId: 'arduino_uno',
    boardId: 'arduino_uno',
    schemaNodes,
    schemaEdges,
  });
  return result.main;
}

async function runTests() {
  console.log('=== PHASE 6A.3: CANONICAL PRIMITIVES CONSOLIDATION & REGRESSION SUITE ===\n');

  // --------------------------------------------------------------------------
  // TEST 1: Canonical analog_read Primitive
  // --------------------------------------------------------------------------
  console.log('--- 1. Canonical analog_read Primitive ---');
  {
    const nodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'ar1', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'analog_read', params: { pin: 'A0', target: 'lightLevel' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'ar1', sourceHandle: 'flow' },
      { id: 'e2', source: 'ar1', target: 'end', sourceHandle: 'flow' },
    ];

    const compiler = new GraphToASTCompiler(nodes, edges);
    const ast = compiler.compile();
    assert(ast.kind === 'Program', 'AST produces Program node');

    const varDecl = ast.body.find((s: any) => s.kind === 'VariableDeclaration' && s.name === 'lightLevel') as any;
    assert(!!varDecl, 'AST contains VariableDeclaration for "lightLevel"');
    assert(varDecl?.value?.kind === 'CallExpression', 'Value is CallExpression');
    assert(varDecl?.value?.callee === 'analogRead', 'Callee is "analogRead"');

    const code = generateArduinoCode(ast, [], []);
    assert(code.includes('int lightLevel = analogRead(A0);'), 'Arduino backend emits int lightLevel = analogRead(A0);');
  }

  // --------------------------------------------------------------------------
  // TEST 2: Canonical digital_read Primitive
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Canonical digital_read Primitive ---');
  {
    const nodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'dr1', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'digital_read', params: { pin: '2', target: 'motionDetected' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'dr1', sourceHandle: 'flow' },
      { id: 'e2', source: 'dr1', target: 'end', sourceHandle: 'flow' },
    ];

    const compiler = new GraphToASTCompiler(nodes, edges);
    const ast = compiler.compile();

    const varDecl = ast.body.find((s: any) => s.kind === 'VariableDeclaration' && s.name === 'motionDetected') as any;
    assert(!!varDecl, 'AST contains VariableDeclaration for "motionDetected"');
    assert(varDecl?.value?.callee === 'digitalRead', 'Callee is "digitalRead"');

    const code = generateArduinoCode(ast, [], []);
    assert(code.includes('int motionDetected = digitalRead(2);'), 'Arduino backend emits int motionDetected = digitalRead(2);');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Canonical digital_write Primitive
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Canonical digital_write Primitive ---');
  {
    const nodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'dw1', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'digital_write', params: { pin: '13', value: 'HIGH' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'dw1', sourceHandle: 'flow' },
      { id: 'e2', source: 'dw1', target: 'end', sourceHandle: 'flow' },
    ];

    const compiler = new GraphToASTCompiler(nodes, edges);
    const ast = compiler.compile();

    const callStmt = ast.body.find((s: any) => s.kind === 'ExpressionStatement' && s.expression?.callee === 'digitalWrite');
    assert(!!callStmt, 'AST contains ExpressionStatement calling "digitalWrite"');

    const code = generateArduinoCode(ast, [], []);
    assert(code.includes('digitalWrite(13, HIGH);'), 'Arduino backend emits digitalWrite(13, HIGH);');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Canonical pwm_write Primitive
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Canonical pwm_write Primitive ---');
  {
    const nodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'pwm1', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'pwm_write', params: { pin: '9', value: '200' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'pwm1', sourceHandle: 'flow' },
      { id: 'e2', source: 'pwm1', target: 'end', sourceHandle: 'flow' },
    ];

    const compiler = new GraphToASTCompiler(nodes, edges);
    const ast = compiler.compile();

    const callStmt = ast.body.find((s: any) => s.kind === 'ExpressionStatement' && s.expression?.callee === 'analogWrite');
    assert(!!callStmt, 'AST contains ExpressionStatement calling "analogWrite"');

    const code = generateArduinoCode(ast, [], []);
    assert(code.includes('analogWrite(9, 200);'), 'Arduino backend emits analogWrite(9, 200);');
  }

  // --------------------------------------------------------------------------
  // TEST 5 & 6: Canonical delay Primitive (ms and us)
  // --------------------------------------------------------------------------
  console.log('\n--- 5 & 6. Canonical delay ms and us ---');
  {
    const nodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'delMs', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'delay', params: { duration: '500', unit: 'ms' } } },
      { id: 'delUs', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'delay', params: { duration: '10', unit: 'us' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 300 }, data: { nodeType: 'end' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'delMs', sourceHandle: 'flow' },
      { id: 'e2', source: 'delMs', target: 'delUs', sourceHandle: 'flow' },
      { id: 'e3', source: 'delUs', target: 'end', sourceHandle: 'flow' },
    ];

    const compiler = new GraphToASTCompiler(nodes, edges);
    const ast = compiler.compile();

    const callMs = ast.body.find((s: any) => s.kind === 'ExpressionStatement' && s.expression?.callee === 'delay');
    assert(!!callMs, 'AST contains call to delay() for unit "ms"');

    const callUs = ast.body.find((s: any) => s.kind === 'ExpressionStatement' && s.expression?.callee === 'delayMicroseconds');
    assert(!!callUs, 'AST contains call to delayMicroseconds() for unit "us"');

    const code = generateArduinoCode(ast, [], []);
    assert(code.includes('delay(500);'), 'Arduino backend emits delay(500);');
    assert(code.includes('delayMicroseconds(10);'), 'Arduino backend emits delayMicroseconds(10);');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Canonical pulse_in Primitive
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Canonical pulse_in Primitive ---');
  {
    const nodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'pi1', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'pulse_in', params: { pin: '10', value: 'HIGH', target: 'durationUs' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'pi1', sourceHandle: 'flow' },
      { id: 'e2', source: 'pi1', target: 'end', sourceHandle: 'flow' },
    ];

    const compiler = new GraphToASTCompiler(nodes, edges);
    const ast = compiler.compile();

    const varDecl = ast.body.find((s: any) => s.kind === 'VariableDeclaration' && s.name === 'durationUs') as any;
    assert(!!varDecl, 'AST contains VariableDeclaration for "durationUs"');
    assert(varDecl?.value?.callee === 'pulseIn', 'Callee is "pulseIn"');

    const code = generateArduinoCode(ast, [], []);
    assert(code.includes('long durationUs = pulseIn(10, HIGH);'), 'Arduino backend emits long durationUs = pulseIn(10, HIGH);');
  }

  // --------------------------------------------------------------------------
  // TEST 8, 9, 10: Ingestion Boundary Normalization (gpio, sensor, analogRead)
  // --------------------------------------------------------------------------
  console.log('\n--- 8, 9, 10. Boundary Normalization of Legacy Aliases ---');
  {
    // Legacy gpio -> digital_write
    const legacyGpioNode: Node = {
      id: 'g1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'gpio', params: { pin: '8', state: 'HIGH' } }
    };
    const normGpio = normalizeFlowGraphNode(legacyGpioNode);
    assert((normGpio.data as any).nodeType === 'digital_write', 'Legacy "gpio" normalized to "digital_write"');
    assert((normGpio.data as any).params.value === 'HIGH', 'state "HIGH" normalized to value "HIGH"');

    // Legacy sensor -> analog_read
    const legacySensorNode: Node = {
      id: 's1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'sensor', params: { pin: 'A2', var: 'mySensorVal' } }
    };
    const normSensor = normalizeFlowGraphNode(legacySensorNode);
    assert((normSensor.data as any).nodeType === 'analog_read', 'Legacy "sensor" normalized to "analog_read"');
    assert((normSensor.data as any).params.target === 'mySensorVal', 'var normalized to target');

    // Legacy analogRead -> analog_read
    const legacyAnalogReadNode: Node = {
      id: 'ar1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'analogRead', params: { pin: 'A3', var: 'reading' } }
    };
    const normAnalogRead = normalizeFlowGraphNode(legacyAnalogReadNode);
    assert((normAnalogRead.data as any).nodeType === 'analog_read', 'Legacy "analogRead" normalized to "analog_read"');
    assert((normAnalogRead.data as any).params.target === 'reading', 'var normalized to target');

    // Legacy delay with ms param
    const legacyDelayNode: Node = {
      id: 'd1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'delay', params: { ms: '250' } }
    };
    const normDelay = normalizeFlowGraphNode(legacyDelayNode);
    assert((normDelay.data as any).params.duration === '250', 'Legacy ms normalized to duration');
    assert((normDelay.data as any).params.unit === 'ms', 'Default unit set to "ms"');

    // Legacy ldr template node -> component
    const legacyLdrNode: Node = {
      id: 'ldr1',
      type: 'baseNode',
      position: { x: 0, y: 0 },
      data: { nodeType: 'ldr', label: 'LDR Sensor', params: { pin: 'A0', varLight: 'ambientLight' } }
    };
    const normLdr = normalizeFlowGraphNode(legacyLdrNode);
    assert((normLdr.data as any).nodeType === 'component', 'Legacy "ldr" template normalized to "component"');
    assert((normLdr.data as any).params.packageId === 'ldr_light', 'packageId set to "ldr_light"');
    assert((normLdr.data as any).params.target === 'ambientLight', 'varLight harmonized to target');
  }

  // --------------------------------------------------------------------------
  // TEST 11 & 12: LDR & Ultrasonic Package Expansion via Composition
  // --------------------------------------------------------------------------
  console.log('\n--- 11 & 12. LDR and Ultrasonic Package Composition & Expansion ---');
  {
    // 1. LDR Package Composition
    const ldrPkg = getComponentPackage('ldr_light');
    assert(!!ldrPkg, 'LDR package exists in registry');
    assert(ldrPkg?.implementations?.arduino_uno?.strategy === 'graph', 'LDR implementation is graph strategy');

    const ldrSubflow = (ldrPkg?.implementations?.arduino_uno as any)?.graph;
    const ldrNodeTypes = (ldrSubflow?.nodes || []).map((n: any) => n.data?.nodeType);
    assert(ldrNodeTypes.includes('analog_read'), 'LDR internal subflow composes canonical "analog_read"');
    assert(!ldrNodeTypes.includes('sensor'), 'LDR internal subflow contains NO legacy "sensor" type');
    assert(!ldrNodeTypes.includes('ldr'), 'LDR internal subflow contains NO recursive "ldr" type');

    // 2. Ultrasonic Package Composition
    const ultrasonicPkg = getComponentPackage('ultrasonic_hcsr04');
    assert(!!ultrasonicPkg, 'Ultrasonic package exists in registry');
    const ultrasonicSubflow = (ultrasonicPkg?.implementation as any)?.graph || (ultrasonicPkg?.implementations?.arduino_uno as any)?.graph;
    const ultrasonicNodeTypes = (ultrasonicSubflow?.nodes || []).map((n: any) => n.data?.nodeType);
    assert(ultrasonicNodeTypes.includes('digital_write'), 'Ultrasonic subflow composes canonical "digital_write"');
    assert(ultrasonicNodeTypes.includes('pulse_in'), 'Ultrasonic subflow composes canonical "pulse_in"');
    assert(ultrasonicNodeTypes.includes('delay'), 'Ultrasonic subflow composes canonical "delay"');
    assert(!ultrasonicNodeTypes.includes('gpio'), 'Ultrasonic subflow contains NO legacy "gpio" type');
    assert(!ultrasonicNodeTypes.includes('ultrasonic'), 'Ultrasonic subflow contains NO recursive "ultrasonic" type');
  }

  // --------------------------------------------------------------------------
  // TEST 13: Generic Metadata-Driven Pin Placeholder Binding
  // --------------------------------------------------------------------------
  console.log('\n--- 13. Generic Metadata-Driven Pin Placeholder Binding ---');
  {
    const mainNodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      {
        id: 'comp_ldr',
        type: 'baseNode',
        position: { x: 0, y: 100 },
        data: {
          nodeType: 'component',
          params: { packageId: 'ldr_light', pin1: 'A3', target: 'myLight' }
        }
      },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const mainEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'comp_ldr', sourceHandle: 'flow' },
      { id: 'e2', source: 'comp_ldr', target: 'end', sourceHandle: 'flow' },
    ];

    const schemaNodes: Node[] = [
      { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno', label: 'Arduino Uno' } },
      { id: 's_ldr', type: 'componentNode', position: { x: 0, y: 0 }, data: { label: 'LDR Sensor', packageId: 'ldr_light' } },
    ];
    const schemaEdges = [
      { id: 'se1', source: 'board', target: 's_ldr', sourceHandle: 'A3', targetHandle: 'pin1' },
      { id: 'se2', source: 'board', target: 's_ldr', sourceHandle: 'GND', targetHandle: 'pin2' },
    ];

    const expanded = expandComponentGraphs(mainNodes, mainEdges, schemaNodes, schemaEdges);
    const expandedRead = expanded.nodes.find(n => (n.data as any)?.nodeType === 'analog_read');
    assert(!!expandedRead, 'Component expanded to canonical analog_read');
    assert((expandedRead?.data as any)?.params?.pin === 'A3', 'Pin placeholder $pin1 dynamically bound to A3');
    assert((expandedRead?.data as any)?.params?.target === 'myLight', 'Output target bound to myLight');

    const compiler = new GraphToASTCompiler(expanded.nodes, expanded.edges, {}, {}, schemaNodes, schemaEdges);
    const ast = compiler.compile();
    const code = generateArduinoCode(ast, schemaNodes, schemaEdges);
    assert(code.includes('analogRead(A3);'), 'Generated code contains analogRead(A3);');
    assert(code.includes('pinMode(A3, INPUT);'), 'Generated setup contains pinMode(A3, INPUT);');
  }

  // --------------------------------------------------------------------------
  // TEST 14: Multiple Instances of the Same Component Package Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- 14. Multiple Instances of Same Component Isolation ---');
  {
    const mainNodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      {
        id: 'comp_ldr1',
        type: 'baseNode',
        position: { x: 0, y: 100 },
        data: { nodeType: 'component', params: { packageId: 'ldr_light', componentId: 's_ldr1', pin1: 'A0', target: 'lightFront' } }
      },
      {
        id: 'comp_ldr2',
        type: 'baseNode',
        position: { x: 0, y: 200 },
        data: { nodeType: 'component', params: { packageId: 'ldr_light', componentId: 's_ldr2', pin1: 'A2', target: 'lightRear' } }
      },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 300 }, data: { nodeType: 'end' } },
    ];
    const mainEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'comp_ldr1', sourceHandle: 'flow' },
      { id: 'e2', source: 'comp_ldr1', target: 'comp_ldr2', sourceHandle: 'flow' },
      { id: 'e3', source: 'comp_ldr2', target: 'end', sourceHandle: 'flow' },
    ];

    const schemaNodes: Node[] = [
      { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno', label: 'Arduino Uno' } },
      { id: 's_ldr1', type: 'componentNode', position: { x: 0, y: 0 }, data: { label: 'Front LDR', packageId: 'ldr_light' } },
      { id: 's_ldr2', type: 'componentNode', position: { x: 0, y: 0 }, data: { label: 'Rear LDR', packageId: 'ldr_light' } },
    ];
    const schemaEdges = [
      { id: 'se1', source: 'board', target: 's_ldr1', sourceHandle: 'A0', targetHandle: 'pin1' },
      { id: 'se2', source: 'board', target: 's_ldr2', sourceHandle: 'A2', targetHandle: 'pin1' },
    ];

    const expanded = expandComponentGraphs(mainNodes, mainEdges, schemaNodes, schemaEdges);
    const compiler = new GraphToASTCompiler(expanded.nodes, expanded.edges, {}, {}, schemaNodes, schemaEdges);
    const ast = compiler.compile();
    const code = generateArduinoCode(ast, schemaNodes, schemaEdges);

    assert(code.includes('int lightFront = analogRead(A0);'), 'Instance 1 reads A0 into lightFront');
    assert(code.includes('int lightRear = analogRead(A2);'), 'Instance 2 reads A2 into lightRear');
    assert(code.includes('pinMode(A0, INPUT);'), 'Instance 1 sets pinMode(A0, INPUT);');
    assert(code.includes('pinMode(A2, INPUT);'), 'Instance 2 sets pinMode(A2, INPUT);');
  }

  // --------------------------------------------------------------------------
  // TEST 15: No Fake .custom() Fallback & Error on Unexpanded Component
  // --------------------------------------------------------------------------
  console.log('\n--- 15. No Fake .custom() Codegen & Unexpanded Component Error ---');
  {
    const unexpandedNodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      { id: 'c1', type: 'baseNode', position: { x: 0, y: 100 }, data: { nodeType: 'component', params: { packageId: 'unknown_pack' } } },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const unexpandedEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'c1', sourceHandle: 'flow' },
      { id: 'e2', source: 'c1', target: 'end', sourceHandle: 'flow' },
    ];

    let threw = false;
    let errMsg = '';
    try {
      const compiler = new GraphToASTCompiler(unexpandedNodes, unexpandedEdges);
      compiler.compile();
    } catch (err: any) {
      threw = true;
      errMsg = err.message || String(err);
    }

    assert(threw, 'Unexpanded component node correctly throws compilation error');
    assert(errMsg.includes('Unexpanded component node encountered'), 'Error message clearly states unexpanded component');
    assert(!errMsg.includes('.custom'), 'Zero .custom() fallback calls are generated');
  }

  // --------------------------------------------------------------------------
  // TEST 16: Zero Component-Specific Heuristics in Compiler & Backends
  // --------------------------------------------------------------------------
  console.log('\n--- 16. Architecture Cleanliness: Zero Label Matching in Compiler ---');
  {
    const arduinoBackendSrc = fs.readFileSync(path.join(__dirname, '../lib/compiler/backend/arduinoBackend.ts'), 'utf8');
    const esp32BackendSrc = fs.readFileSync(path.join(__dirname, '../lib/compiler/backend/esp32Backend.ts'), 'utf8');
    const expanderSrc = fs.readFileSync(path.join(__dirname, '../lib/compiler/packages/componentExpander.ts'), 'utf8');
    const parserSrc = fs.readFileSync(path.join(__dirname, '../lib/compiler/parser/graphParser.ts'), 'utf8');

    assert(!arduinoBackendSrc.includes('mapLabelToPluginType'), 'arduinoBackend.ts does NOT contain mapLabelToPluginType');
    assert(!esp32BackendSrc.includes('mapLabelToPluginType'), 'esp32Backend.ts does NOT contain mapLabelToPluginType');
    assert(!arduinoBackendSrc.includes("packageId === 'ldr_light' ? 'ldr'"), 'arduinoBackend.ts does NOT contain ternary package heuristics');
    assert(!esp32BackendSrc.includes("packageId === 'ldr_light' ? 'ldr'"), 'esp32Backend.ts does NOT contain ternary package heuristics');

    assert(!expanderSrc.includes("label.includes('ldr')"), 'componentExpander.ts does NOT match labels with includes("ldr")');
    assert(!expanderSrc.includes("label.includes('ultrasonic')"), 'componentExpander.ts does NOT match labels with includes("ultrasonic")');

    assert(!parserSrc.includes("type === 'sensor'"), 'graphParser.ts does NOT branch on legacy "sensor"');
    assert(!parserSrc.includes("type === 'gpio'"), 'graphParser.ts does NOT branch on legacy "gpio"');
    assert(!parserSrc.includes("type === 'analogRead'"), 'graphParser.ts does NOT branch on legacy "analogRead"');
  }

  // --------------------------------------------------------------------------
  // TEST 17: Full Ultrasonic Regression Test
  // --------------------------------------------------------------------------
  console.log('\n--- 17. Full HC-SR04 Ultrasonic End-to-End Regression ---');
  {
    const mainNodes: Node[] = [
      { id: 'start', type: 'baseNode', position: { x: 0, y: 0 }, data: { nodeType: 'start' } },
      {
        id: 'comp_sonar',
        type: 'baseNode',
        position: { x: 0, y: 100 },
        data: {
          nodeType: 'component',
          params: { packageId: 'ultrasonic_hcsr04', trigPin: '9', echoPin: '10', target: 'distanceCm' }
        }
      },
      { id: 'end', type: 'baseNode', position: { x: 0, y: 200 }, data: { nodeType: 'end' } },
    ];
    const mainEdges: Edge[] = [
      { id: 'e1', source: 'start', target: 'comp_sonar', sourceHandle: 'flow' },
      { id: 'e2', source: 'comp_sonar', target: 'end', sourceHandle: 'flow' },
    ];

    const schemaNodes: Node[] = [
      { id: 'board', type: 'boardNode', position: { x: 0, y: 0 }, data: { boardId: 'arduino_uno', label: 'Arduino Uno' } },
      { id: 'sonar', type: 'componentNode', position: { x: 0, y: 0 }, data: { label: 'HC-SR04', packageId: 'ultrasonic_hcsr04' } },
    ];
    const schemaEdges = [
      { id: 'se1', source: 'board', target: 'sonar', sourceHandle: '9', targetHandle: 'trig' },
      { id: 'se2', source: 'board', target: 'sonar', sourceHandle: '10', targetHandle: 'echo' },
    ];

    const expanded = expandComponentGraphs(mainNodes, mainEdges, schemaNodes, schemaEdges);
    const compiler = new GraphToASTCompiler(expanded.nodes, expanded.edges, {}, {}, schemaNodes, schemaEdges);
    const ast = compiler.compile();
    const code = generateArduinoCode(ast, schemaNodes, schemaEdges);

    assert(code.includes('pinMode(9, OUTPUT);'), 'Ultrasonic setup contains pinMode(9, OUTPUT);');
    assert(code.includes('pinMode(10, INPUT);'), 'Ultrasonic setup contains pinMode(10, INPUT);');
    assert(code.includes('digitalWrite(9, LOW);'), 'Ultrasonic emits digitalWrite(9, LOW);');
    assert(code.includes('digitalWrite(9, HIGH);'), 'Ultrasonic emits digitalWrite(9, HIGH);');
    assert(code.includes('pulseIn(10, HIGH);'), 'Ultrasonic emits pulseIn(10, HIGH);');
    assert(code.includes('distanceCm'), 'Ultrasonic binds output variable distanceCm');
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
