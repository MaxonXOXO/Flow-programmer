import { Node, Edge } from '@xyflow/react';

export type FlowControlDiagnosticCode =
  | 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT'
  | 'UNSUPPORTED_IMPLICIT_FLOW_FANIN'
  | 'SPLIT_ZERO_BRANCHES'
  | 'SPLIT_MISSING_BRANCH_COUNT'
  | 'SPLIT_INVALID_BRANCH_COUNT'
  | 'SPLIT_BRANCH_COUNT_MISMATCH'
  | 'SPLIT_DUPLICATE_BRANCH'
  | 'CONVERGE_ZERO_INPUTS'
  | 'CONVERGE_MISSING_BRANCH_COUNT'
  | 'CONVERGE_INVALID_BRANCH_COUNT'
  | 'CONVERGE_BRANCH_COUNT_MISMATCH'
  | 'CONVERGE_DUPLICATE_INPUT'
  | 'DANGLING_SPLIT_BRANCH'
  | 'DANGLING_CONVERGE_BRANCH'
  | 'CYCLIC_FLOW_CONTROL';

export interface FlowControlDiagnostic {
  readonly code: FlowControlDiagnosticCode;
  readonly message: string;
  readonly severity: 'error' | 'warning';
  readonly nodeId?: string;
}

export class FlowControlError extends Error {
  public readonly code: FlowControlDiagnosticCode;
  public readonly nodeId?: string;
  public readonly diagnostics: readonly FlowControlDiagnostic[];

