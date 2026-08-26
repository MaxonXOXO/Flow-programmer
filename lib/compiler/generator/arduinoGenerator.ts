import { Node, Edge } from '@xyflow/react';
import { ProgramNode } from '../ast/ast';
import { GeneratedCode, Connection, resolveBackendForTarget } from '../backend';

export type CodeGeneratorOutput = GeneratedCode;
export type { Connection };

/**
 * Backward compatibility wrapper around ArduinoCppBackend.
 */
export class ArduinoUnoGenerator {
  public generate(
    program: ProgramNode,
    schemaNodes: Node[] = [],
    schemaEdges: Edge[] = []
  ): CodeGeneratorOutput {
    const backend = resolveBackendForTarget('arduino_uno');
    return backend.generate(program, {
      targetId: 'arduino_uno',
      boardId: 'arduino_uno',
      schemaNodes,
      schemaEdges
    });
  }
}
