import React, { useEffect, useMemo, useRef } from 'react';

import { PrettyPrinter } from '@rs-x/core';
import type {
  IExpression,
  IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { snapZoomPercentToPreset } from '../zoom-dropdown/zoom-presets';

import { useExpressionChangedRerender } from './hooks/use-expression-changed-rerender';
import { useExpressionTreeEdgePaths } from './hooks/use-expression-tree-edge-paths';
import { useExpressionTreeNodeVms } from './hooks/use-expression-tree-node-vms';
import { useExpressionTreeViewport } from './hooks/use-expression-tree-viewport';
import { useHighlightAnimation } from './hooks/use-highlight-animation';
import { useResizeObserverSize } from './hooks/use-resize-observer-size';
import { TreeLayoutEngine } from './layout/tree-layout-engine';
import { ExpressionIndex } from './expression-index';

import './expression-tree-view.component.css';

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
  fitRequestNonce?: number;
  centerRequestNonce?: number;
  onFitZoomComputed?: (zoomPercent: number) => void;
}

const DEFAULTS = {
  nodeWidth: 260,
  nodeHeight: 160,
  horizontalGap: 32,
  verticalGap: 56,
  valueMaxDepth: 6,
  valueMaxChars: 4000,
} as const;

const AsyncBadge: React.FC<{ title?: string }> = ({
  title = 'Waiting for async value',
}) => {
  return (
    <span className="exprNodeAsyncPill" title={title} aria-label={title}>
      <span className="exprNodeAsyncPulse" aria-hidden="true" />
      <span className="exprNodeAsyncLabel">async</span>
    </span>
  );
};

function valueKey(v: unknown): string {
  if (v === null) {
    return 'null';
  }

  if (v === undefined) {
    return 'undefined';
  }

  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  return String(v);
}

function buildHighlightKey(
  index: ExpressionIndex,
  changes: readonly IExpressionChangeHistory[],
): string {
  return changes
    .map((h) => {
      const id = index.exprKey(h.expression);
      return `${id}:${valueKey(h.oldValue)}=>${valueKey(h.value)}`;
    })
    .join('|');
}

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
    fitRequestNonce = 0,
    centerRequestNonce = 0,
    onFitZoomComputed,
  } = props;

  const [hostRef, hostSize] = useResizeObserverSize<HTMLDivElement>();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastFitRequestNonceRef = useRef<number>(0);

  const hasValidSize = (hostSize.width ?? 0) > 0 && (hostSize.height ?? 0) > 0;

  const layoutEngine = useMemo(() => {
    return new TreeLayoutEngine();
  }, []);

  const layout = useMemo(() => {
    return layoutEngine.computeLayout(root);
  }, [layoutEngine, root, version]);

  useEffect(() => {
    if (!hasValidSize) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      left: Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2),
      top: Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2),
      behavior: 'smooth',
    });
  }, [centerRequestNonce, hasValidSize]);

  useEffect(() => {
    if (!hasValidSize || !onFitZoomComputed) {
      return;
    }
    if (
      fitRequestNonce === 0 ||
      fitRequestNonce === lastFitRequestNonceRef.current
    ) {
      return;
    }
    lastFitRequestNonceRef.current = fitRequestNonce;

    const unitX = nodeWidth + horizontalGap;
    const unitY = nodeHeight + verticalGap;
    const treeW = (layout.maxX + 1) * unitX + horizontalGap;
    const treeH = (layout.maxDepth + 1) * unitY + verticalGap;

    if (treeW <= 0 || treeH <= 0) {
      return;
    }

    const fitScale = Math.min(hostSize.width / treeW, hostSize.height / treeH);
    if (!Number.isFinite(fitScale) || fitScale <= 0) {
      return;
    }

    const fitPercent = Math.round(fitScale * 100);
    const clampedFitPercent = Math.max(10, Math.min(300, fitPercent));
    onFitZoomComputed(snapZoomPercentToPreset(clampedFitPercent));
  }, [
    fitRequestNonce,
    hasValidSize,
    onFitZoomComputed,
    hostSize.width,
    hostSize.height,
    layout,
    nodeWidth,
    nodeHeight,
    horizontalGap,
    verticalGap,
  ]);

  const expressionIndex = useMemo(() => {
    return new ExpressionIndex(layout);
  }, [layout, version]);

  const highlightKey = buildHighlightKey(expressionIndex, highlightChanges);

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

    const prettyPrinter = new PrettyPrinter(2);
    return (v: unknown) => {
      try {
        return prettyPrinter.toString(v, true, {
          maxDepth: valueMaxDepth,
          maxChars: valueMaxChars,
          sortObjectKeys: true,
        });
      } catch {
        return String(v);
      }
    };
  }, [formatValue, valueMaxDepth, valueMaxChars]);

  const { zoomScale, paddedW, paddedH, scaledW, scaledH, nodePos } =
    useExpressionTreeViewport({
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
    nodes: layout.nodes,
    nodePos,
    edgeKey: (a, b) => {
      return expressionIndex.edgeKey(a, b);
    },
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
    <div
      ref={hostRef}
      className={`exprTreeRoot ${className ?? ''}`}
      style={style}
    >
      {!hasValidSize ? null : (
        <div className="exprTreeViewport" ref={viewportRef}>
          <div
            className="exprTreeSpacer"
            style={{ width: scaledW, height: scaledH }}
          >
            <div
              className="exprTreeZoomLayer"
              style={{
                width: paddedW,
                height: paddedH,
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="exprTreeCanvas"
                style={{ width: paddedW, height: paddedH }}
              >
                <svg
                  className="exprTreeLines"
                  width={paddedW}
                  height={paddedH}
                  viewBox={`0 0 ${paddedW} ${paddedH}`}
                >
                  {edgePaths.map((p) => {
                    return <path key={p.key} d={p.d} className={p.className} />;
                  })}
                </svg>

                {nodeViewModels.map((vm) => {
                  const asyncClass = vm.isAsync ? ' exprNode--async' : '';

                  return (
                    <div
                      key={vm.id}
                      className={`${vm.className}${asyncClass}`}
                      style={vm.style}
                    >
                      <div className="exprNodeHeader">
                        <div className="exprNodeDot" />
                        <div className="exprNodeHeaderText">
                          <div className="exprNodeTitleRow">
                            <div
                              className="exprNodeTitle"
                              title={vm.expressionText}
                            >
                              {vm.expressionText}
                            </div>

                            <div className="exprNodeTitleRowRight">
                              {vm.isAsync ? <AsyncBadge /> : null}

                              <div className="exprNodeType" title={vm.typeText}>
                                {vm.typeText}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="exprNodeBody">
                        {vm.hasValue ? (
                          <pre className="exprNodePre">{vm.valueText}</pre>
                        ) : (
                          null
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
