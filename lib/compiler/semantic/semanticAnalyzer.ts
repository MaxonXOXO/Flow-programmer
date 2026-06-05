import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  FunctionDeclarationNode,
  ProgramStatementNode
} from '../ast/ast';
import {
  SymbolTable,
  SymbolInfo,
  VariableSymbol,
  FunctionSymbol
} from '../symbols/symbolTable';

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
}

export class SemanticAnalyzer {
  private errors: ValidationError[] = [];
  private currentFunction: FunctionDeclarationNode | null = null;
  private hasReturnStatement = false;

  public analyze(program: ProgramNode, globalScope: SymbolTable): ValidationError[] {
    this.errors = [];
    this.currentFunction = null;
    this.hasReturnStatement = false;

    // Register standard library functions first
    this.registerStandardLibrary(globalScope);

    // First pass: Register all function declarations in the global scope
    program.body.forEach(stmt => {
      if (stmt.kind === 'FunctionDeclaration') {
        const fnSymbol: FunctionSymbol = {
          kind: 'function',
          name: stmt.name,
          returnType: stmt.returnType,
          parameters: stmt.params,
          nodeId: stmt.nodeId
        };
        const success = globalScope.define(fnSymbol);
        if (!success) {
          this.errors.push({
            severity: 'error',
            message: `Duplicate declaration: Function "${stmt.name}" is already defined.`,
            nodeId: stmt.nodeId
          });
        }
      }
    });

    // Second pass: Validate statements & expressions
    program.body.forEach(stmt => {
      this.validateStatement(stmt, globalScope);
    });

    return this.errors;
  }

  private registerStandardLibrary(scope: SymbolTable) {
    const stdFns: FunctionSymbol[] = [
      {
        kind: 'function',
        name: 'Serial.println',
        returnType: 'void',
        parameters: [{ name: 'val', dataType: 'any' }]
      },
      {
        kind: 'function',
        name: 'Serial.print',
        returnType: 'void',
        parameters: [{ name: 'val', dataType: 'any' }]
      },
      {
        kind: 'function',
        name: 'Serial.parseInt',
        returnType: 'int',
        parameters: []
      },
      {
        kind: 'function',
        name: 'delay',
        returnType: 'void',
        parameters: [{ name: 'ms', dataType: 'int' }]
      },
      {
        kind: 'function',
        name: 'digitalWrite',
        returnType: 'void',
        parameters: [{ name: 'pin', dataType: 'int' }, { name: 'value', dataType: 'int' }]
      },
      {
        kind: 'function',
        name: 'analogRead',
        returnType: 'int',
        parameters: [{ name: 'pin', dataType: 'int' }]
      }
    ];

    stdFns.forEach(fn => scope.define(fn));
  }

