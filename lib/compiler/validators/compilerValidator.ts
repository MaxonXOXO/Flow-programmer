import { Node, Edge } from '@xyflow/react';
import { ProgramNode } from '../ast/ast';
import { SymbolTable } from '../symbols/symbolTable';
import { SemanticAnalyzer, ValidationError } from '../semantic/semanticAnalyzer';
import { mapLabelToPluginType } from '../../ir/plugin';
import { getBoardDefinition, BoardDefinition } from '../../registry/boards';
import { getComponentPackage } from '../../registry/components';

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

      const isSourceBoard = sourceNode.type === 'boardNode' || sourceNode.type === 'unoNode' || sourceNode.id === 'arduino-uno' || sourceNode.id === 'board';
      const boardPin = isSourceBoard ? edge.sourceHandle : edge.targetHandle;
      const compNode = isSourceBoard ? targetNode : sourceNode;
      const compPin = isSourceBoard ? edge.targetHandle : edge.sourceHandle;

      if (!boardPin || !compNode || !compPin) return;

      const pinDef = board.pins[boardPin];
      if (!pinDef) {
        this.errors.push({
          severity: 'error',
          message: `Pin "${boardPin}" does not exist on MCU "${board.name}".`,
          nodeId: compNode.id
        });
        return;
      }

      if (pinDef.capabilities.includes('uart_rx') || pinDef.capabilities.includes('uart_tx')) {
        this.errors.push({
          severity: 'warning',
          message: `Pin "${boardPin}" is reserved for Serial (RX/TX). Using it might conflict with programming / debug console logs.`,
          nodeId: compNode.id
        });
      }

      const key = boardPin;
      if (!pinAllocation[key]) {
        pinAllocation[key] = [];
      }
      pinAllocation[key].push(compNode.id);

      const compData = compNode.data as any;
      const compPkg = compData?.definition || (compData?.params?.packageId ? getComponentPackage(compData.params.packageId) : undefined);
      const declaredPin = compPkg?.pins?.find((p: any) => p.id?.toLowerCase() === compPin.toLowerCase());
      const declaredSignal = declaredPin?.signal?.toLowerCase() || '';

      const isAnalogCompPin = 
        declaredSignal === 'analog_output' ||
        declaredSignal === 'analog_input' ||
        declaredSignal === 'analog' ||
        /^a\d+$/i.test(compPin) || 
        compPin.toLowerCase() === 'ao' || 
        compPin.toLowerCase() === 'analog' || 
        compPin.toLowerCase() === 'adc' ||
        (compPin.toLowerCase() === 'pin1' && ((compNode.data as any)?.label?.toLowerCase().includes('ldr') || compNode.id.includes('ldr')));

      const isDigitalCompPin = 
        declaredSignal === 'digital_output' ||
        declaredSignal === 'digital_input' ||
        declaredSignal === 'digital' ||
        /^d\d+$/i.test(compPin) || 
        compPin.toLowerCase() === 'do' || 
        compPin.toLowerCase() === 'digital' || 
        compPin.toLowerCase() === 'signal' || 
        compPin.toLowerCase() === 'din' || 
        compPin.toLowerCase() === 'dout';

      if (isAnalogCompPin && !pinDef.capabilities.includes('analog')) {
        this.errors.push({
          severity: 'error',
          message: `Analog pin "${compPin}" on component "${(compNode.data as any)?.label}" connected to non-analog pin "${boardPin}" on ${board.name}.`,
          nodeId: compNode.id
        });
      }

      if (isDigitalCompPin && !pinDef.capabilities.includes('digital') && !pinDef.capabilities.includes('analog')) {
        this.errors.push({
          severity: 'error',
          message: `Digital pin "${compPin}" on component "${(compNode.data as any)?.label}" connected to non-digital pin "${boardPin}" on ${board.name}.`,
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

