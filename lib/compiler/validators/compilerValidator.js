"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerValidator = exports.ARDUINO_UNO_CONFIG = void 0;
const symbolTable_1 = require("../symbols/symbolTable");
const semanticAnalyzer_1 = require("../semantic/semanticAnalyzer");
const plugin_1 = require("../../ir/plugin");
exports.ARDUINO_UNO_CONFIG = {
    id: 'arduino-uno',
    name: 'Arduino Uno',
    pins: [
        { id: 'D0', type: ['digital'], reserved: true }, // RX
        { id: 'D1', type: ['digital'], reserved: true }, // TX
        { id: 'D2', type: ['digital'] },
        { id: 'D3', type: ['digital'] },
        { id: 'D4', type: ['digital'] },
        { id: 'D5', type: ['digital'] },
        { id: 'D6', type: ['digital'] },
        { id: 'D7', type: ['digital'] },
        { id: 'D8', type: ['digital'] },
        { id: 'D9', type: ['digital'] },
        { id: 'D10', type: ['digital'] },
        { id: 'D11', type: ['digital', 'spi'] },
        { id: 'D12', type: ['digital', 'spi'] },
        { id: 'D13', type: ['digital', 'spi'] },
        { id: 'A0', type: ['analog'] },
        { id: 'A1', type: ['analog'] },
        { id: 'A2', type: ['analog'] },
        { id: 'A3', type: ['analog'] },
        { id: 'A4', type: ['analog', 'i2c'] },
        { id: 'A5', type: ['analog', 'i2c'] },
        { id: '5V', type: ['power'] },
        { id: '3.3V', type: ['power'] },
        { id: 'GND', type: ['power'] },
        { id: 'VIN', type: ['power'] }
    ]
};
class CompilerValidator {
    constructor() {
        this.errors = [];
        this.globalScope = new symbolTable_1.SymbolTable(null, 'global');
    }
    validate(program, schemaNodes, schemaEdges, board = exports.ARDUINO_UNO_CONFIG) {
        this.errors = [];
        this.globalScope.clear();
        // 1. Run Hardware Schematic Validation
        this.validateHardwareSchema(schemaNodes, schemaEdges, board);
        // 2. Register hardware symbols in global scope
        schemaNodes.forEach(node => {
            if (node.id !== 'arduino-uno') {
                const label = node.data?.label || node.id;
                const safeName = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const pluginType = (0, plugin_1.mapLabelToPluginType)(label) || node.data?.componentType || 'device';
                this.globalScope.define({
                    kind: 'hardware',
                    name: safeName,
                    dataType: pluginType,
                    nodeId: node.id
                });
            }
        });
        // 3. Run AST Semantic Analysis Validation
        const analyzer = new semanticAnalyzer_1.SemanticAnalyzer();
        const astErrors = analyzer.analyze(program, this.globalScope);
        this.errors.push(...astErrors);
        return this.errors;
    }
    validateHardwareSchema(schemaNodes, schemaEdges, board) {
        const pinAllocation = {};
        schemaEdges.forEach(edge => {
            const sourceNode = schemaNodes.find(n => n.id === edge.source);
            const targetNode = schemaNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode)
                return;
            const isSourceUno = sourceNode.id === 'arduino-uno';
            const unoPin = isSourceUno ? edge.sourceHandle : edge.targetHandle;
            const compNode = isSourceUno ? targetNode : sourceNode;
            const compPin = isSourceUno ? edge.targetHandle : edge.sourceHandle;
            if (!unoPin || !compNode || !compPin)
                return;
            const boardPin = board.pins.find(p => p.id.toUpperCase() === unoPin.toUpperCase());
            if (!boardPin) {
                this.errors.push({
                    severity: 'error',
                    message: `Pin "${unoPin}" does not exist on MCU "${board.name}".`,
                    nodeId: compNode.id
                });
                return;
            }
            if (boardPin.reserved && unoPin.startsWith('D')) {
                this.errors.push({
                    severity: 'warning',
                    message: `Pin "${unoPin}" is reserved for Serial (RX/TX). Using it might conflict with programming / debug console logs.`,
                    nodeId: compNode.id
                });
            }
            const key = boardPin.id;
            if (!pinAllocation[key]) {
                pinAllocation[key] = [];
            }
            pinAllocation[key].push(compNode.id);
            const isAnalogCompPin = compPin.toLowerCase().startsWith('a') || compPin.toLowerCase() === 'ao' || compPin.toLowerCase() === 'analog';
            const isDigitalCompPin = compPin.toLowerCase().startsWith('d') || compPin.toLowerCase() === 'do' || compPin.toLowerCase() === 'digital' || compPin.toLowerCase() === 'signal';
            if (isAnalogCompPin && !boardPin.type.includes('analog')) {
                this.errors.push({
                    severity: 'error',
                    message: `Analog pin "${compPin}" on component "${compNode.data?.label}" connected to non-analog pin "${unoPin}" on ${board.name}.`,
                    nodeId: compNode.id
                });
            }
            if (isDigitalCompPin && !boardPin.type.includes('digital') && !boardPin.type.includes('analog')) {
                this.errors.push({
                    severity: 'error',
                    message: `Digital pin "${compPin}" on component "${compNode.data?.label}" connected to non-digital pin "${unoPin}" on ${board.name}.`,
                    nodeId: compNode.id
                });
            }
        });
        Object.entries(pinAllocation).forEach(([pinId, componentIds]) => {
            const uniqueComponents = Array.from(new Set(componentIds));
            if (uniqueComponents.length > 1) {
                const boardPin = board.pins.find(p => p.id === pinId);
                const canShare = boardPin?.type.includes('power') || boardPin?.type.includes('i2c') || boardPin?.type.includes('spi');
                if (!canShare) {
                    this.errors.push({
                        severity: 'error',
                        message: `Pin Collision: Multiple devices are connected to pin "${pinId}".`
                    });
                }
            }
        });
    }
}
exports.CompilerValidator = CompilerValidator;
