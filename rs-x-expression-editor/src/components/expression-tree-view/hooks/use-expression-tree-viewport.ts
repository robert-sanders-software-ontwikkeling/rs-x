import { useMemo } from 'react';
import type { NodeId } from '../layout/node.interface';
import { LayoutResult } from '../layout/layout-result.interface';

export type NodePos = {
    left: number;
    top: number;
    cx: number;
    topY: number;
    bottomY: number;
};

export type ExpressionTreeViewport = {
    zoomScale: number;

    paddedW: number;
    paddedH: number;

    scaledW: number;
    scaledH: number;

    nodePos: Map<NodeId, NodePos>;
};

class TreeViewportCalculator {
    public compute(args: {
        layout: LayoutResult;

        nodeWidth: number;
        nodeHeight: number;
        horizontalGap: number;
        verticalGap: number;

        panelW: number;
        panelH: number;

        zoomPercent: number;
    }): ExpressionTreeViewport {
        const {
            layout,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            panelW,
            panelH,
            zoomPercent,
        } = args;

        const zoomScale = zoomPercent / 100;

        const unitX = nodeWidth + horizontalGap;
        const unitY = nodeHeight + verticalGap;

        const treeW = (layout.maxX + 1) * unitX + horizontalGap;
        const treeH = (layout.maxDepth + 1) * unitY + verticalGap;

        const safeZoomScale = zoomScale > 0 ? zoomScale : 1;

        const availableUnscaledW = panelW / safeZoomScale;
        const availableUnscaledH = panelH / safeZoomScale;

        const originX = Math.max(0, (availableUnscaledW - treeW) / 2);
        const originY = Math.max(0, (availableUnscaledH - treeH) / 2);

        const paddedW = treeW + originX * 2;
        const paddedH = treeH + originY * 2;

        const scaledW = Math.ceil(paddedW * safeZoomScale);
        const scaledH = Math.ceil(paddedH * safeZoomScale);

        const nodePos = new Map<NodeId, NodePos>();

        for (const n of layout.nodes) {
            const left = originX + n.x * unitX + horizontalGap;
            const top = originY + n.y * unitY + verticalGap;

            nodePos.set(n.id, {
                left,
                top,
                cx: left + nodeWidth / 2,
                topY: top,
                bottomY: top + nodeHeight,
            });
        }

        return {
            zoomScale: safeZoomScale,
            paddedW,
            paddedH,
            scaledW,
            scaledH,
            nodePos,
        };
    }
}

export function useExpressionTreeViewport(args: {
    layout: LayoutResult;

    nodeWidth: number;
    nodeHeight: number;
    horizontalGap: number;
    verticalGap: number;

    panelW: number;
    panelH: number;

    zoomPercent: number;
}): ExpressionTreeViewport {
    const calculator = useMemo(() => {
        return new TreeViewportCalculator();
    }, []);

    const {
        layout,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        panelW,
        panelH,
        zoomPercent,
    } = args;

    return useMemo(() => {
        return calculator.compute({
            layout,
            nodeWidth,
            nodeHeight,
            horizontalGap,
            verticalGap,
            panelW,
            panelH,
            zoomPercent,
        });
    }, [
        calculator,
        layout,
        nodeWidth,
        nodeHeight,
        horizontalGap,
        verticalGap,
        panelW,
        panelH,
        zoomPercent,
    ]);
}