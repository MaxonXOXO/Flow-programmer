import { Node, Edge } from '@xyflow/react';
import { ProgramNode } from '../ast/ast';

export interface GeneratedCode {
  main: string;
  files: Record<string, string>;
}

export interface BackendContext {
  targetId: string;
  boardId?: string;
  schemaNodes?: Node[];
  schemaEdges?: Edge[];
  options?: Record<string, unknown>;
}

export interface BackendCapabilities {
  digitalRead?: boolean;
  digitalWrite?: boolean;
  analogRead?: boolean;
  analogWrite?: boolean;
  pwm?: boolean;
  tone?: boolean;
  pulseIn?: boolean;
  delay?: boolean;
  delayMicroseconds?: boolean;
  uart?: boolean;
  i2c?: boolean;
  spi?: boolean;
  customFeatures?: string[];
}

export interface BackendDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
}

export interface CompilerBackend {
  readonly id: string;
  readonly name: string;
  readonly targetId: string;
  readonly capabilities: BackendCapabilities;

  generate(
    program: ProgramNode,
    context: BackendContext
  ): GeneratedCode;

  validate?(
    program: ProgramNode,
    context: BackendContext
  ): BackendDiagnostic[];
}
