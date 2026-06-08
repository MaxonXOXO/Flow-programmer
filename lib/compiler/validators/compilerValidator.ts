import { Node, Edge } from '@xyflow/react';
import { ProgramNode } from '../ast/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { SemanticAnalyzer, ValidationError } from '../semantic/semanticAnalyzer';
import { mapLabelToPluginType } from '../../ir/plugin';
import { getBoardDefinition, BoardDefinition } from '../../registry/boards';

export class CompilerValidator {
  private errors: ValidationError[] = [];
  private globalScope: SymbolTable = new SymbolTable(null, 'global');

  public validate(
    program: ProgramNode,
    schemaNodes: Node[],
    schemaEdges: Edge[],
    boardId: string = 'arduino_uno'
  ): ValidationError[] {
    this.errors = [];
    this.globalScope.clear();

    const board = getBoardDefinition(boardId) || getBoardDefinition('arduino_uno')!;

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

  private validateHardwareSchema(schemaNodes: Node[], schemaEdges: Edge[], board: BoardDefinition) {
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

      const pinDef = board.pins[unoPin];
      if (!pinDef) {
        this.errors.push({
          severity: 'error',
          message: `Pin "${unoPin}" does not exist on MCU "${board.name}".`,
          nodeId: compNode.id
        });
        return;
      }

      if (pinDef.capabilities.includes('uart_rx') || pinDef.capabilities.includes('uart_tx')) {
        this.errors.push({
          severity: 'warning',
          message: `Pin "${unoPin}" is reserved for Serial (RX/TX). Using it might conflict with programming / debug console logs.`,
          nodeId: compNode.id
        });
      }

      const key = unoPin;
      if (!pinAllocation[key]) {
        pinAllocation[key] = [];
      }
      pinAllocation[key].push(compNode.id);

      const isAnalogCompPin = compPin.toLowerCase().startsWith('a') || compPin.toLowerCase() === 'ao' || compPin.toLowerCase() === 'analog';
      const isDigitalCompPin = compPin.toLowerCase().startsWith('d') || compPin.toLowerCase() === 'do' || compPin.toLowerCase() === 'digital' || compPin.toLowerCase() === 'signal';

      if (isAnalogCompPin && !pinDef.capabilities.includes('analog')) {
        this.errors.push({
          severity: 'error',
          message: `Analog pin "${compPin}" on component "${(compNode.data as any)?.label}" connected to non-analog pin "${unoPin}" on ${board.name}.`,
          nodeId: compNode.id
        });
      }

      if (isDigitalCompPin && !pinDef.capabilities.includes('digital') && !pinDef.capabilities.includes('analog')) {
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
        const pinDef = board.pins[pinId];
        const canShare = pinDef?.capabilities.includes('power') || pinDef?.capabilities.includes('i2c_sda') || pinDef?.capabilities.includes('i2c_scl') || pinDef?.capabilities.includes('spi_mosi') || pinDef?.capabilities.includes('spi_miso') || pinDef?.capabilities.includes('spi_sck');
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

