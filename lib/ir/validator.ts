import { Program, Statement, Expression, ASTNode, FunctionDeclaration } from './ast';
import { SymbolTable, SymbolInfo } from './symbolTable';
import { pluginRegistry, mapLabelToPluginType } from './plugin';
import { Node, Edge } from '@xyflow/react';

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
}

// 1. MCU Board configurations
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
    { id: 'D0', type: ['digital'], reserved: true }, // RX (Serial)
    { id: 'D1', type: ['digital'], reserved: true }, // TX (Serial)
    { id: 'D2', type: ['digital'] },
    { id: 'D3', type: ['digital'] },
    { id: 'D4', type: ['digital'] },
    { id: 'D5', type: ['digital'] },
    { id: 'D6', type: ['digital'] },
    { id: 'D7', type: ['digital'] },
    { id: 'D8', type: ['digital'] },
    { id: 'D9', type: ['digital'] },
    { id: 'D10', type: ['digital'] },
    { id: 'D11', type: ['digital', 'spi'] }, // MOSI
    { id: 'D12', type: ['digital', 'spi'] }, // MISO
    { id: 'D13', type: ['digital', 'spi'] }, // SCK
    { id: 'A0', type: ['analog'] },
    { id: 'A1', type: ['analog'] },
    { id: 'A2', type: ['analog'] },
    { id: 'A3', type: ['analog'] },
    { id: 'A4', type: ['analog', 'i2c'] }, // SDA
    { id: 'A5', type: ['analog', 'i2c'] }, // SCL
    { id: '5V', type: ['power'] },
    { id: '3.3V', type: ['power'] },
    { id: 'GND', type: ['power'] },
    { id: 'VIN', type: ['power'] }
  ]
};

export class IRValidator {
  private errors: ValidationError[] = [];
  private globalScope: SymbolTable = new SymbolTable();

