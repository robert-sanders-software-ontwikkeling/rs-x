import { useEffect, useMemo, useRef, useState } from 'react';
import type { IExpressionChangeHistory } from '@rs-x/expression-parser';

type NodeId = string;

export function useHighlightAnimation(args: {
  highlightChanges: readonly IExpressionChangeHistory[];
  highlightVersion: number;
  highlightKey: string;

  index: {
    edgeKey: (from: NodeId, to: NodeId) => string;
  };

  animator: {
    computeSelection: (args: {
      highlightChanges: readonly IExpressionChangeHistory[];
      index: any;
    }) => {
      selectedNodeIds: Set<NodeId>;
      selectedEdgeKeys: Set<string>;
      nodePathSequence: NodeId[];
    };

    scheduleAnimation: (args: {
      nodePathSequence: NodeId[];
      selectedEdges: Set<string>;
      edgeKey: (a: NodeId, b: NodeId) => string;
      setActiveNodeId: React.Dispatch<React.SetStateAction<NodeId | null>>;
      setActiveEdgeKey: React.Dispatch<React.SetStateAction<string | null>>;
      timersRef: React.MutableRefObject<number[]>;
      clearTimers: () => void;
    }) => void;
  };
}): {
  selectedNodeIds: Set<NodeId>;
  selectedEdgeKeys: Set<string>;
  activeNodeId: NodeId | null;
  activeEdgeKey: string | null;
} {
  const { highlightChanges, highlightVersion, highlightKey, index, animator } = args;

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

  const empty = useMemo(() => {
    return {
      selectedNodeIds: new Set<NodeId>(),
      selectedEdgeKeys: new Set<string>(),
      activeNodeId: null as NodeId | null,
      activeEdgeKey: null as string | null,
    };
  }, []);

  useEffect(() => {
    clearTimers();

    if (!highlightChanges || highlightChanges.length === 0) {
      setSelectedNodeIds(() => empty.selectedNodeIds);
      setSelectedEdgeKeys(() => empty.selectedEdgeKeys);
      setActiveNodeId(() => empty.activeNodeId);
      setActiveEdgeKey(() => empty.activeEdgeKey);
      return;
    }

    const selection = animator.computeSelection({
      highlightChanges,
      index,
    });

    if (selection.nodePathSequence.length === 0) {
      setSelectedNodeIds(() => empty.selectedNodeIds);
      setSelectedEdgeKeys(() => empty.selectedEdgeKeys);
      setActiveNodeId(() => empty.activeNodeId);
      setActiveEdgeKey(() => empty.activeEdgeKey);
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
  }, [highlightVersion, highlightKey, index, animator, empty, highlightChanges]);

  return {
    selectedNodeIds,
    selectedEdgeKeys,
    activeNodeId,
    activeEdgeKey,
  };
}