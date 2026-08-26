import { CompilerBackend, BackendDiagnostic } from './types';
import { ArduinoCppBackend } from './arduinoBackend';
import { ESP32ArduinoBackend } from './esp32Backend';
import { ProgramNode, StatementNode, ExpressionNode, ProgramStatementNode } from '../ast/ast';

class BackendRegistry {
  private backends: Map<string, CompilerBackend> = new Map();
  private targetMapping: Map<string, string> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Arduino Uno
    const unoBackend = new ArduinoCppBackend('arduino_uno', 'Arduino C++ Backend', 'arduino_cpp_backend');
    this.registerBackend(unoBackend);
    this.targetMapping.set('arduino_uno', unoBackend.id);
    this.targetMapping.set('arduino-uno', unoBackend.id);

    // 2. Arduino Mega
    const megaBackend = new ArduinoCppBackend('arduino_mega', 'Arduino Mega C++ Backend', 'arduino_mega_cpp_backend');
    this.registerBackend(megaBackend);
    this.targetMapping.set('arduino_mega', megaBackend.id);
    this.targetMapping.set('arduino_mega_2560', megaBackend.id);

    // 3. ESP32 Arduino Framework
    const esp32Backend = new ESP32ArduinoBackend();
    this.registerBackend(esp32Backend);
    this.targetMapping.set('esp32_arduino', esp32Backend.id);
    this.targetMapping.set('esp32', esp32Backend.id);
  }

  public registerBackend(backend: CompilerBackend): void {
    this.backends.set(backend.id, backend);
    this.targetMapping.set(backend.targetId, backend.id);
  }

  public getBackend(targetIdOrBackendId: string): CompilerBackend | undefined {
    if (this.backends.has(targetIdOrBackendId)) {
      return this.backends.get(targetIdOrBackendId);
    }
    const backendId = this.targetMapping.get(targetIdOrBackendId);
    if (backendId && this.backends.has(backendId)) {
      return this.backends.get(backendId);
    }
    return undefined;
  }

  public resolveBackendForTarget(targetId: string): CompilerBackend {
    const backend = this.getBackend(targetId);
    if (!backend) {
      throw new Error(`Compiler backend unavailable for target '${targetId}'.`);
    }
    return backend;
  }

  public getAllBackends(): CompilerBackend[] {
    return Array.from(new Set(this.backends.values()));
  }
}

// Global Singleton Registry
const backendRegistry = new BackendRegistry();

export function registerBackend(backend: CompilerBackend): void {
  backendRegistry.registerBackend(backend);
}

export function getBackend(targetIdOrBackendId: string): CompilerBackend | undefined {
  return backendRegistry.getBackend(targetIdOrBackendId);
}

export function resolveBackendForTarget(targetId: string): CompilerBackend {
  return backendRegistry.resolveBackendForTarget(targetId);
}

export function getAllBackends(): CompilerBackend[] {
  return backendRegistry.getAllBackends();
}

/**
 * Validates whether the AST program uses operations supported by the backend capabilities.
 */
export function validateBackendCapabilities(program: ProgramNode, backend: CompilerBackend): BackendDiagnostic[] {
  const diagnostics: BackendDiagnostic[] = [];
  const caps = backend.capabilities;

  function checkExpression(expr: ExpressionNode): void {
    if (!expr) return;
    if (expr.kind === 'CallExpression') {
      const callee = expr.callee.toLowerCase();
      if (callee === 'analogwrite' && caps.analogWrite === false) {
        diagnostics.push({
          severity: 'error',
          message: `Target '${backend.targetId}' does not support AST operation 'analogWrite'. Use target-specific PWM/DAC primitive instead.`
        });
      } else if (callee === 'pulsein' && caps.pulseIn === false) {
        diagnostics.push({
          severity: 'error',
          message: `Target '${backend.targetId}' does not support AST operation 'pulseIn'.`
        });
      } else if (callee === 'tone' && caps.tone === false) {
        diagnostics.push({
          severity: 'error',
          message: `Target '${backend.targetId}' does not support AST operation 'tone'.`
        });
      }
      expr.arguments.forEach(checkExpression);
    } else if (expr.kind === 'BinaryExpression') {
      checkExpression(expr.left);
      checkExpression(expr.right);
    } else if (expr.kind === 'UnaryExpression') {
      checkExpression(expr.argument);
    }
  }

  function checkProgramStatement(stmt: ProgramStatementNode): void {
    if (!stmt) return;
    if (stmt.kind === 'FunctionDeclaration') {
      stmt.body.body.forEach(checkStatement);
      return;
    }
    checkStatement(stmt);
  }

  function checkStatement(stmt: StatementNode): void {
    if (!stmt) return;
    switch (stmt.kind) {
      case 'BlockStatement':
        stmt.body.forEach(checkStatement);
        break;
      case 'VariableDeclaration':
        checkExpression(stmt.value);
        break;
      case 'Assignment':
        checkExpression(stmt.value);
        break;
      case 'IfStatement':
        checkExpression(stmt.condition);
        stmt.consequent.body.forEach(checkStatement);
        if (stmt.alternate) stmt.alternate.body.forEach(checkStatement);
        break;
      case 'ForLoop':
        checkExpression(stmt.init.value);
        checkExpression(stmt.condition);
        if ('kind' in stmt.update && stmt.update.kind === 'Assignment') {
          checkExpression(stmt.update.value);
        } else {
          checkExpression(stmt.update as ExpressionNode);
        }
        stmt.body.body.forEach(checkStatement);
        break;
      case 'ReturnStatement':
        if (stmt.value) checkExpression(stmt.value);
        break;
      case 'ExpressionStatement':
        checkExpression(stmt.expression);
        break;
    }
  }

  program.body.forEach(checkProgramStatement);
  return diagnostics;
}
