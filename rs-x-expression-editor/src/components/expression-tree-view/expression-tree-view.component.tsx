import React, { useMemo } from 'react';

import type { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';
import { ExpressionIndex } from './expression-index';
import './expression-tree-view.component.css';
import { useExpressionChangedRerender } from './hooks/use-expression-changed-rerender';
import { useExpressionTreeEdgePaths } from './hooks/use-expression-tree-edge-paths';
import { useExpressionTreeNodeVms } from './hooks/use-expression-tree-node-vms';
import { useExpressionTreeViewport } from './hooks/use-expression-tree-viewport';
import { useHighlightAnimation } from './hooks/use-highlight-animation';
import { useResizeObserverSize } from './hooks/use-resize-observer-size';
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

  highlightChanges?: IExpressionChangeHistory[];
  highlightVersion?: number;
  zoomPercent?: number;

  isVisible?: boolean;
  playNonce?: number;
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
    isVisible = true,
    playNonce = 0,
  } = props;

  const [hostRef, hostSize] = useResizeObserverSize<HTMLDivElement>();

  // ✅ Prevent layout calculation while size is 0 (panel animating)
  const hasValidSize = (hostSize.width ?? 0) > 0 && (hostSize.height ?? 0) > 0;

  const layoutEngine = useMemo(() => {
    return new TreeLayoutEngine();
  }, []);

  const layout = useMemo(() => {
    return layoutEngine.computeLayout(root);
  }, [layoutEngine, root, version]);

  const expressionIndex = useMemo(() => {
    return new ExpressionIndex(layout);
  }, [layout, version]);

  const highlightKey = useMemo(() => {
    return expressionIndex.buildHighlightKey(highlightChanges);
  }, [expressionIndex, highlightChanges, version]);

  useExpressionChangedRerender(root);

  const { selectedNodeIds, selectedEdgeKeys, activeNodeIds, activeEdgeKeys } =
    useHighlightAnimation({
      highlightChanges,
      highlightVersion,
      highlightKey,
      expressionIndex,
      isVisible,
      playNonce,
    });

  const valueFormatterFn = useMemo(() => {
    if (formatValue) {
      return formatValue;
    }

    const valueFormatter = new ValueFormatter(valueMaxDepth, valueMaxChars);
    return (v: unknown) => {
      return valueFormatter.format(v);
    };
  }, [formatValue, valueMaxDepth, valueMaxChars]);

  // ✅ Only compute viewport with real dimensions
  const {
    zoomScale,
    paddedW,
    paddedH,
    scaledW,
    scaledH,
    nodePos,
  } = useExpressionTreeViewport({
    layout,
    nodeWidth,
    nodeHeight,
    horizontalGap,
    verticalGap,
    panelW: hasValidSize ? hostSize.width : 0,
    panelH: hasValidSize ? hostSize.height : 0,
    zoomPercent,
  });

  const edgePaths = useExpressionTreeEdgePaths({
    edges: layout.edges,
    nodePos,
    edgeKey: (a, b) => expressionIndex.edgeKey(a, b),
    selectedEdgeKeys,
    activeEdgeKeys,
  });

  const nodeViewModels = useExpressionTreeNodeVms({
    nodes: layout.nodes,
    nodePos,
    nodeWidth,
    nodeHeight,
    selectedNodeIds,
    activeNodeIds,
    formatValue: valueFormatterFn,
  });

  return (
    <div ref={hostRef} className={`exprTreeRoot ${className ?? ''}`} style={style}>
      {/* ✅ Do not render tree until panel has real size */}
      {!hasValidSize ? null : (
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
                  {edgePaths.map((p) => {
                    return <path key={p.key} d={p.d} className={p.className} />;
                  })}
                </svg>

                {nodeViewModels.map((vm) => {
                  return (
                    <div key={vm.id} className={vm.className} style={vm.style}>
                      <div className='exprNodeHeader'>
                        <div className='exprNodeDot' />
                        <div className='exprNodeHeaderText'>
                          <div className='exprNodeTitleRow'>
                            <div className='exprNodeTitle' title={vm.expressionText}>
                              {vm.expressionText}
                            </div>
                            <div className='exprNodeType' title={vm.typeText}>
                              {vm.typeText}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='exprNodeBody'>
                        {vm.valueText ? (
                          <pre className='exprNodePre'>{vm.valueText}</pre>
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
      )}
    </div>
  );
};