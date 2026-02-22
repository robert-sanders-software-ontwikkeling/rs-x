import type { IExpressionChangeHistory } from '@rs-x/expression-parser';
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { ExpressionIndex } from '../expression-index';
import { NodeId } from '../layout/node.interface';

const animationSpeed = 350;

type Selection = {
  selectedNodeIds: Set<NodeId>;
  selectedEdgeKeys: Set<string>;
  nodePathSequence: NodeId[];
};

type Wave = {
  nodes: NodeId[];
  edges: string[];
};

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

  public scheduleAnimation(args: {
    nodePathSequence: NodeId[];
    selectedEdges: Set<string>;
    expressionIndex: ExpressionIndex;

    setActiveNodeIds: React.Dispatch<React.SetStateAction<Set<NodeId>>>;
    setActiveEdgeKeys: React.Dispatch<React.SetStateAction<Set<string>>>;

    timersRef: React.MutableRefObject<number[]>;
    clearTimers: () => void;
  }): void {
    const {
      nodePathSequence,
      selectedEdges,
      expressionIndex,
      setActiveNodeIds,
      setActiveEdgeKeys,
      timersRef,
      clearTimers,
    } = args;

    clearTimers();

    if (nodePathSequence.length === 0) {
      return;
    }

    const waves = this.buildWaves({
      nodePathSequence,
      selectedEdges,
      index: expressionIndex,
    });

    const nodeMs = 520;
    const edgeMs = 260;

    let t = 0;

    for (const wave of waves) {
      t += edgeMs;
      timersRef.current.push(
        window.setTimeout(() => {
          setActiveEdgeKeys(() => new Set<string>(wave.edges));
          setActiveNodeIds(() => new Set<NodeId>(wave.nodes));
        }, t)
      );

      t += nodeMs;
      timersRef.current.push(
        window.setTimeout(() => {
          setActiveEdgeKeys(() => new Set<string>());
          setActiveNodeIds(() => new Set<NodeId>(wave.nodes));
        }, t)
      );
    }

    t += animationSpeed;
    timersRef.current.push(
      window.setTimeout(() => {
        setActiveEdgeKeys(() => new Set<string>());
        setActiveNodeIds(() => new Set<NodeId>());
      }, t)
    );
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

  const animator = useMemo(() => new HighlightAnimator(), []);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(
    () => new Set<NodeId>()
  );
  const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [activeNodeIds, setActiveNodeIds] = useState<Set<NodeId>>(
    () => new Set<NodeId>()
  );
  const [activeEdgeKeys, setActiveEdgeKeys] = useState<Set<string>>(
    () => new Set<string>()
  );

  const timersRef = useRef<number[]>([]);

  const clearTimers = (): void => {
    for (const t of timersRef.current) {
      window.clearTimeout(t);
    }
    timersRef.current = [];
  };

  const resetState = (): void => {
    setSelectedNodeIds(() => new Set<NodeId>());
    setSelectedEdgeKeys(() => new Set<string>());
    setActiveNodeIds(() => new Set<NodeId>());
    setActiveEdgeKeys(() => new Set<string>());
  };

  useEffect(() => {
    clearTimers();

    if (!highlightChanges || highlightChanges.length === 0) {
      resetState();
      return () => clearTimers();
    }

    const selection = animator.computeSelection({
      highlightChanges,
      expressionIndex,
    });

    if (selection.nodePathSequence.length === 0) {
      resetState();
      return () => clearTimers();
    }

    setSelectedNodeIds(() => selection.selectedNodeIds);
    setSelectedEdgeKeys(() => selection.selectedEdgeKeys);

    if (!isVisible) {
      return () => clearTimers();
    }

    animator.scheduleAnimation({
      nodePathSequence: selection.nodePathSequence,
      selectedEdges: selection.selectedEdgeKeys,
      expressionIndex,
      setActiveNodeIds,
      setActiveEdgeKeys,
      timersRef,
      clearTimers,
    });

    return () => clearTimers();
  }, [
    highlightVersion,
    highlightKey,
    expressionIndex,
    isVisible,
    playNonce, // forces replay when panel becomes visible
  ]);

  return {
    selectedNodeIds,
    selectedEdgeKeys,
    activeNodeIds,
    activeEdgeKeys,
  };
}