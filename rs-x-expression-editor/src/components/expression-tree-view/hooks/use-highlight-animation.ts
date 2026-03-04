import { useEffect, useMemo, useRef, useState } from 'react';

import type { IExpressionChangeHistory } from '@rs-x/expression-parser';

import { type ExpressionIndex } from '../expression-index';
import { type NodeId } from '../layout/node.interface';

type Selection = {
  selectedNodeIds: Set<NodeId>;
  selectedEdgeKeys: Set<string>;
  nodePathSequence: NodeId[];
};

type Wave = {
  nodes: NodeId[];
  edges: string[];
};

type FlowState = {
  nodeIds: Set<NodeId>;
  edgeKeys: Set<string>;
};

function unionSets<T>(sets: Iterable<Set<T>>): Set<T> {
  const out = new Set<T>();
  for (const s of sets) {
    for (const v of s) {
      out.add(v);
    }
  }
  return out;
}

class HighlightAnimator {
  public computeSelection(args: {
    highlightChanges: readonly IExpressionChangeHistory[];
    expressionIndex: ExpressionIndex;
  }): Selection {
    const { highlightChanges, expressionIndex } = args;

    const stepIds: NodeId[] = [];

    for (const h of highlightChanges) {
      const id = expressionIndex.resolveNodeId(h.expression);
      if (id) {
        stepIds.push(id);
      }
    }

    if (stepIds.length === 0) {
      return {
        selectedNodeIds: new Set<NodeId>(),
        selectedEdgeKeys: new Set<string>(),
        nodePathSequence: [],
      };
    }

    const selectedNodes = new Set<NodeId>(stepIds);
    const selectedEdges = new Set<string>();

    const nodePathSequence: NodeId[] = [];

    for (let i = 0; i < stepIds.length - 1; i++) {
      const a = stepIds[i];
      const b = stepIds[i + 1];

      const segment = expressionIndex.pathNodesBetween(a, b);
      if (segment.length) {
        if (nodePathSequence.length === 0) {
          nodePathSequence.push(...segment);
        } else {
          nodePathSequence.push(...segment.slice(1));
        }
      }
    }

    if (nodePathSequence.length === 0) {
      nodePathSequence.push(stepIds[0]);
    }

    for (let i = 0; i < nodePathSequence.length - 1; i++) {
      const from = nodePathSequence[i + 1];
      const to = nodePathSequence[i];

      const p = expressionIndex.parentById.get(from) ?? null;
      if (p === to) {
        selectedEdges.add(expressionIndex.edgeKey(to, from));
      } else {
        const p2 = expressionIndex.parentById.get(to) ?? null;
        if (p2 === from) {
          selectedEdges.add(expressionIndex.edgeKey(from, to));
        }
      }
    }

    return {
      selectedNodeIds: selectedNodes,
      selectedEdgeKeys: selectedEdges,
      nodePathSequence,
    };
  }

  private depthOf(id: NodeId, index: ExpressionIndex): number {
    let d = 0;
    let cur: NodeId | null = id;

    while (cur) {
      cur = index.parentById.get(cur) ?? null;
      if (cur) {
        d++;
      }
    }

    return d;
  }

  private buildWaves(args: {
    nodePathSequence: NodeId[];
    selectedEdges: Set<string>;
    index: ExpressionIndex;
  }): Wave[] {
    const { nodePathSequence, selectedEdges, index } = args;

    const unique = Array.from(new Set<NodeId>(nodePathSequence));

    const byDepth = new Map<number, NodeId[]>();
    let maxDepth = 0;

    for (const id of unique) {
      const depth = this.depthOf(id, index);
      maxDepth = Math.max(maxDepth, depth);

      const bucket = byDepth.get(depth) ?? [];
      bucket.push(id);
      byDepth.set(depth, bucket);
    }

    const waves: Wave[] = [];

    for (let depth = maxDepth; depth >= 0; depth--) {
      const nodes = byDepth.get(depth) ?? [];
      if (nodes.length === 0) {
        continue;
      }

      const edges: string[] = [];

      for (const nodeId of nodes) {
        const parent = index.parentById.get(nodeId) ?? null;
        if (!parent) {
          continue;
        }

        const k = index.edgeKey(parent, nodeId);
        if (selectedEdges.has(k)) {
          edges.push(k);
        }
      }

      waves.push({ nodes, edges });
    }

    return waves;
  }

  public buildSchedule(args: {
    nodePathSequence: NodeId[];
    selectedEdges: Set<string>;
    expressionIndex: ExpressionIndex;
  }): Array<{ atMs: number; nodes: NodeId[]; edges: string[] }> {
    const { nodePathSequence, selectedEdges, expressionIndex } = args;

    const waves = this.buildWaves({
      nodePathSequence,
      selectedEdges,
      index: expressionIndex,
    });

    const nodeMs = 520;
    const edgeMs = 260;

    const steps: Array<{ atMs: number; nodes: NodeId[]; edges: string[] }> = [];

    let t = 0;

    for (const wave of waves) {
      t += edgeMs;
      steps.push({ atMs: t, nodes: wave.nodes, edges: wave.edges });

      t += nodeMs;
      steps.push({ atMs: t, nodes: wave.nodes, edges: [] });
    }

    // clear at the end
    t += 350;
    steps.push({ atMs: t, nodes: [], edges: [] });

    return steps;
  }
}

