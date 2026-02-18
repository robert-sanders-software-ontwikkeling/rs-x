import { useMemo } from 'react';
import type { IExpression } from '@rs-x/expression-parser';
import type { NodeId } from '../layout/node.interface';

type LayoutNode = {
    id: NodeId;
    expr: IExpression;
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
};

class NodeVmBuilder {
    public build(args: {
        nodes: readonly LayoutNode[];
        nodePos: Map<NodeId, NodePos>;
        nodeWidth: number;
        nodeHeight: number;

        selectedNodeIds: Set<NodeId>;
        activeNodeId: NodeId | null;

        formatValue: (v: unknown) => string;
    }): NodeVm[] {
        const {
            nodes,
            nodePos,
            nodeWidth,
            nodeHeight,
            selectedNodeIds,
            activeNodeId,
            formatValue,
        } = args;

        const out: NodeVm[] = [];

        for (const n of nodes) {
            const pos = nodePos.get(n.id);
            if (!pos) {
                continue;
            }

            const expressionText = n.expr.expressionString;
            const typeText = String(n.expr.type);
            const valueText = formatValue(n.expr.value);

            const isSelected = selectedNodeIds.has(n.id);
            const isActive = activeNodeId === n.id;

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
    activeNodeId: NodeId | null;

    formatValue: (v: unknown) => string;
}): NodeVm[] {
    const builder = useMemo(() => new NodeVmBuilder(), []);

    const {
        nodes,
        nodePos,
        nodeWidth,
        nodeHeight,
        selectedNodeIds,
        activeNodeId,
        formatValue,
    } = args;

    return useMemo(() => {
        return builder.build({
            nodes,
            nodePos,
            nodeWidth,
            nodeHeight,
            selectedNodeIds,
            activeNodeId,
            formatValue,
        });
    }, [
        builder,
        nodes,
        nodePos,
        nodeWidth,
        nodeHeight,
        selectedNodeIds,
        activeNodeId,
        formatValue,
    ]);
}