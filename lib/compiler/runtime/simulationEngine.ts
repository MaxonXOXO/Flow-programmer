import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  BlockStatementNode,
  VariableDeclarationNode
} from '../ast/ast';
import { pluginRegistry, mapLabelToPluginType } from '../../ir/plugin';
import { parseExpressionString } from '../parser/expressionParser';

export interface StackFrame {
  functionName: string;
  variables: Record<string, any>;
  statements: StatementNode[];
  currentStatementIndex: number;
  loopState?: {
    init: boolean;
    updateExpr?: any;
    conditionExpr?: any;
    bodyStatements?: StatementNode[];
  };
}

export class SimulationEngine {
  private callStack: StackFrame[] = [];
  private globals: Record<string, any> = {};
  private consoleLogs: string[] = [];
  private hardwareStates: Record<string, any> = {};
  private isRunning: boolean = false;
  private maxStackDepth = 100;
  private functionDeclarations: Record<string, any> = {};

  public loadProgram(program: ProgramNode, schemaNodes: any[]) {
    this.callStack = [];
    this.globals = {};
    this.consoleLogs = [];
    this.hardwareStates = {};
    this.isRunning = true;
    this.functionDeclarations = {};

    // Register all custom functions in the program
    program.body.forEach(stmt => {
      if (stmt.kind === 'FunctionDeclaration') {
        this.functionDeclarations[stmt.name] = stmt;
      }
    });

    // Seed mock states for registered hardware components
    schemaNodes.forEach(node => {
      if (node.id !== 'arduino-uno') {
        const label = node.data?.label || node.id;
        const pluginType = mapLabelToPluginType(label) || node.data?.componentType;
        const plugin = pluginRegistry.get(pluginType);
        if (plugin) {
          const params = node.data?.params || {};
          const safeName = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          this.hardwareStates[safeName] = plugin.simulation.initialize(params);
        }
      }
    });

    // Load main program statements into the initial frame
    const loopStatements = program.body.filter(
      (stmt): stmt is StatementNode => stmt.kind !== 'FunctionDeclaration'
    );

    this.callStack.push({
      functionName: 'loop',
      variables: {},
      statements: [...loopStatements],
      currentStatementIndex: 0
    });
  }

  public getVariables(): Record<string, any> {
    const currentFrame = this.getCurrentFrame();
    if (!currentFrame) return this.globals;
    return { ...this.globals, ...currentFrame.variables };
  }

  public getConsoleLogs(): string[] {
    return this.consoleLogs;
  }

  public setHardwareMockValue(safeName: string, key: string, value: any) {
    if (this.hardwareStates[safeName]) {
      this.hardwareStates[safeName][key] = value;
    }
  }

