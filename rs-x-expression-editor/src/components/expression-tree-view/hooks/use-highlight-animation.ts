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

    const changedIds: NodeId[] = [];
    for (const h of highlightChanges) {
      const id = expressionIndex.resolveNodeId(h.expression);
      if (id) {
        changedIds.push(id);
      }
    }

    if (changedIds.length === 0) {
      return {
        selectedNodeIds: new Set<NodeId>(),
        selectedEdgeKeys: new Set<string>(),
        nodePathSequence: [],
      };
    }

    // selected styling: only actually-changed nodes
    const selectedNodeIds = new Set<NodeId>(changedIds);

    // bubble-up path: changed node(s) -> root
    const path: NodeId[] = [];
    const selectedEdgeKeys = new Set<string>();

    for (const startId of changedIds) {
      const chain = expressionIndex.chainToRoot(startId); // [start, parent, ..., root]

      for (const id of chain) {
        path.push(id);
      }

      // edges along the chain (parent -> child)
      for (let i = 0; i < chain.length - 1; i++) {
        const child = chain[i];
        const parent = chain[i + 1];
        selectedEdgeKeys.add(expressionIndex.edgeKey(parent, child));
      }
    }

    // de-dupe while keeping order
    const seen = new Set<NodeId>();
    const nodePathSequence: NodeId[] = [];
    for (const id of path) {
      if (!seen.has(id)) {
        seen.add(id);
        nodePathSequence.push(id);
      }
    }

    return {
      selectedNodeIds,
      selectedEdgeKeys,
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

    // deepest -> root, include edges for those nodes (parent->child)
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

    const edgeMs = 320;
    const nodeMs = 520;
    const clearMs = 350;

    const steps: Array<{ atMs: number; nodes: NodeId[]; edges: string[] }> = [];
    let t = 0;

    for (const wave of waves) {
      t += edgeMs;
      steps.push({ atMs: t, nodes: wave.nodes, edges: wave.edges });

      t += nodeMs;
      steps.push({ atMs: t, nodes: wave.nodes, edges: [] });
    }

    t += clearMs;
    steps.push({ atMs: t, nodes: [], edges: [] });

    return steps;
  }
}

export function useHighlightAnimation(args: {
  highlightChanges: readonly IExpressionChangeHistory[];
  highlightVersion: number;
  highlightKey: string;
  expressionIndex: ExpressionIndex;
  isVisible: boolean;
  playNonce: number;
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

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(
    () => new Set<NodeId>(),
  );
  const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const [activeNodeIds, setActiveNodeIds] = useState<Set<NodeId>>(
    () => new Set<NodeId>(),
  );
  const [activeEdgeKeys, setActiveEdgeKeys] = useState<Set<string>>(
    () => new Set<string>(),
  );

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
    // ✅ FIX: materialize once; Map.values() is an iterator and gets consumed
    const flowStates = Array.from(flowsRef.current.values());

    const nodes = unionSets(flowStates.map((s) => s.nodeIds));
    const edges = unionSets(flowStates.map((s) => s.edgeKeys));

    setActiveNodeIds(() => nodes);
    setActiveEdgeKeys(() => edges);
  };

  const setFlowState = (
    flowId: number,
    nodes: NodeId[],
    edges: string[],
  ): void => {
    flowsRef.current.set(flowId, {
      nodeIds: new Set<NodeId>(nodes),
      edgeKeys: new Set<string>(edges),
    });

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

  useEffect(() => {
    clearAllFlows();
  }, [expressionIndex]);

  useEffect(() => {
    if (!isVisible) {
      clearAllFlows();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (!highlightChanges || highlightChanges.length === 0) {
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

    setFlowState(flowId, [], []);

    for (const step of schedule) {
      const tid = window.setTimeout(() => {
        if (!timersRef.current.has(flowId)) {
          return;
        }

        setFlowState(flowId, step.nodes, step.edges);

        if (step.nodes.length === 0 && step.edges.length === 0) {
          removeFlow(flowId);
        }
      }, step.atMs);

      timersRef.current.get(flowId)?.push(tid);
    }
  }, [
    animator,
    expressionIndex,
    highlightVersion,
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
