"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const componentExpander_1 = require("../lib/compiler/packages/componentExpander");
const graphParser_1 = require("../lib/compiler/parser/graphParser");
const symbolTable_1 = require("../lib/compiler/symbols/symbolTable");
const semanticAnalyzer_1 = require("../lib/compiler/semantic/semanticAnalyzer");
const arduinoGenerator_1 = require("../lib/compiler/generator/arduinoGenerator");
function runSubflowExpansionTests() {
    console.log('--- STARTING SUBFLOW EXPANSION TESTS (PHASE 4) ---');
    // Input User Flow containing an HC-SR04 Component Package Node
    const userFlowNodes = [
        {
            id: 'start_node',
            type: 'baseNode',
            data: { nodeType: 'start', label: 'Start' },
            position: { x: 0, y: 0 }
        },
        {
            id: 'hcsr04_inst1',
            type: 'componentNode',
            data: {
                label: 'Ultrasonic HC-SR04',
                nodeType: 'ultrasonic',
                params: {
                    trigPin: '9',
                    echoPin: '10',
                    varDist: 'measured_distance'
                }
            },
            position: { x: 200, y: 0 }
        },
        {
            id: 'print_dist',
            type: 'baseNode',
            data: {
                nodeType: 'print',
                params: { message: 'measured_distance' }
            },
            position: { x: 400, y: 0 }
        }
    ];
    const userFlowEdges = [
        {
            id: 'e1',
            source: 'start_node',
            target: 'hcsr04_inst1',
            sourceHandle: 'flow',
            targetHandle: 'flow'
        },
        {
            id: 'e2',
            source: 'hcsr04_inst1',
            target: 'print_dist',
            sourceHandle: 'flow',
            targetHandle: 'flow'
        }
    ];
    const schemaNodes = [
        {
            id: 'arduino-uno',
            type: 'boardNode',
            data: { label: 'Arduino Uno' },
            position: { x: 0, y: 0 }
        },
        {
            id: 'hcsr04_inst1',
            type: 'componentNode',
            data: { label: 'Ultrasonic HC-SR04' },
            position: { x: 100, y: 0 }
        }
    ];
    const schemaEdges = [
        {
            id: 'se1',
            source: 'hcsr04_inst1',
            target: 'arduino-uno',
            sourceHandle: 'trig',
            targetHandle: 'd9'
        },
        {
            id: 'se2',
            source: 'hcsr04_inst1',
            target: 'arduino-uno',
            sourceHandle: 'echo',
            targetHandle: 'd10'
        }
    ];
    // Test 1: Graph Expansion
    console.log('\n[Test 1] Testing expandComponentGraphs()...');
    const expansion = (0, componentExpander_1.expandComponentGraphs)(userFlowNodes, userFlowEdges, schemaNodes, schemaEdges);
    console.log('Expanded Nodes Count:', expansion.nodes.length);
    console.log('Expanded Edges Count:', expansion.edges.length);
    console.log('Has Expanded Components:', expansion.hasExpandedComponents);
    if (!expansion.hasExpandedComponents) {
        throw new Error('Test 1 failed: Component node was not detected for expansion');
    }
    // Verify that the original hcsr04_inst1 node was replaced with expanded internal nodes
    const hasOriginalNode = expansion.nodes.some(n => n.id === 'hcsr04_inst1');
    if (hasOriginalNode) {
        throw new Error('Test 1 failed: Original component node was not replaced by expanded subflow');
    }
    // Verify pin binding ($TRIG -> 9, $ECHO -> 10)
    const gpioHighNode = expansion.nodes.find(n => n.id.includes('trig_high'));
    const gpioHighParams = gpioHighNode?.data?.params || {};
    console.log('Trig HIGH Node params:', gpioHighParams);
    if (gpioHighParams.pin !== '9') {
        throw new Error(`Test 1 failed: Expected $TRIG pin to bind to '9', got '${gpioHighParams.pin}'`);
    }
    const pulseInNode = expansion.nodes.find(n => n.id.includes('pulse_in_echo'));
    const pulseInParams = pulseInNode?.data?.params || {};
    console.log('PulseIn Node params:', pulseInParams);
    if (pulseInParams.pin !== '10') {
        throw new Error(`Test 1 failed: Expected $ECHO pin to bind to '10', got '${pulseInParams.pin}'`);
    }
    // Test 2: AST Compilation from Expanded Graph
    console.log('\n[Test 2] Testing AST Compiler on Expanded Graph...');
    const compiler = new graphParser_1.GraphToASTCompiler(userFlowNodes, userFlowEdges);
    const programAST = compiler.compile();
    console.log('Generated AST Body Statements:', programAST.body.length);
    // Test 3: Semantic Analysis & Symbol Table Scoping
    console.log('\n[Test 3] Testing Symbol Table and Semantic Analysis...');
    const symbolTable = new symbolTable_1.SymbolTable(null, 'global');
    symbolTable.define({ kind: 'variable', name: 'HIGH', type: 'int', scope: 'global' });
    symbolTable.define({ kind: 'variable', name: 'LOW', type: 'int', scope: 'global' });
    symbolTable.define({ kind: 'variable', name: 'measured_distance', type: 'float', scope: 'global' });
    symbolTable.define({ kind: 'function', name: 'delayMicroseconds', returnType: 'void', parameters: [{ dataType: 'int', name: 'us' }] });
    symbolTable.define({ kind: 'function', name: 'pulseIn', returnType: 'unsigned long', parameters: [{ dataType: 'int', name: 'pin' }, { dataType: 'int', name: 'value' }] });
    symbolTable.define({ kind: 'function', name: 'digitalWrite', returnType: 'void', parameters: [{ dataType: 'int', name: 'pin' }, { dataType: 'int', name: 'value' }] });
    symbolTable.define({ kind: 'function', name: 'Serial.print', returnType: 'void', parameters: [{ dataType: 'string', name: 'val' }] });
    symbolTable.define({ kind: 'function', name: 'Serial.println', returnType: 'void', parameters: [{ dataType: 'string', name: 'val' }] });
    const analyzer = new semanticAnalyzer_1.SemanticAnalyzer();
    const errors = analyzer.analyze(programAST, symbolTable);
    console.log('Semantic Validation Errors:', errors);
    const errorList = errors.filter(e => e.severity === 'error');
    if (errorList.length > 0) {
        throw new Error(`Test 3 failed: Semantic analyzer reported ${errorList.length} errors: ${JSON.stringify(errorList)}`);
    }
    // Test 4: Code Generation (Arduino C++)
    console.log('\n[Test 4] Testing Arduino Generator with Expanded Subflow AST...');
    const generator = new arduinoGenerator_1.ArduinoUnoGenerator();
    const codeResult = generator.generate(programAST, schemaNodes, schemaEdges);
    console.log('Generated Arduino Sketch Code:\n\n' + codeResult.main);
    // Assert expected Arduino code constructs generated from graph nodes
    if (!codeResult.main.includes('digitalWrite(9, LOW);')) {
        throw new Error('Test 4 failed: Missing digitalWrite(9, LOW) from expanded subflow');
    }
    if (!codeResult.main.includes('delayMicroseconds(2);')) {
        throw new Error('Test 4 failed: Missing delayMicroseconds(2) from expanded subflow');
    }
    if (!codeResult.main.includes('digitalWrite(9, HIGH);')) {
        throw new Error('Test 4 failed: Missing digitalWrite(9, HIGH) from expanded subflow');
    }
    if (!codeResult.main.includes('delayMicroseconds(10);')) {
        throw new Error('Test 4 failed: Missing delayMicroseconds(10) from expanded subflow');
    }
    if (!codeResult.main.includes('pulseIn(10, HIGH)')) {
        throw new Error('Test 4 failed: Missing pulseIn(10, HIGH) from expanded subflow');
    }
    if (!codeResult.main.includes('measured_distance')) {
        throw new Error('Test 4 failed: Missing bound output variable measured_distance');
    }
    console.log('\n--- ALL SUBFLOW EXPANSION TESTS PASSED SUCCESSFULLY ---');
}
runSubflowExpansionTests();