  private validateStatement(stmt: ProgramStatementNode, scope: SymbolTable) {
    if (!stmt) return;

    switch (stmt.kind) {
      case 'BlockStatement': {
        const blockScope = new SymbolTable(scope, scope.scopeType);
        stmt.body.forEach(s => this.validateStatement(s, blockScope));
        break;
      }

      case 'FunctionDeclaration': {
        const funcScope = new SymbolTable(scope, 'function');
        this.currentFunction = stmt;
        this.hasReturnStatement = false;

        // Register parameters in function scope
        stmt.params.forEach(param => {
          funcScope.define({
            kind: 'variable',
            name: param.name,
            type: param.dataType,
            scope: 'function',
            nodeId: stmt.nodeId
          });
        });

        // Validate body
        stmt.body.body.forEach(s => this.validateStatement(s, funcScope));

        // Validate return path if not void
        if (stmt.returnType !== 'void' && !this.hasReturnStatement) {
          this.errors.push({
            severity: 'error',
            message: `Missing return value for non-void function "${stmt.name}"`,
            nodeId: stmt.nodeId
          });
        }

        this.currentFunction = null;
        break;
      }

      case 'VariableDeclaration': {
        const varSymbol: VariableSymbol = {
          kind: 'variable',
          name: stmt.name,
          type: stmt.varType,
          scope: scope.scopeType,
          nodeId: stmt.nodeId
        };
        const success = scope.define(varSymbol);
        if (!success) {
          this.errors.push({
            severity: 'error',
            message: `Redeclaration Error: Variable "${stmt.name}" is already defined in this scope.`,
            nodeId: stmt.nodeId
          });
        }
        this.validateExpression(stmt.value, scope);
        if (stmt.value && stmt.value.kind === 'CallExpression') {
          const fnSymbol = scope.lookup(stmt.value.callee);
          if (fnSymbol && fnSymbol.kind === 'function' && fnSymbol.returnType === 'void') {
            this.errors.push({
              severity: 'error',
              message: `Cannot assign void function result`,
              nodeId: stmt.nodeId
            });
          }
        }
        break;
      }

      case 'Assignment': {
        const symbol = scope.lookup(stmt.name);
        if (!symbol) {
          this.errors.push({
            severity: 'error',
            message: `Undefined variable: ${stmt.name}`,
            nodeId: stmt.nodeId
          });
        } else if (symbol.kind !== 'variable') {
          this.errors.push({
            severity: 'error',
            message: `Cannot assign to non-variable "${stmt.name}".`,
            nodeId: stmt.nodeId
          });
        }
        this.validateExpression(stmt.value, scope);
        if (stmt.value && stmt.value.kind === 'CallExpression') {
          const fnSymbol = scope.lookup(stmt.value.callee);
          if (fnSymbol && fnSymbol.kind === 'function' && fnSymbol.returnType === 'void') {
            this.errors.push({
              severity: 'error',
              message: `Cannot assign void function result`,
              nodeId: stmt.nodeId
            });
          }
        }
        break;
      }

      case 'IfStatement':
        this.validateExpression(stmt.condition, scope);
        this.validateStatement(stmt.consequent, scope);
        if (stmt.alternate) {
          this.validateStatement(stmt.alternate, scope);
        }
        break;

      case 'ForLoop': {
        const loopScope = new SymbolTable(scope, 'loop');
        
        // Loop variable is in loop body scope
        if (stmt.init.kind === 'VariableDeclaration') {
          this.validateStatement(stmt.init, loopScope);
        } else {
          this.validateStatement(stmt.init, loopScope);
        }

        this.validateExpression(stmt.condition, loopScope);

        if (stmt.update.kind === 'Assignment') {
          this.validateStatement(stmt.update, loopScope);
        } else {
          this.validateExpression(stmt.update, loopScope);
        }

        this.validateStatement(stmt.body, loopScope);
        break;
      }

      case 'ReturnStatement': {
        this.hasReturnStatement = true;
        if (this.currentFunction) {
          const expectedType = this.currentFunction.returnType;
          if (expectedType === 'void') {
            if (stmt.value) {
              this.errors.push({
                severity: 'error',
                message: `Void function "${this.currentFunction.name}" should not return a value.`,
                nodeId: stmt.nodeId
              });
            }
          } else {
            if (!stmt.value) {
              this.errors.push({
                severity: 'error',
                message: `Missing return value for non-void function "${this.currentFunction.name}"`,
                nodeId: stmt.nodeId
              });
            } else {
              this.validateExpression(stmt.value, scope);
            }
          }
        } else {
          // Return at global scope
          if (stmt.value) {
            this.validateExpression(stmt.value, scope);
          }
        }
        break;
      }

      case 'ExpressionStatement':
        this.validateExpression(stmt.expression, scope);
        break;
    }
  }

  private validateExpression(expr: ExpressionNode, scope: SymbolTable) {
    if (!expr) return;

    switch (expr.kind) {
      case 'Literal':
        break;

      case 'Identifier': {
        const symbol = scope.lookup(expr.name);
        if (!symbol) {
          this.errors.push({
            severity: 'error',
            message: `Undefined variable: ${expr.name}`,
            nodeId: expr.nodeId
          });
        }
        break;
      }

      case 'BinaryExpression':
        this.validateExpression(expr.left, scope);
        this.validateExpression(expr.right, scope);
        break;

      case 'UnaryExpression':
        this.validateExpression(expr.argument, scope);
        break;

      case 'CallExpression': {
        const symbol = scope.lookup(expr.callee);
        if (!symbol) {
          // Check standard API exceptions (like apiMock)
          if (expr.callee !== 'apiMock') {
            // Check if it is a hardware member function (e.g. dht.readTemperature)
            const parts = expr.callee.split('.');
            const hardwareSymbol = parts.length > 1 ? scope.lookup(parts[0]) : null;

            if (!hardwareSymbol || hardwareSymbol.kind !== 'hardware') {
              this.errors.push({
                severity: 'error',
                message: `Undefined Function: Call to undefined function "${expr.callee}()".`,
                nodeId: expr.nodeId
              });
            }
          }
        } else {
          if (symbol.kind === 'function') {
            const expectedCount = symbol.parameters.length;
            const receivedCount = expr.arguments.length;
            
            // Allow matching any arguments for Serial.print/println
            const isSerialPrint = symbol.name === 'Serial.print' || symbol.name === 'Serial.println';
            if (!isSerialPrint && expectedCount !== receivedCount) {
              this.errors.push({
                severity: 'error',
                message: `Function ${symbol.name} expects ${expectedCount} arguments but received ${receivedCount}`,
                nodeId: expr.nodeId
              });
            }
          }
        }

        // Validate arguments
        expr.arguments.forEach(arg => this.validateExpression(arg, scope));
        break;
      }
    }
  }
}