  public step(): { currentNodeId: string | null; done: boolean; error?: string; log?: string; delayMs?: number } {
    if (!this.isRunning) return { currentNodeId: null, done: true };

    const frame = this.getCurrentFrame();
    if (!frame) {
      this.isRunning = false;
      return { currentNodeId: null, done: true };
    }

    if (frame.currentStatementIndex >= frame.statements.length) {
      this.callStack.pop();
      if (this.callStack.length === 0) {
        this.isRunning = false;
        return { currentNodeId: null, done: true };
      }
      return this.step();
    }

    const stmt = frame.statements[frame.currentStatementIndex];
    frame.currentStatementIndex++; // advance PC

    const nodeId = stmt.nodeId || null;

    try {
      switch (stmt.kind) {
        case 'VariableDeclaration': {
          const expr = stmt.value;
          if (expr && expr.kind === 'CallExpression') {
            const userFn = this.functionDeclarations[expr.callee];
            if (userFn) {
              // Pre-declare variable in parent scope to hold the return value
              frame.variables[stmt.name] = undefined;
              const args = expr.arguments.map(arg => this.evaluate(arg, frame.variables));
              const localVars: Record<string, any> = {};
              userFn.params.forEach((param: any, idx: number) => {
                localVars[param.name] = args[idx] !== undefined ? args[idx] : 0;
              });
              this.pushFrame(userFn.name, userFn.body.body, localVars);
              return { currentNodeId: nodeId, done: false };
            }
          }
          const val = this.evaluate(stmt.value, frame.variables);
          frame.variables[stmt.name] = val;
          return { currentNodeId: nodeId, done: false };
        }

        case 'Assignment': {
          const expr = stmt.value;
          if (expr && expr.kind === 'CallExpression') {
            const userFn = this.functionDeclarations[expr.callee];
            if (userFn) {
              const args = expr.arguments.map(arg => this.evaluate(arg, frame.variables));
              const localVars: Record<string, any> = {};
              userFn.params.forEach((param: any, idx: number) => {
                localVars[param.name] = args[idx] !== undefined ? args[idx] : 0;
              });
              this.pushFrame(userFn.name, userFn.body.body, localVars);
              return { currentNodeId: nodeId, done: false };
            }
          }
          const val = this.evaluate(stmt.value, frame.variables);
          if (stmt.name in frame.variables) {
            frame.variables[stmt.name] = val;
          } else {
            this.globals[stmt.name] = val;
          }
          return { currentNodeId: nodeId, done: false };
        }

        case 'ReturnStatement': {
          const val = stmt.value ? this.evaluate(stmt.value, frame.variables) : undefined;
          this.callStack.pop();
          const parentFrame = this.getCurrentFrame();
          if (parentFrame) {
            const parentStmt = parentFrame.statements[parentFrame.currentStatementIndex - 1];
            if (parentStmt) {
              if (parentStmt.kind === 'Assignment' || parentStmt.kind === 'VariableDeclaration') {
                parentFrame.variables[parentStmt.name] = val;
              }
            }
          }
          return { currentNodeId: nodeId, done: false };
        }

        case 'IfStatement': {
          const cond = this.evaluate(stmt.condition, frame.variables);
          if (cond) {
            this.pushFrame(`if_true`, stmt.consequent.body, frame.variables);
          } else if (stmt.alternate) {
            this.pushFrame(`if_false`, stmt.alternate.body, frame.variables);
          }
          return { currentNodeId: nodeId, done: false };
        }

        case 'ForLoop': {
          const loopVars = { ...frame.variables };
          const loopVarName = (stmt.init as any).name;
          const startVal = this.evaluate((stmt.init as any).value, frame.variables);
          loopVars[loopVarName] = startVal;

          this.pushFrame(`for_loop`, [stmt], loopVars);
          const loopFrame = this.getCurrentFrame()!;
          loopFrame.loopState = {
            init: true,
            updateExpr: stmt.update,
            conditionExpr: stmt.condition,
            bodyStatements: stmt.body.body
          };
          return { currentNodeId: nodeId, done: false };
        }

        case 'ExpressionStatement': {
          const expr = stmt.expression;

          if (expr.kind === 'CallExpression' && expr.callee.includes('.custom')) {
            const pluginType = expr.callee.split('.')[0];
            const plugin = pluginRegistry.get(pluginType);
            const rawParams = expr.arguments[0] as any;
            let params: Record<string, string> = {};
            if (rawParams && rawParams.kind === 'Literal') {
              try {
                params = JSON.parse(String(rawParams.value));
              } catch (e) {}
            }

            let mockState = this.hardwareStates[`${pluginType}_sensor`] || {};
            if (!this.hardwareStates[`${pluginType}_sensor`]) {
              const matchedKey = Object.keys(this.hardwareStates).find(k => k.toLowerCase().includes(pluginType.toLowerCase()));
              if (matchedKey) {
                mockState = this.hardwareStates[matchedKey];
              }
            }

            const evalPrintText = (rawStr: string, vars: Record<string, any>): string => {
              const parts = this.parsePrintArguments(rawStr);
              return parts.map(part => {
                const parsedExpr = parseExpressionString(part);
                try {
                  const val = this.evaluate(parsedExpr, vars);
                  return val === undefined ? '' : String(val);
                } catch (e) {
                  return part.replace(/^["']|["']$/g, '');
                }
              }).join('');
            };

            let outLog = '';
            if (pluginType === 'dht') {
              const tempVar = params.varTemp || 'temp';
              const humVar = params.varHum || 'hum';
              const tempVal = mockState.temperature || 24.0;
              const humVal = mockState.humidity || 45.0;
              frame.variables[tempVar] = tempVal;
              frame.variables[humVar] = humVal;
              outLog = `[DHT Sensor] Read Temp: ${tempVal}°C, Hum: ${humVal}%`;
            } else if (pluginType === 'ultrasonic') {
              const distVar = params.varDist || 'distance';
              const distVal = mockState.distance || 50;
              frame.variables[distVar] = distVal;
              outLog = `[Ultrasonic] Measured Distance: ${distVal} cm`;
            } else if (['ldr', 'soilMoisture', 'waterLevel', 'mqGas'].includes(pluginType)) {
              const defaultVars: Record<string, string> = { ldr: 'lightVal', soilMoisture: 'moisture', waterLevel: 'waterLevel', mqGas: 'gasVal' };
              const varName = params[defaultVars[pluginType]] || defaultVars[pluginType];
              const val = mockState.val || 512;
              frame.variables[varName] = val;
              outLog = `[${plugin!.label}] Measured Value: ${val}`;
            } else if (['pir', 'ir', 'vibration', 'flame'].includes(pluginType)) {
              const defaultVars: Record<string, string> = { pir: 'motion', ir: 'obstacle', vibration: 'vibration', flame: 'flameVal' };
              const varName = params[defaultVars[pluginType]] || defaultVars[pluginType];
              const val = mockState.val || 0;
              frame.variables[varName] = val;
              outLog = `[${plugin!.label}] Signal: ${val === 1 ? 'HIGH' : 'LOW'}`;
            } else if (pluginType === 'servo') {
              const angle = Number(params.angle || '90');
              mockState.angle = angle;
              outLog = `[Servo Motor] Rotated to ${angle}°`;
            } else if (pluginType === 'lcd') {
              const text = evalPrintText(params.text || '', frame.variables);
              const row = Number(params.row || '0');
              const lines = mockState.lines || ['', ''];
              lines[row] = text;
              mockState.lines = lines;
              outLog = `[LCD Display] Prints line ${row}: "${text}"`;
            } else if (pluginType === 'oled') {
              const text = evalPrintText(params.text || '', frame.variables);
              mockState.text = text;
              outLog = `[OLED Display] Display text: "${text}"`;
            } else if (['l298n', 'l293d'].includes(pluginType)) {
              const motor = params.motor || 'Motor A';
              const dir = params.direction || 'Forward';
              const spd = params.speed || '255';
              outLog = `[Motor Driver] Control ${motor}: Direction: ${dir}, Speed: ${spd}`;
            }

            if (outLog) {
              this.consoleLogs.push(outLog);
            }
            return { currentNodeId: nodeId, done: false, log: outLog };
          }

          if (expr.kind === 'CallExpression') {
            const userFn = this.functionDeclarations[expr.callee];
            if (userFn) {
              const args = expr.arguments.map(arg => this.evaluate(arg, frame.variables));
              const localVars: Record<string, any> = {};
              userFn.params.forEach((param: any, idx: number) => {
                localVars[param.name] = args[idx] !== undefined ? args[idx] : 0;
              });
              this.pushFrame(userFn.name, userFn.body.body, localVars);
              return { currentNodeId: nodeId, done: false };
            }

            if (expr.callee === 'Serial.println' || expr.callee === 'Serial.print') {
              const val = this.evaluate(expr.arguments[0], frame.variables);
              const logMsg = `[Serial Monitor] ${val}`;
              this.consoleLogs.push(logMsg);
              return { currentNodeId: nodeId, done: false, log: logMsg };
            }

            if (expr.callee === 'delay') {
              const ms = Number(this.evaluate(expr.arguments[0], frame.variables));
              return { currentNodeId: nodeId, done: false, delayMs: ms };
            }

            if (expr.callee === 'digitalWrite') {
              const pin = this.evaluate(expr.arguments[0], frame.variables);
              const val = this.evaluate(expr.arguments[1], frame.variables);
              const logMsg = `[MCU Pin] Pin ${pin} set to ${val}`;
              this.consoleLogs.push(logMsg);
              return { currentNodeId: nodeId, done: false, log: logMsg };
            }
          }

          this.evaluate(expr, frame.variables);
          return { currentNodeId: nodeId, done: false };
        }
      }
    } catch (e: any) {
      return { currentNodeId: nodeId, done: false, error: e.message };
    }

    if (frame.loopState) {
      const state = frame.loopState;
      const checkCond = this.evaluate(state.conditionExpr, frame.variables);
      if (checkCond) {
        frame.currentStatementIndex--; 
        
        if (!state.init) {
          const updateStmt = state.updateExpr;
          if (updateStmt.kind === 'Assignment') {
            const updVal = this.evaluate(updateStmt.value, frame.variables);
            frame.variables[updateStmt.name] = updVal;
          }
        }
        state.init = false;

        this.pushFrame(`loop_body`, state.bodyStatements || [], frame.variables);
      } else {
        this.callStack.pop();
      }
      return { currentNodeId: nodeId, done: false };
    }

    return { currentNodeId: nodeId, done: false };
  }

  private evaluate(expr: ExpressionNode, variables: Record<string, any>): any {
    switch (expr.kind) {
      case 'Literal':
        return expr.value;

      case 'Identifier':
        if (expr.name in variables) {
          return variables[expr.name];
        }
        if (expr.name in this.globals) {
          return this.globals[expr.name];
        }
        throw new Error(`Undeclared identifier reference: "${expr.name}"`);

      case 'BinaryExpression': {
        const leftVal = this.evaluate(expr.left, variables);
        const rightVal = this.evaluate(expr.right, variables);

        switch (expr.operator) {
          case '+': return leftVal + rightVal;
          case '-': return leftVal - rightVal;
          case '*': return leftVal * rightVal;
          case '/': return leftVal / rightVal;
          case '>': return leftVal > rightVal;
          case '<': return leftVal < rightVal;
          case '>=': return leftVal >= rightVal;
          case '<=': return leftVal <= rightVal;
          case '==': return leftVal == rightVal;
          case '!=': return leftVal != rightVal;
          case '&&': return leftVal && rightVal;
          case '||': return leftVal || rightVal;
          default: throw new Error(`Unsupported binary operator "${expr.operator}"`);
        }
      }

      case 'UnaryExpression': {
        const val = this.evaluate(expr.argument, variables);
        if (expr.operator === '!') return !val;
        if (expr.operator === '-') return -val;
        throw new Error(`Unsupported unary operator "${expr.operator}"`);
      }

      case 'CallExpression':
        if (expr.callee === 'analogRead') {
          return 512;
        }
        return 0;
    }
    return 0;
  }

  private getCurrentFrame(): StackFrame | null {
    if (this.callStack.length === 0) return null;
    return this.callStack[this.callStack.length - 1];
  }

  private pushFrame(name: string, statements: StatementNode[], variables: Record<string, any>) {
    if (this.callStack.length > this.maxStackDepth) {
      throw new Error(`Stack Overflow: Max call stack depth of ${this.maxStackDepth} exceeded.`);
    }
    this.callStack.push({
      functionName: name,
      variables: { ...variables },
      statements: [...statements],
      currentStatementIndex: 0
    });
  }

  private parsePrintArguments(str: string): string[] {
    if (!str) return [];
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if ((char === '"' || char === "'") && (i === 0 || str[i-1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        current += char;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    return parts.filter(p => p !== '');
  }
}
