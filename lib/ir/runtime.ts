import { Program, Statement, Expression, BlockStatement, VariableDeclaration } from './ast';
import { pluginRegistry, mapLabelToPluginType, parsePrintArguments } from './plugin';
import { parseExpressionString } from './compiler';

export interface StackFrame {
  functionName: string;
  variables: Record<string, any>;
  statements: Statement[];
  currentStatementIndex: number;
  // For tracking loops
  loopState?: {
    init: boolean;
    updateExpr?: any;
    conditionExpr?: any;
    bodyStatements?: Statement[];
  };
}

export class SimulationEngine {
  private callStack: StackFrame[] = [];
  private globals: Record<string, any> = {};
  private consoleLogs: string[] = [];
  private hardwareStates: Record<string, any> = {}; // componentId -> mockState
  private isRunning: boolean = false;
  private maxStackDepth = 100;

  public loadProgram(program: Program, schemaNodes: any[]) {
    this.callStack = [];
    this.globals = {};
    this.consoleLogs = [];
    this.hardwareStates = {};
    this.isRunning = true;

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
    this.callStack.push({
      functionName: 'loop',
      variables: {},
      statements: [...program.body],
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

    // Check if the current frame is exhausted
    if (frame.currentStatementIndex >= frame.statements.length) {
      this.callStack.pop();
      // If we popped the last frame, loop repeats from start (standard Arduino behavior!)
      if (this.callStack.length === 0) {
        this.isRunning = false;
        return { currentNodeId: null, done: true };
      }
      return this.step(); // continue to next frame statement
    }

    const stmt = frame.statements[frame.currentStatementIndex];
    frame.currentStatementIndex++; // advance PC

    const nodeId = stmt.nodeId || null;

    try {
      switch (stmt.type) {
        case 'VariableDeclaration': {
          const val = this.evaluate(stmt.value, frame.variables);
          frame.variables[stmt.name] = val;
          return { currentNodeId: nodeId, done: false };
        }

        case 'AssignmentStatement': {
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
          // If we popped a function call frame, assign return value if caller expected it
          const parentFrame = this.getCurrentFrame();
          if (parentFrame) {
            // Find current statement (which is the function call / assignment statement)
            const parentStmt = parentFrame.statements[parentFrame.currentStatementIndex - 1];
            if (parentStmt && parentStmt.type === 'AssignmentStatement') {
              parentFrame.variables[parentStmt.name] = val;
            }
          }
          return { currentNodeId: nodeId, done: false };
        }

        case 'IfStatement': {
          const cond = this.evaluate(stmt.condition, frame.variables);
          if (cond) {
            // Push consequent statements onto call stack as a sub-scope execution
            this.pushFrame(`if_true`, stmt.consequent.body, frame.variables);
          } else if (stmt.alternate) {
            this.pushFrame(`if_false`, stmt.alternate.body, frame.variables);
          }
          return { currentNodeId: nodeId, done: false };
        }

        case 'ForLoop': {
          // Initialize loop variable
          const loopVars = { ...frame.variables };
          // Extract loop variable name
          const loopVarName = (stmt.init as any).name;
          const startVal = this.evaluate((stmt.init as any).value, frame.variables);
          loopVars[loopVarName] = startVal;

          // Push loop execution frame
          this.pushFrame(`for_loop`, [stmt], loopVars);
          const loopFrame = this.getCurrentFrame()!;
          // Setup state
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

          // Catch custom hardware method reads/writes
          if (expr.type === 'FunctionCallExpression' && expr.callee.includes('.custom')) {
            const pluginType = expr.callee.split('.')[0];
            const plugin = pluginRegistry.get(pluginType);
            const rawParams = expr.arguments[0] as any;
            let params: Record<string, string> = {};
            if (rawParams && rawParams.type === 'LiteralExpression') {
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
              const parts = parsePrintArguments(rawStr);
              return parts.map(part => {
                const expr = parseExpressionString(part);
                try {
                  const val = this.evaluate(expr, vars);
                  return val === undefined ? '' : String(val);
                } catch (e) {
                  return part.replace(/^["']|["']$/g, '');
                }
              }).join('');
            };

            // Perform mock actions based on plugin type
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

          // Evaluate general functions: Serial, delay
          if (expr.type === 'FunctionCallExpression') {
            if (expr.callee === 'Serial.println' || expr.callee === 'Serial.print') {
              const val = this.evaluate(expr.arguments[0], frame.variables);
              const logMsg = `[Serial Monitor] ${val}`;
              this.consoleLogs.push(logMsg);
              return { currentNodeId: nodeId, done: false, log: logMsg };
            }

            if (expr.callee === 'delay') {
              const ms = Number(this.evaluate(expr.arguments[0], frame.variables));
              // Return delay duration to pausing step execution temporarily
              return { currentNodeId: nodeId, done: false, delayMs: ms };
            }

            if (expr.callee === 'digitalWrite') {
              const pin = this.evaluate(expr.arguments[0], frame.variables);
              const val = this.evaluate(expr.arguments[1], frame.variables);
              const logMsg = `[MCU Pin] Pin ${pin} set to ${val}`;
              this.consoleLogs.push(logMsg);
              return { currentNodeId: nodeId, done: false, log: logMsg };
            }

            // Custom functions call
            const funcDeclStr = this.globals[expr.callee] || this.globals[expr.callee.toLowerCase()];
            if (funcDeclStr) {
              // Standard recursive subflow push...
            }
          }

          this.evaluate(expr, frame.variables);
          return { currentNodeId: nodeId, done: false };
        }
      }
    } catch (e: any) {
      return { currentNodeId: nodeId, done: false, error: e.message };
    }

    // Process loop iteration behavior if this statement is a ForLoop container
    if (frame.loopState) {
      const state = frame.loopState;
      // Evaluate condition
      const checkCond = this.evaluate(state.conditionExpr, frame.variables);
      if (checkCond) {
        // Push loop body frame and decrement PC so when we return, loop runs again
        frame.currentStatementIndex--; 
        
        // Execute update on variables if not the first run
        if (!state.init) {
          const updateStmt = state.updateExpr;
          if (updateStmt.type === 'AssignmentStatement') {
            const updVal = this.evaluate(updateStmt.value, frame.variables);
            frame.variables[updateStmt.name] = updVal;
          }
        }
        state.init = false;

        this.pushFrame(`loop_body`, state.bodyStatements || [], frame.variables);
      } else {
        // Loop conditions failed - pop the loop frame
        this.callStack.pop();
      }
      return { currentNodeId: nodeId, done: false };
    }

    return { currentNodeId: nodeId, done: false };
  }

  private evaluate(expr: Expression, variables: Record<string, any>): any {
    switch (expr.type) {
      case 'LiteralExpression':
        return expr.value;

      case 'IdentifierExpression':
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

      case 'FunctionCallExpression':
        // Evaluates simple read expressions (analogRead)
        if (expr.callee === 'analogRead') {
          const pin = String(this.evaluate(expr.arguments[0], variables));
          // Look up if any mock sensor pin is configured
          return 512; // fallback default
        }
        return 0;
    }
    return 0;
  }

  private getCurrentFrame(): StackFrame | null {
    if (this.callStack.length === 0) return null;
    return this.callStack[this.callStack.length - 1];
  }

  private pushFrame(name: string, statements: Statement[], variables: Record<string, any>) {
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
}
