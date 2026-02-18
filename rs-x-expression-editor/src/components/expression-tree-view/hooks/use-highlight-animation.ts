import type { IExpressionChangeHistory } from '@rs-x/expression-parser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExpressionIndex } from '../expression-index';
import { NodeId } from '../layout/node.interface';


const animationSpeed = 350;


class HighlightAnimator {
  public computeSelection(args: {
    highlightChanges: readonly IExpressionChangeHistory[];
    index: ExpressionIndex;
  }): {
    selectedNodeIds: Set<NodeId>;
    selectedEdgeKeys: Set<string>;
    nodePathSequence: NodeId[];
  } {
    const { highlightChanges, index } = args;

    const stepIds: NodeId[] = [];

    for (const h of highlightChanges) {
      const id = index.resolveNodeId(h.expression);
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

    const selectedNodes = new Set<NodeId>();
    const selectedEdges = new Set<string>();

    for (const id of stepIds) {
      selectedNodes.add(id);
    }

    const nodePathSequence: NodeId[] = [];

    for (let i = 0; i < stepIds.length - 1; i++) {
      const a = stepIds[i];
      const b = stepIds[i + 1];

      const segment = index.pathNodesBetween(a, b);
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

      const p = index.parentById.get(from) ?? null;
      if (p === to) {
        selectedEdges.add(index.edgeKey(to, from));
      } else {
        const p2 = index.parentById.get(to) ?? null;
        if (p2 === from) {
          selectedEdges.add(index.edgeKey(from, to));
        }
      }
    }

    return {
      selectedNodeIds: selectedNodes,
      selectedEdgeKeys: selectedEdges,
      nodePathSequence,
    };
  }

  public scheduleAnimation(args: {
    nodePathSequence: NodeId[];
    selectedEdges: Set<string>;
    edgeKey: (a: NodeId, b: NodeId) => string;
    setActiveNodeId: React.Dispatch<React.SetStateAction<NodeId | null>>;
    setActiveEdgeKey: React.Dispatch<React.SetStateAction<string | null>>;
    timersRef: React.MutableRefObject<number[]>;
    clearTimers: () => void;
  }): void {
    const {
      nodePathSequence,
      selectedEdges,
      edgeKey,
      setActiveNodeId,
      setActiveEdgeKey,
      timersRef,
      clearTimers,
    } = args;

    clearTimers();

    if (nodePathSequence.length === 0) {
      setActiveEdgeKey(() => null);
      setActiveNodeId(() => null);
      return;
    }

    const nodeMs = 520;
    const edgeMs = 260;

    setActiveNodeId(() => nodePathSequence[0] ?? null);
    setActiveEdgeKey(() => null);

    let t = 0;

    for (let i = 0; i < nodePathSequence.length - 1; i++) {
      const a = nodePathSequence[i];
      const b = nodePathSequence[i + 1];

      const k1 = edgeKey(a, b);
      const k2 = edgeKey(b, a);
      const activeK = selectedEdges.has(k1) ? k1 : selectedEdges.has(k2) ? k2 : null;

      t += edgeMs;
      timersRef.current.push(
        window.setTimeout(() => {
          setActiveEdgeKey(() => activeK);
          setActiveNodeId(() => a);
        }, t)
      );

      t += nodeMs;
      timersRef.current.push(
        window.setTimeout(() => {
          setActiveEdgeKey(() => null);
          setActiveNodeId(() => b);
        }, t)
      );
    }

    t += animationSpeed;
    timersRef.current.push(
      window.setTimeout(() => {
        setActiveEdgeKey(() => null);
        setActiveNodeId(() => null);
      }, t)
    );
  }
}


export function useHighlightAnimation(args: {
  highlightChanges: readonly IExpressionChangeHistory[];
  highlightVersion: number;
  highlightKey: string;
  index: ExpressionIndex;
}): {
  selectedNodeIds: Set<NodeId>;
  selectedEdgeKeys: Set<string>;
  activeNodeId: NodeId | null;
  activeEdgeKey: string | null;
} {
  const { highlightChanges, highlightVersion, highlightKey, index } = args;

  // ✅ internal animator instance (stable)
  const animator = useMemo(() => {
    return new HighlightAnimator();
  }, []);

  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<NodeId>>(() => new Set<NodeId>());
  const [selectedEdgeKeys, setSelectedEdgeKeys] = useState<Set<string>>(() => new Set<string>());
  const [activeNodeId, setActiveNodeId] = useState<NodeId | null>(null);
  const [activeEdgeKey, setActiveEdgeKey] = useState<string | null>(null);

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
    setActiveNodeId(() => null);
    setActiveEdgeKey(() => null);
  };

  useEffect(() => {
    clearTimers();

    if (!highlightChanges || highlightChanges.length === 0) {
      resetState();
      return;
    }

    const selection = animator.computeSelection({
      highlightChanges,
      index,
    });

    if (selection.nodePathSequence.length === 0) {
      resetState();
      return;
    }

    setSelectedNodeIds(() => selection.selectedNodeIds);
    setSelectedEdgeKeys(() => selection.selectedEdgeKeys);

    animator.scheduleAnimation({
      nodePathSequence: selection.nodePathSequence,
      selectedEdges: selection.selectedEdgeKeys,
      edgeKey: (a, b) => index.edgeKey(a, b),
      setActiveNodeId,
      setActiveEdgeKey,
      timersRef,
      clearTimers,
    });

    return () => {
      clearTimers();
    };
  }, [highlightVersion, highlightKey, index, animator, highlightChanges]);

  return {
    selectedNodeIds,
    selectedEdgeKeys,
    activeNodeId,
    activeEdgeKey,
  };
}