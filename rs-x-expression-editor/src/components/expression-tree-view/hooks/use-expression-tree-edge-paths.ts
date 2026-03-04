import { useMemo } from 'react';

import type { IExpression } from '@rs-x/expression-parser';

import type { NodeId } from '../layout/node.interface';

type LayoutEdge = { from: NodeId; to: NodeId };

type LayoutNode = {
  id: NodeId;
  expression: IExpression;
};

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

function isHiddenExpression(expr: IExpression): boolean {
  return (expr as unknown as { hidden?: boolean }).hidden === true;
}

function buildHiddenNodeIdSet(nodes: readonly LayoutNode[]): ReadonlySet<NodeId> {
  const hidden = new Set<NodeId>();
  for (const n of nodes) {
    if (isHiddenExpression(n.expression)) {
      hidden.add(n.id);
    }
  }
  return hidden;
}

class EdgePathBuilder {
  public build(args: {
    edges: readonly LayoutEdge[];
    nodes: readonly LayoutNode[];
    nodePos: Map<NodeId, NodePos>;
    edgeKey: (from: NodeId, to: NodeId) => string;
    selectedEdgeKeys: Set<string>;
    activeEdgeKeys: ReadonlySet<string>;
  }): EdgePathVm[] {
    const {
      edges,
      nodes,
      nodePos,
      edgeKey,
      selectedEdgeKeys,
      activeEdgeKeys,
    } = args;

    const hiddenNodeIds = buildHiddenNodeIdSet(nodes);

    const out: EdgePathVm[] = [];

    for (const e of edges) {
      // 🚀 skip edges touching hidden nodes
      if (hiddenNodeIds.has(e.from) || hiddenNodeIds.has(e.to)) {
        continue;
      }

      const p = nodePos.get(e.from);
      const c = nodePos.get(e.to);

      // missing positions => don't draw
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
        className: `exprTreePath ${isSelected ? 'isSelected' : ''} ${
          isActive ? 'isActive' : ''
        }`,
      });
    }

    return out;
  }
}

export function useExpressionTreeEdgePaths(args: {
  edges: readonly LayoutEdge[];
  nodes: readonly LayoutNode[];
  nodePos: Map<NodeId, NodePos>;
  edgeKey: (from: NodeId, to: NodeId) => string;
  selectedEdgeKeys: Set<string>;
  activeEdgeKeys: ReadonlySet<string>;
}): EdgePathVm[] {
  const builder = useMemo(() => {
    return new EdgePathBuilder();
  }, []);

  const { edges, nodes, nodePos, edgeKey, selectedEdgeKeys, activeEdgeKeys } =
    args;

  return useMemo(() => {
    return builder.build({
      edges,
      nodes,
      nodePos,
      edgeKey,
      selectedEdgeKeys,
      activeEdgeKeys,
    });
  }, [builder, edges, nodes, nodePos, edgeKey, selectedEdgeKeys, activeEdgeKeys]);
}