  public validate(
    program: Program,
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
          name: safeName,
          type: 'hardware',
          dataType: pluginType,
          nodeId: node.id
        });
      }
    });

    // 3. Register standard library functions (Serial, delay, etc.)
    this.registerStandardLibrary();

    // 4. Run AST Scope and Variable Checks
    this.validateAST(program, this.globalScope);

    return this.errors;
  }

  private registerStandardLibrary() {
    this.globalScope.define({ name: 'Serial.println', type: 'function', dataType: 'void' });
    this.globalScope.define({ name: 'Serial.print', type: 'function', dataType: 'void' });
    this.globalScope.define({ name: 'Serial.parseInt', type: 'function', dataType: 'int' });
    this.globalScope.define({ name: 'delay', type: 'function', dataType: 'void' });
    this.globalScope.define({ name: 'digitalWrite', type: 'function', dataType: 'void' });
    this.globalScope.define({ name: 'analogRead', type: 'function', dataType: 'int' });
  }

  private validateHardwareSchema(schemaNodes: Node[], schemaEdges: Edge[], board: BoardConfig) {
    const pinAllocation: Record<string, string[]> = {}; // arduinoPin -> list of component node ids

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

      // Check for reserved pins override
      if (boardPin.reserved && unoPin.startsWith('D')) {
        this.errors.push({
          severity: 'warning',
          message: `Pin "${unoPin}" is reserved for Serial (RX/TX). Using it might conflict with programming / debug console logs.`,
          nodeId: compNode.id
        });
      }

      // Track usage to detect pin collisions
      const key = boardPin.id;
      if (!pinAllocation[key]) {
        pinAllocation[key] = [];
      }
      pinAllocation[key].push(compNode.id);

      // Validate pin type matching (e.g. analog component to digital pin)
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
        // Note: Analog pins can often serve as digital pins (A0-A5 on Arduino Uno)
        this.errors.push({
          severity: 'error',
          message: `Digital pin "${compPin}" on component "${(compNode.data as any)?.label}" connected to non-digital pin "${unoPin}" on ${board.name}.`,
          nodeId: compNode.id
        });
      }
    });

    // Detect pin collisions
    Object.entries(pinAllocation).forEach(([pinId, componentIds]) => {
      const uniqueComponents = Array.from(new Set(componentIds));
      if (uniqueComponents.length > 1) {
        const boardPin = board.pins.find(p => p.id === pinId);
        // Exclude power rails and I2C/SPI pins which can be shared
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

  private validateAST(node: ASTNode, scope: SymbolTable) {
    if (!node) return;

    switch (node.type) {
      case 'Program':
        node.body.forEach(stmt => this.validateAST(stmt, scope));
        break;

      case 'BlockStatement':
        const blockScope = new SymbolTable(scope);
        node.body.forEach(stmt => this.validateAST(stmt, blockScope));
        break;

      case 'VariableDeclaration':
        const success = scope.define({
          name: node.name,
          type: 'variable',
          dataType: node.varType,
          nodeId: node.nodeId
        });
        if (!success) {
          this.errors.push({
            severity: 'error',
            message: `Redeclaration Error: Variable "${node.name}" is already defined in this scope.`,
            nodeId: node.nodeId
          });
        }
        this.validateAST(node.value, scope);
        break;

      case 'AssignmentStatement':
        const symbol = scope.lookup(node.name);
        if (!symbol) {
          this.errors.push({
            severity: 'error',
            message: `Undeclared Variable: Assigning value to undeclared variable "${node.name}".`,
            nodeId: node.nodeId
          });
        }
        this.validateAST(node.value, scope);
        break;

      case 'IfStatement':
        this.validateAST(node.condition, scope);
        this.validateAST(node.consequent, scope);
        if (node.alternate) {
          this.validateAST(node.alternate, scope);
        }
        break;

      case 'ForLoop':
        const loopScope = new SymbolTable(scope);
        this.validateAST(node.init, loopScope);
        this.validateAST(node.condition, loopScope);
        this.validateAST(node.update, loopScope);
        this.validateAST(node.body, loopScope);
        break;

      case 'WhileLoop':
        this.validateAST(node.condition, scope);
        this.validateAST(node.body, scope);
        break;

      case 'ReturnStatement':
        if (node.value) {
          this.validateAST(node.value, scope);
        }
        break;

      case 'ExpressionStatement':
        this.validateAST(node.expression, scope);
        break;

      // Expressions
      case 'IdentifierExpression':
        const idSymbol = scope.lookup(node.name);
        if (!idSymbol) {
          this.errors.push({
            severity: 'error',
            message: `Undeclared Reference: Variable "${node.name}" is used but not defined.`,
            nodeId: node.nodeId
          });
        }
        break;

      case 'BinaryExpression':
        this.validateAST(node.left, scope);
        this.validateAST(node.right, scope);
        break;

      case 'FunctionCallExpression':
        // Check standard functions or custom registered function declarations
        if (node.callee.includes('.custom')) {
          // Hardware node reference
          const pluginName = node.callee.split('.')[0];
          if (!pluginRegistry.get(pluginName)) {
            this.errors.push({
              severity: 'error',
              message: `Unknown Hardware Class: Component "${pluginName}" has no compiler definition.`,
              nodeId: node.nodeId
            });
          }
        } else {
          // General function reference
          const fnSymbol = scope.lookup(node.callee);
          const isFunc = fnSymbol && (fnSymbol.type === 'function' || fnSymbol.type === 'hardware');
          // Check stringified sub-flows which register their prototypes
          const existsInSubFlow = scope.parent === null && scope.lookup(node.callee); 
          if (!isFunc && !existsInSubFlow && node.callee !== 'apiMock') {
            this.errors.push({
              severity: 'error',
              message: `Undefined Function: Call to undefined function "${node.callee}()".`,
              nodeId: node.nodeId
            });
          }
        }
        node.arguments.forEach(arg => this.validateAST(arg, scope));
        break;

      case 'MemberExpression':
        this.validateAST(node.object, scope);
        break;
    }
  }
}
