import { useMemo } from 'react';
import type { NodeId } from '../layout/node.interface';

type LayoutEdge = { from: NodeId; to: NodeId };

type NodePos = {
  cx: number;
  topY: number;
  bottomY: number;
};

export type EdgePathVm = {
  key: string;
  d: string;
  className: string;
};

class EdgePathBuilder {
  public build(args: {
    edges: readonly LayoutEdge[];
    nodePos: Map<NodeId, NodePos>;
    edgeKey: (from: NodeId, to: NodeId) => string;
    selectedEdgeKeys: Set<string>;
    activeEdgeKeys: ReadonlySet<string>;
  }): EdgePathVm[] {
    const { edges, nodePos, edgeKey, selectedEdgeKeys, activeEdgeKeys } = args;

    const out: EdgePathVm[] = [];

    for (const e of edges) {
      const p = nodePos.get(e.from);
      const c = nodePos.get(e.to);

      if (!p || !c) {
        continue;
      }

      const x1 = p.cx;
      const y1 = p.bottomY;
      const x2 = c.cx;
      const y2 = c.topY;

      const midY = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

      const k = edgeKey(e.from, e.to);

      const isSelected = selectedEdgeKeys.has(k);
      const isActive = activeEdgeKeys.has(k);

      out.push({
        key: k,
        d,
        className: `exprTreePath ${isSelected ? 'isSelected' : ''} ${isActive ? 'isActive' : ''}`,
      });
    }

    return out;
  }
}

export function useExpressionTreeEdgePaths(args: {
  edges: readonly LayoutEdge[];
  nodePos: Map<NodeId, NodePos>;
  edgeKey: (from: NodeId, to: NodeId) => string;
  selectedEdgeKeys: Set<string>;
  activeEdgeKeys: ReadonlySet<string>;
}): EdgePathVm[] {
  const builder = useMemo(() => {
    return new EdgePathBuilder();
  }, []);

  const { edges, nodePos, edgeKey, selectedEdgeKeys, activeEdgeKeys } = args;

  return useMemo(() => {
    return builder.build({
      edges,
      nodePos,
      edgeKey,
      selectedEdgeKeys,
      activeEdgeKeys,
    });
  }, [builder, edges, nodePos, edgeKey, selectedEdgeKeys, activeEdgeKeys]);
}