export function useHighlightAnimation(args: {
  highlightChanges: readonly IExpressionChangeHistory[];
  highlightVersion: number; // "event counter" (monotonic) — NOT used for remounts
  highlightKey: string; // stable signature of highlightChanges
  expressionIndex: ExpressionIndex;
  isVisible: boolean;
  playNonce: number; // optional external replay trigger
}): {
  selectedNodeIds: Set<NodeId>;
  selectedEdgeKeys: Set<string>;
  activeNodeIds: Set<NodeId>;
  activeEdgeKeys: Set<string>;
} {
  const {
    highlightChanges,
    highlightVersion,
    highlightKey,
    expressionIndex,
    isVisible,
    playNonce,
  } = args;

  const animator = useMemo(() => {
    return new HighlightAnimator();
  }, []);

  // latest selection styling
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(() => new Set<NodeId>());
  const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(() => new Set<string>());

  // union of all running flows
  const [activeNodeIds, setActiveNodeIds] = useState<Set<NodeId>>(() => new Set<NodeId>());
  const [activeEdgeKeys, setActiveEdgeKeys] = useState<Set<string>>(() => new Set<string>());

  // flow states live in refs to avoid re-renders per timer tick
  const flowsRef = useRef<Map<number, FlowState>>(new Map());
  const timersRef = useRef<Map<number, number[]>>(new Map());
  const nextFlowIdRef = useRef<number>(1);

  const clearAllFlows = (): void => {
    for (const [, timerIds] of timersRef.current) {
      for (const t of timerIds) {
        window.clearTimeout(t);
      }
    }
    timersRef.current.clear();
    flowsRef.current.clear();

    setActiveNodeIds(() => new Set<NodeId>());
    setActiveEdgeKeys(() => new Set<string>());
  };

  const recomputeUnion = (): void => {
    const flowStates = flowsRef.current.values();
    const nodes = unionSets(Array.from(flowStates, (s) => s.nodeIds));
    const edges = unionSets(Array.from(flowStates, (s) => s.edgeKeys));

    setActiveNodeIds(() => nodes);
    setActiveEdgeKeys(() => edges);
  };

  const setFlowState = (flowId: number, nodes: NodeId[], edges: string[]): void => {
    flowsRef.current.set(flowId, {
      nodeIds: new Set<NodeId>(nodes),
      edgeKeys: new Set<string>(edges),
    });
    // one union update per step (still very cheap: 10–20 nodes)
    recomputeUnion();
  };

  const removeFlow = (flowId: number): void => {
    flowsRef.current.delete(flowId);

    const timerIds = timersRef.current.get(flowId) ?? [];
    for (const t of timerIds) {
      window.clearTimeout(t);
    }
    timersRef.current.delete(flowId);

    recomputeUnion();
  };

  // If the underlying graph changes, kill all old flows (their node ids are invalid anyway)
  useEffect(() => {
    clearAllFlows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expressionIndex]);

  // If not visible, stop animating (WCAG + perf)
  useEffect(() => {
    if (!isVisible) {
      clearAllFlows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => {
    // NOTE:
    // - highlightChanges is often a new array reference
    // - highlightKey is your stable signature
    // - highlightVersion is the "event counter" that forces *starting* a new flow
    if (!isVisible) {
      return;
    }

    if (!highlightChanges || highlightChanges.length === 0) {
      // keep selection empty + clear running flows
      setSelectedNodeIds(() => new Set<NodeId>());
      setSelectedEdgeKeys(() => new Set<string>());
      clearAllFlows();
      return;
    }

    const selection = animator.computeSelection({
      highlightChanges,
      expressionIndex,
    });

    setSelectedNodeIds(() => selection.selectedNodeIds);
    setSelectedEdgeKeys(() => selection.selectedEdgeKeys);

    if (selection.nodePathSequence.length === 0) {
      return;
    }

    const schedule = animator.buildSchedule({
      nodePathSequence: selection.nodePathSequence,
      selectedEdges: selection.selectedEdgeKeys,
      expressionIndex,
    });

    const flowId = nextFlowIdRef.current++;
    timersRef.current.set(flowId, []);

    // seed flow as empty (so union includes it consistently)
    setFlowState(flowId, [], []);

    for (const step of schedule) {
      const tid = window.setTimeout(() => {
        // if flow already removed, ignore
        if (!timersRef.current.has(flowId)) {
          return;
        }

        setFlowState(flowId, step.nodes, step.edges);

        // last step clears itself and ends the flow
        if (step.nodes.length === 0 && step.edges.length === 0) {
          removeFlow(flowId);
        }
      }, step.atMs);

      timersRef.current.get(flowId)?.push(tid);
    }
  }, [
    animator,
    expressionIndex,
    highlightVersion, // <-- event start trigger
    highlightKey,
    isVisible,
    playNonce,
  ]);

  return {
    selectedNodeIds,
    selectedEdgeKeys,
    activeNodeIds,
    activeEdgeKeys,
  };
}