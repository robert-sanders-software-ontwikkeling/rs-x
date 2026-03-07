'use client';

import { useMemo } from 'react';

import type { IExpression } from '@rs-x/expression-parser';

import type { NodeId } from '../layout/node.interface';

type LayoutNode = {
  id: NodeId;
  expression: IExpression;
};

type NodePos = {
  left: number;
  top: number;
};

export type NodeVm = {
  id: NodeId;
  className: string;
  style: React.CSSProperties;
  expressionText: string;
  typeText: string;
  valueText: string;
  isAsync: boolean;
};

class NodeVmBuilder {
  public build(args: {
    nodes: readonly LayoutNode[];
    nodePos: Map<NodeId, NodePos>;
    nodeWidth: number;
    nodeHeight: number;

    selectedNodeIds: Set<NodeId>;
    activeNodeIds: ReadonlySet<NodeId>;

    formatValue: (v: unknown) => string;
  }): NodeVm[] {
    const {
      nodes,
      nodePos,
      nodeWidth,
      nodeHeight,
      selectedNodeIds,
      activeNodeIds,
      formatValue,
    } = args;

    const out: NodeVm[] = [];

    for (const n of nodes) {
      // 🚀 skip hidden expressions
      if (n.expression.hidden === true) {
        continue;
      }

      const pos = nodePos.get(n.id);
      if (!pos) {
        continue;
      }

      const expressionText = n.expression.expressionString;
      const typeText = n.expression.type;
      const valueText = formatValue(n.expression.value);
      const isAsync = !!n.expression.isAsync;

      const isSelected = selectedNodeIds.has(n.id);
      const isActive = activeNodeIds.has(n.id);

      out.push({
        id: n.id,
        className: `exprNode ${isSelected ? 'isSelected' : ''} ${isActive ? 'isActive' : ''}`,
        style: {
          width: nodeWidth,
          height: nodeHeight,
          left: pos.left,
          top: pos.top,
        },
        expressionText,
        typeText,
        valueText,
        isAsync,
      });
    }

    return out;
  }
}

export function useExpressionTreeNodeVms(args: {
  nodes: readonly LayoutNode[];
  nodePos: Map<NodeId, NodePos>;
  nodeWidth: number;
  nodeHeight: number;

  selectedNodeIds: Set<NodeId>;
  activeNodeIds: ReadonlySet<NodeId>;

  formatValue: (v: unknown) => string;
}): NodeVm[] {
  const builder = useMemo(() => {
    return new NodeVmBuilder();
  }, []);

  const {
    nodes,
    nodePos,
    nodeWidth,
    nodeHeight,
    selectedNodeIds,
    activeNodeIds,
    formatValue,
  } = args;

  return useMemo(() => {
    return builder.build({
      nodes,
      nodePos,
      nodeWidth,
      nodeHeight,
      selectedNodeIds,
      activeNodeIds,
      formatValue,
    });
  }, [
    builder,
    nodes,
    nodePos,
    nodeWidth,
    nodeHeight,
    selectedNodeIds,
    activeNodeIds,
    formatValue,
  ]);
}
