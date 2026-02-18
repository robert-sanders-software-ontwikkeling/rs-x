import React, { useMemo } from 'react';

import type { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';
import { ExpressionIndex } from './expression-index';
import './expression-tree-view.component.css';
import { useExpressionChangedRerender } from './hooks/use-expression-changed-rerender';
import { useHighlightAnimation } from './hooks/use-highlight-animation';
import { useResizeObserverSize } from './hooks/use-resize-observer-size';
import { NodeId } from './layout/node.interface';
import { TreeLayoutEngine } from './layout/tree-layout-engine';
import { ValueFormatter } from './value-formatter';

export interface IExpressionTreeProps {
  version: number;
  root: IExpression;

  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;

  formatValue?: (value: unknown) => string;
  valueMaxDepth?: number;
  valueMaxChars?: number;

  className?: string;
  style?: React.CSSProperties;

  highlightChanges?: readonly IExpressionChangeHistory[];
  highlightVersion?: number;

  // ✅ NEW: controlled zoom from parent (App header dropdown)
  zoomPercent?: number;
}


const DEFAULTS = {
  nodeWidth: 260,
  nodeHeight: 160,
  horizontalGap: 32,
  verticalGap: 56,
  valueMaxDepth: 6,
  valueMaxChars: 4000,
} as const;



export const ExpressionTree: React.FC<IExpressionTreeProps> = (props) => {
  const {
    root,
    version,
    nodeWidth = DEFAULTS.nodeWidth,
    nodeHeight = DEFAULTS.nodeHeight,
    horizontalGap = DEFAULTS.horizontalGap,
    verticalGap = DEFAULTS.verticalGap,
    valueMaxDepth = DEFAULTS.valueMaxDepth,
    valueMaxChars = DEFAULTS.valueMaxChars,
    formatValue,
    className,
    style,
    highlightChanges = [],
    highlightVersion = 0,
    zoomPercent = 100, // ✅ controlled from parent
  } = props;

  const [hostRef, hostSize] = useResizeObserverSize<HTMLDivElement>();

  const layoutEngine = useMemo(() => {
    return new TreeLayoutEngine();
  }, []);

  const layout = useMemo(() => {
    void version;
    return layoutEngine.computeLayout(root);
  }, [layoutEngine, root, version]);

  const index = useMemo(() => {
    return new ExpressionIndex(layout);
  }, [layout]);

 

  const zoomScale = useMemo(() => {
    return zoomPercent / 100;
  }, [zoomPercent]);

  const unitX = nodeWidth + horizontalGap;
  const unitY = nodeHeight + verticalGap;

  const treeW = (layout.maxX + 1) * unitX + horizontalGap;
  const treeH = (layout.maxDepth + 1) * unitY + verticalGap;

  const panelW = hostSize.width || 0;
  const panelH = hostSize.height || 0;

  // ✅ CENTERING FIX:
  const availableUnscaledW = zoomScale > 0 ? panelW / zoomScale : panelW;
  const availableUnscaledH = zoomScale > 0 ? panelH / zoomScale : panelH;

  const originX = Math.max(0, (availableUnscaledW - treeW) / 2);
  const originY = Math.max(0, (availableUnscaledH - treeH) / 2);

  const paddedW = treeW + originX * 2;
  const paddedH = treeH + originY * 2;

  const scaledW = Math.ceil(paddedW * zoomScale);
  const scaledH = Math.ceil(paddedH * zoomScale);

  const valueFormatterFn = useMemo(() => {
    if (formatValue) {
      return formatValue;
    }

    const vf = new ValueFormatter(valueMaxDepth, valueMaxChars);
    return (v: unknown) => {
      return vf.format(v);
    };
  }, [formatValue, valueMaxDepth, valueMaxChars]);

  const nodePos = useMemo(() => {
    const map = new Map<NodeId, { left: number; top: number; cx: number; topY: number; bottomY: number }>();

    for (const n of layout.nodes) {
      const left = originX + n.x * unitX + horizontalGap;
      const top = originY + n.y * unitY + verticalGap;

      map.set(n.id, {
        left,
        top,
        cx: left + nodeWidth / 2,
        topY: top,
        bottomY: top + nodeHeight,
      });
    }

    return map;
  }, [
    layout.nodes,
    originX,
    originY,
    unitX,
    unitY,
    horizontalGap,
    verticalGap,
    nodeWidth,
    nodeHeight,
  ]);

  const highlightKey = useMemo(() => {
    return index.buildHighlightKey(highlightChanges);
  }, [index, highlightChanges]);

  useExpressionChangedRerender(root);

  const { selectedNodeIds, selectedEdgeKeys, activeNodeId, activeEdgeKey } =
    useHighlightAnimation({
      highlightChanges,
      highlightVersion,
      highlightKey,
      index,
    });
  return (
    <div ref={hostRef} className={`exprTreeRoot ${className ?? ''}`} style={style}>
      {/* ✅ REMOVED: internal zoom toolbar (now owned by App header) */}

      <div className='exprTreeViewport'>
        <div className='exprTreeSpacer' style={{ width: scaledW, height: scaledH }}>
          <div
            className='exprTreeZoomLayer'
            style={{
              width: paddedW,
              height: paddedH,
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top left',
            }}
          >
            <div className='exprTreeCanvas' style={{ width: paddedW, height: paddedH }}>
              <svg
                className='exprTreeLines'
                width={paddedW}
                height={paddedH}
                viewBox={`0 0 ${paddedW} ${paddedH}`}
              >
                {layout.edges.map((e) => {
                  const p = nodePos.get(e.from);
                  const c = nodePos.get(e.to);

                  if (!p || !c) {
                    return null;
                  }

                  const x1 = p.cx;
                  const y1 = p.bottomY;
                  const x2 = c.cx;
                  const y2 = c.topY;
                  const midY = (y1 + y2) / 2;

                  const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

                  const k = index.edgeKey(e.from, e.to);
                  const isSelected = selectedEdgeKeys.has(k);
                  const isActive = activeEdgeKey === k;

                  return (
                    <path
                      key={k}
                      d={d}
                      className={`exprTreePath ${isSelected ? 'isSelected' : ''} ${isActive ? 'isActive' : ''}`}
                    />
                  );
                })}
              </svg>

              {layout.nodes.map((n) => {
                const pos = nodePos.get(n.id);
                if (!pos) {
                  return null;
                }

                const expressionText = n.expr.expressionString;
                const typeText = String(n.expr.type);
                const valueText = valueFormatterFn(n.expr.value);

                const isSelected = selectedNodeIds.has(n.id);
                const isActive = activeNodeId === n.id;

                return (
                  <div
                    key={n.id}
                    className={`exprNode ${isSelected ? 'isSelected' : ''} ${isActive ? 'isActive' : ''}`}
                    style={{
                      width: nodeWidth,
                      height: nodeHeight,
                      left: pos.left,
                      top: pos.top,
                    }}
                  >
                    <div className='exprNodeHeader'>
                      <div className='exprNodeDot' />
                      <div className='exprNodeHeaderText'>
                        <div className='exprNodeTitleRow'>
                          <div className='exprNodeTitle' title={expressionText}>
                            {expressionText}
                          </div>
                          <div className='exprNodeType' title={typeText}>
                            {typeText}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='exprNodeBody'>
                      {valueText ? (
                        <pre className='exprNodePre'>{valueText}</pre>
                      ) : (
                        <div className='exprNodeMuted'>no value</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};