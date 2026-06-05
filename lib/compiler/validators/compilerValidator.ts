import { Node, Edge } from '@xyflow/react';
import { ProgramNode } from '../ast/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { SemanticAnalyzer, ValidationError } from '../semantic/semanticAnalyzer';
import { mapLabelToPluginType } from '../../ir/plugin';

export interface BoardConfig {
  id: string;
  name: string;
  pins: {
    id: string;
    type: ('digital' | 'analog' | 'power' | 'i2c' | 'spi')[];
    reserved?: boolean;
  }[];
}

export const ARDUINO_UNO_CONFIG: BoardConfig = {
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

export class CompilerValidator {
  private errors: ValidationError[] = [];
  private globalScope: SymbolTable = new SymbolTable(null, 'global');

  public validate(
    program: ProgramNode,
    schemaNodes: Node[],
    schemaEdges: Edge[],
    board: BoardConfig = ARDUINO_UNO_CONFIG
  ): ValidationError[] {
    this.errors = [];
    this.globalScope.clear();

    // 1. Run Hardware Schematic Validation
    this.validateHardwareSchema(schemaNodes, schemaEdges, board);

    // 2. Register hardware symbols in global scope
    schemaNodes.forEach(node => {
      if (node.id !== 'arduino-uno') {
        const label = ((node.data as any)?.label as string) || node.id;
        const safeName = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const pluginType = mapLabelToPluginType(label) || ((node.data as any)?.componentType as string) || 'device';
        this.globalScope.define({
          kind: 'hardware',
          name: safeName,
          dataType: pluginType,
          nodeId: node.id
        });
      }
    });

    // 3. Run AST Semantic Analysis Validation
    const analyzer = new SemanticAnalyzer();
    const astErrors = analyzer.analyze(program, this.globalScope);
    this.errors.push(...astErrors);

    return this.errors;
  }

  private validateHardwareSchema(schemaNodes: Node[], schemaEdges: Edge[], board: BoardConfig) {
    const pinAllocation: Record<string, string[]> = {};

    schemaEdges.forEach(edge => {
      const sourceNode = schemaNodes.find(n => n.id === edge.source);
      const targetNode = schemaNodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const isSourceUno = sourceNode.id === 'arduino-uno';
      const unoPin = isSourceUno ? edge.sourceHandle : edge.targetHandle;
      const compNode = isSourceUno ? targetNode : sourceNode;
      const compPin = isSourceUno ? edge.targetHandle : edge.sourceHandle;

      if (!unoPin || !compNode || !compPin) return;

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
          message: `Analog pin "${compPin}" on component "${(compNode.data as any)?.label}" connected to non-analog pin "${unoPin}" on ${board.name}.`,
          nodeId: compNode.id
        });
      }

      if (isDigitalCompPin && !boardPin.type.includes('digital') && !boardPin.type.includes('analog')) {
        this.errors.push({
          severity: 'error',
          message: `Digital pin "${compPin}" on component "${(compNode.data as any)?.label}" connected to non-digital pin "${unoPin}" on ${board.name}.`,
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
