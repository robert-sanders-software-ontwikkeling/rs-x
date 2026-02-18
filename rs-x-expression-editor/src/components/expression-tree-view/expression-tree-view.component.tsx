import React, { useMemo } from 'react';

import type { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';
import { ExpressionIndex } from './expression-index';
import './expression-tree-view.component.css';
import { useExpressionChangedRerender } from './hooks/use-expression-changed-rerender';
import { useHighlightAnimation } from './hooks/use-highlight-animation';
import { useResizeObserverSize } from './hooks/use-resize-observer-size';
import { TreeLayoutEngine } from './layout/tree-layout-engine';
import { ValueFormatter } from './value-formatter';
import { useExpressionTreeViewport } from './hooks/use-expression-tree-viewport';

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
    zoomPercent = 100,
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

  const valueFormatterFn = useMemo(() => {
    if (formatValue) {
      return formatValue;
    }

    const vf = new ValueFormatter(valueMaxDepth, valueMaxChars);
    return (v: unknown) => {
      return vf.format(v);
    };
  }, [formatValue, valueMaxDepth, valueMaxChars]);

  const { zoomScale, paddedW, paddedH, scaledW, scaledH, nodePos } =
    useExpressionTreeViewport({
      layout,
      nodeWidth,
      nodeHeight,
      horizontalGap,
      verticalGap,
      panelW: hostSize.width || 0,
      panelH: hostSize.height || 0,
      zoomPercent,
    });

  return (
    <div ref={hostRef} className={`exprTreeRoot ${className ?? ''}`} style={style}>
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