  constructor(
    code: FlowControlDiagnosticCode,
    message: string,
    details?: { nodeId?: string; diagnostics?: FlowControlDiagnostic[] }
  ) {
    super(`[FlowControl] [${code}] ${message}`);
    this.name = 'FlowControlError';
    this.code = code;
    this.nodeId = details?.nodeId;
    this.diagnostics = details?.diagnostics || [];
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validates language-level flow control invariants on the expanded canonical graph.
 * Enforces explicit flow_split / flow_converge primitives and rejects arbitrary implicit fan-out/fan-in.
 */
export function validateFlowControl(nodes: Node[], edges: Edge[]): FlowControlDiagnostic[] {
  const diagnostics: FlowControlDiagnostic[] = [];
  const nodeMap = new Map<string, Node>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Group outgoing edges by source node
  const outgoingBySource = new Map<string, Edge[]>();
  // Group incoming edges by target node
  const incomingByTarget = new Map<string, Edge[]>();

  for (const edge of edges) {
    if (!outgoingBySource.has(edge.source)) outgoingBySource.set(edge.source, []);
    outgoingBySource.get(edge.source)!.push(edge);

    if (!incomingByTarget.has(edge.target)) incomingByTarget.set(edge.target, []);
    incomingByTarget.get(edge.target)!.push(edge);
  }

  for (const node of nodes) {
    const data = (node.data || {}) as any;
    const type = data.nodeType || node.type || 'start';
    const outEdges = outgoingBySource.get(node.id) || [];
    const inEdges = incomingByTarget.get(node.id) || [];

    // ─────────────────────────────────────────────────────────────
    // 1. flow_split validation
    // ─────────────────────────────────────────────────────────────
    if (type === 'flow_split') {
      const rawCount = data.params?.branchCount;
      let declaredCount: number | undefined;

      if (rawCount === undefined || rawCount === null || rawCount === '') {
        diagnostics.push({
          code: 'SPLIT_MISSING_BRANCH_COUNT',
          severity: 'error',
          nodeId: node.id,
          message: `flow_split node "${node.id}" must explicitly specify parameter "branchCount".`,
        });
      } else {
        const parsed = Number(rawCount);
        if (!Number.isInteger(parsed) || parsed < 1) {
          diagnostics.push({
            code: 'SPLIT_INVALID_BRANCH_COUNT',
            severity: 'error',
            nodeId: node.id,
            message: `flow_split node "${node.id}" declared invalid branchCount "${rawCount}". Must be an integer >= 1.`,
          });
        } else {
          declaredCount = parsed;
        }
      }

      if (outEdges.length === 0) {
        diagnostics.push({
          code: 'SPLIT_ZERO_BRANCHES',
          severity: 'error',
          nodeId: node.id,
          message: `flow_split node "${node.id}" has 0 connected output branches. At least 1 branch must be connected.`,
        });
      }

      // Check branch handles
      const branchIndicesSeen = new Set<number>();
      for (const edge of outEdges) {
        const handle = edge.sourceHandle || '';
        const match = handle.match(/^branch_?(\d+)$/i);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (branchIndicesSeen.has(idx)) {
            diagnostics.push({
              code: 'SPLIT_DUPLICATE_BRANCH',
              severity: 'error',
              nodeId: node.id,
              message: `flow_split node "${node.id}" has duplicate connections to branch handle "${handle}".`,
            });
          }
          branchIndicesSeen.add(idx);
        } else if (outEdges.length === 1 && (handle === 'flow' || !handle)) {
          branchIndicesSeen.add(0);
        }

        // Dangling target check
        if (!nodeMap.has(edge.target)) {
          diagnostics.push({
            code: 'DANGLING_SPLIT_BRANCH',
            severity: 'error',
            nodeId: node.id,
            message: `flow_split node "${node.id}" branch "${handle}" targets nonexistent node "${edge.target}".`,
          });
        }
      }

      if (outEdges.length > 0 && declaredCount !== undefined && branchIndicesSeen.size !== declaredCount) {
        diagnostics.push({
          code: 'SPLIT_BRANCH_COUNT_MISMATCH',
          severity: 'error',
          nodeId: node.id,
          message: `flow_split node "${node.id}" declares ${declaredCount} branches but ${branchIndicesSeen.size} are connected.`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. flow_converge validation
    // ─────────────────────────────────────────────────────────────
    else if (type === 'flow_converge') {
      const rawCount = data.params?.branchCount;
      let declaredCount: number | undefined;

      if (rawCount === undefined || rawCount === null || rawCount === '') {
        diagnostics.push({
          code: 'CONVERGE_MISSING_BRANCH_COUNT',
          severity: 'error',
          nodeId: node.id,
          message: `flow_converge node "${node.id}" must explicitly specify parameter "branchCount".`,
        });
      } else {
        const parsed = Number(rawCount);
        if (!Number.isInteger(parsed) || parsed < 1) {
          diagnostics.push({
            code: 'CONVERGE_INVALID_BRANCH_COUNT',
            severity: 'error',
            nodeId: node.id,
            message: `flow_converge node "${node.id}" declared invalid branchCount "${rawCount}". Must be an integer >= 1.`,
          });
        } else {
          declaredCount = parsed;
        }
      }

      if (inEdges.length === 0) {
        diagnostics.push({
          code: 'CONVERGE_ZERO_INPUTS',
          severity: 'error',
          nodeId: node.id,
          message: `flow_converge node "${node.id}" has 0 connected inputs.`,
        });
      } else if (declaredCount !== undefined && inEdges.length !== declaredCount) {
        diagnostics.push({
          code: 'CONVERGE_BRANCH_COUNT_MISMATCH',
          severity: 'error',
          nodeId: node.id,
          message: `flow_converge node "${node.id}" declares ${declaredCount} input branches but ${inEdges.length} are connected.`,
        });
      }

      // Check duplicate input handles if targetHandle is explicit
      const inHandlesSeen = new Set<string>();
      for (const edge of inEdges) {
        if (edge.targetHandle && edge.targetHandle !== 'flow') {
          if (inHandlesSeen.has(edge.targetHandle)) {
            diagnostics.push({
              code: 'CONVERGE_DUPLICATE_INPUT',
              severity: 'error',
              nodeId: node.id,
              message: `flow_converge node "${node.id}" has duplicate connections to input handle "${edge.targetHandle}".`,
            });
          }
          inHandlesSeen.add(edge.targetHandle);
        }

        // Dangling source check
        if (!nodeMap.has(edge.source)) {
          diagnostics.push({
            code: 'DANGLING_CONVERGE_BRANCH',
            severity: 'error',
            nodeId: node.id,
            message: `flow_converge node "${node.id}" receives input from nonexistent node "${edge.source}".`,
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Arbitrary Fan-Out on ordinary nodes
    // ─────────────────────────────────────────────────────────────
    else if (type === 'condition') {
      const trueEdges = outEdges.filter(e => e.sourceHandle === 'true');
      const falseEdges = outEdges.filter(e => e.sourceHandle === 'false');
      if (trueEdges.length > 1) {
        diagnostics.push({
          code: 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT',
          severity: 'error',
          nodeId: node.id,
          message: `Condition node "${node.id}" has ${trueEdges.length} outgoing edges on handle "true". Implicit flow fan-out is unsupported. Use an explicit 'flow_split' primitive.`,
        });
      }
      if (falseEdges.length > 1) {
        diagnostics.push({
          code: 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT',
          severity: 'error',
          nodeId: node.id,
          message: `Condition node "${node.id}" has ${falseEdges.length} outgoing edges on handle "false". Implicit flow fan-out is unsupported. Use an explicit 'flow_split' primitive.`,
        });
      }
    } else if (type === 'loop') {
      const bodyEdges = outEdges.filter(e => e.sourceHandle === 'body');
      const doneEdges = outEdges.filter(e => e.sourceHandle === 'done');
      if (bodyEdges.length > 1) {
        diagnostics.push({
          code: 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT',
          severity: 'error',
          nodeId: node.id,
          message: `Loop node "${node.id}" has ${bodyEdges.length} outgoing edges on handle "body". Implicit flow fan-out is unsupported. Use an explicit 'flow_split' primitive.`,
        });
      }
      if (doneEdges.length > 1) {
        diagnostics.push({
          code: 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT',
          severity: 'error',
          nodeId: node.id,
          message: `Loop node "${node.id}" has ${doneEdges.length} outgoing edges on handle "done". Implicit flow fan-out is unsupported. Use an explicit 'flow_split' primitive.`,
        });
      }
    } else {
      const flowOutEdges = outEdges.filter(e => e.sourceHandle === 'flow' || !e.sourceHandle);
      if (flowOutEdges.length > 1) {
        diagnostics.push({
          code: 'UNSUPPORTED_IMPLICIT_FLOW_FANOUT',
          severity: 'error',
          nodeId: node.id,
          message: `Node "${node.id}" (${type}) has ${flowOutEdges.length} outgoing flow edges. Implicit flow fan-out is unsupported. Use an explicit 'flow_split' primitive to define sequential branch execution.`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Arbitrary Fan-In on ordinary nodes
    // ─────────────────────────────────────────────────────────────
    if (type !== 'flow_converge' && type !== 'loop' && type !== 'end') {
      const flowInEdges = inEdges.filter(
        e => e.targetHandle === 'flow' || !e.targetHandle || e.targetHandle.startsWith('branch_')
      );
      if (flowInEdges.length > 1) {
        diagnostics.push({
          code: 'UNSUPPORTED_IMPLICIT_FLOW_FANIN',
          severity: 'error',
          nodeId: node.id,
          message: `Node "${node.id}" (${type}) has ${flowInEdges.length} incoming flow edges. Implicit flow fan-in is ambiguous. Use an explicit 'flow_converge' primitive to define convergence.`,
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Cyclic flow control detection (unstructured loops involving split/converge)
  // ─────────────────────────────────────────────────────────────
  const splitConvergeNodes = nodes.filter(n => {
    const t = (n.data as any)?.nodeType || n.type;
    return t === 'flow_split' || t === 'flow_converge';
  });

  if (splitConvergeNodes.length > 0) {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function checkCycle(currId: string): boolean {
      visited.add(currId);
      recStack.add(currId);

      const outEdges = outgoingBySource.get(currId) || [];
      for (const e of outEdges) {
        const targetNode = nodeMap.get(e.target);
        if (!targetNode) continue;
        const targetType = (targetNode.data as any)?.nodeType || targetNode.type;
        if (targetType === 'loop') continue; // structured loops handle back-edges

        if (!visited.has(e.target)) {
          if (checkCycle(e.target)) return true;
        } else if (recStack.has(e.target)) {
          return true;
        }
      }

      recStack.delete(currId);
      return false;
    }

    for (const scNode of splitConvergeNodes) {
      if (!visited.has(scNode.id)) {
        if (checkCycle(scNode.id)) {
          diagnostics.push({
            code: 'CYCLIC_FLOW_CONTROL',
            severity: 'error',
            nodeId: scNode.id,
            message: `Cyclic flow control detected involving node "${scNode.id}". Cyclic execution must use explicit 'loop' primitives.`,
          });
          break;
        }
      }
    }
  }

  return diagnostics;
}

/**
 * Resolves the downstream flow_converge node for a set of divergent branch targets.
 *
 * ARCHITECTURAL SEMANTICS:
 * - Convergence Ownership: In Flow-IDE language semantics, convergence ownership is defined
 *   by the control-region structure: the converge node is the immediate join point where all
 *   divergent branches of a specific region (split or condition) meet.
 * - BFS Distance Mechanism: Traversing reachable nodes and picking the candidate with minimal
 *   maximum distance is strictly an operational implementation mechanism for locating the
 *   immediate join point (post-dominating join point) within a DAG. It is NOT treated as the
 *   language-level definition of convergence ownership. Full dominator/post-dominator trees
 *   will be formalized in the subsequent relationship-analysis phase.
 */
export function findCommonConvergeNodeForTargets(
  targetIds: string[],
  nodes: Node[],
  edges: Edge[]
): string | undefined {
  if (targetIds.length === 0) return undefined;

  // Map of convergeNodeId -> distance from that target
  const reachablePerTarget: Array<Map<string, number>> = [];

  for (const startId of targetIds) {
    const reachable = new Map<string, number>();
    const queue: Array<{ id: string; dist: number }> = [{ id: startId, dist: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id: curr, dist } = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);

      const node = nodes.find(n => n.id === curr);
      if (!node) continue;

      const nodeType = (node.data as any)?.nodeType || node.type;
      if (nodeType === 'flow_converge') {
        if (!reachable.has(curr)) {
          reachable.set(curr, dist);
        }
      }
      if (nodeType === 'end' || nodeType === 'return') {
        continue;
      }

      const outEdges = edges.filter(e => e.source === curr);
      for (const edge of outEdges) {
        if (!visited.has(edge.target)) {
          queue.push({ id: edge.target, dist: dist + 1 });
        }
      }
    }

    reachablePerTarget.push(reachable);
  }

  if (reachablePerTarget.length === 0) return undefined;

  // Intersect candidate converge node IDs
  let commonCandidates = new Set<string>(reachablePerTarget[0].keys());
  for (let i = 1; i < reachablePerTarget.length; i++) {
    const currKeys = new Set(reachablePerTarget[i].keys());
    commonCandidates = new Set([...commonCandidates].filter(id => currKeys.has(id)));
  }

  if (commonCandidates.size === 0) return undefined;

  // If multiple common candidates, pick the one with the smallest maximum distance (closest common converge)
  let bestCandidate: string | undefined = undefined;
  let minMaxDist = Infinity;

  for (const candidateId of commonCandidates) {
    const maxDist = Math.max(...reachablePerTarget.map(m => m.get(candidateId)!));
    if (maxDist < minMaxDist) {
      minMaxDist = maxDist;
      bestCandidate = candidateId;
    }
  }

  return bestCandidate;
}

/**
 * Finds the downstream flow_converge node for a flow_split node.
 */
export function findCommonConvergeNode(
  splitNodeId: string,
  nodes: Node[],
  edges: Edge[]
): string | undefined {
  const outEdges = edges.filter(e => e.source === splitNodeId);
  const targetIds = outEdges.map(e => e.target).filter(Boolean);
  return findCommonConvergeNodeForTargets(targetIds, nodes, edges);
}
