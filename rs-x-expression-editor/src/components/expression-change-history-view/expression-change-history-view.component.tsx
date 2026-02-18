import React, { useEffect, useMemo, useRef } from 'react';

import { type IExpressionChangeHistory } from '@rs-x/expression-parser';
import type { IExpressionInfo } from '../../models/model-with-expressions.interface';
import './expression-change-history-view.component.css';
import { useExpressionChangeHistoryTracker } from './hooks/use-expression-change-history-tracker';
import { useReemitSelectionOnHistoryChange } from './hooks/use-reemit-selection-on-history-change';

export interface IExpressionChangeHistoryViewProps {
  modelIndex: number;
  expressionIndex: number;

  expressionInfo: IExpressionInfo | undefined;

  /** persisted history update (oldest -> newest) */
  onHistoryChange: (
    modelIndex: number,
    expressionIndex: number,
    changes: IExpressionChangeHistory[][]
  ) => void;

  /** persisted selection index (0..n-1, oldest -> newest). Use -1 for none. */
  selectedChangeSetIndex: number;

  /**
   * SINGLE event: selection changed.
   * selectedChangeSetIndex = 0..n-1 (oldest -> newest)
   * items = selected batch items (for tree highlighting)
   */
  onSelectionChanged: (
    modelIndex: number,
    expressionIndex: number,
    selectedChangeSetIndex: number,
    items: readonly IExpressionChangeHistory[]
  ) => void;
}

type HistoryBatch = {
  /** persisted index (0 oldest -> newest) */
  persistedIndex: number;
  items: readonly IExpressionChangeHistory[];
};

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= length) {
    return length - 1;
  }
  return index;
}

function shortValue(value: unknown): string {
  if (value === undefined) {
    return '_';
  }
  if (value === null) {
    return 'null';
  }

  const valueType = typeof value;

  if (valueType === 'string') {
    const stringValue = value as string;
    const clipped = stringValue.length > 80 ? `${stringValue.slice(0, 80)}…` : stringValue;
    return `'${clipped}'`;
  }

  if (valueType === 'number' || valueType === 'boolean' || valueType === 'bigint') {
    return String(value);
  }

  try {
    const json = JSON.stringify(value);
    if (!json) {
      return String(value);
    }
    return json.length > 80 ? `${json.slice(0, 80)}…` : json;
  } catch {
    return String(value);
  }
}

function exprKey(change: IExpressionChangeHistory): string {
  return `${change.expression.expressionString}::${String(change.expression.type)}`;
}

function pickHeaderChange(args: {
  batchItems: readonly IExpressionChangeHistory[];
  rootExpression: IExpressionInfo['expression'] | undefined;
}): IExpressionChangeHistory | null {
  const { batchItems, rootExpression } = args;

  if (!batchItems.length) {
    return null;
  }

  if (rootExpression) {
    const rootKey = `${rootExpression.expressionString}::${String(rootExpression.type)}`;

    for (let i = batchItems.length - 1; i >= 0; i--) {
      const item = batchItems[i];
      if (exprKey(item) === rootKey) {
        return item;
      }
    }
  }

  return batchItems[batchItems.length - 1] ?? null;
}

export const ExpressionChangeHistoryView: React.FC<IExpressionChangeHistoryViewProps> = (props) => {
  const {
    modelIndex,
    expressionIndex,
    expressionInfo,
    onHistoryChange,
    selectedChangeSetIndex,
    onSelectionChanged,
  } = props;

  const onHistoryChangeRef = useRef(onHistoryChange);
  const onSelectionChangedRef = useRef(onSelectionChanged);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
    onSelectionChangedRef.current = onSelectionChanged;
  }, [onHistoryChange, onSelectionChanged]);

  const expression = expressionInfo?.expression;
  const version = expressionInfo?.version ?? 0;

  const persistedHistory: IExpressionChangeHistory[][] = expressionInfo?.changeHistory ?? [];
  const historyLength = persistedHistory.length;

  // UI list: newest -> oldest, but each has persistedIndex
  const batches = useMemo((): HistoryBatch[] => {
    const out: HistoryBatch[] = [];
    for (let persistedIndex = persistedHistory.length - 1; persistedIndex >= 0; persistedIndex--) {
      out.push({
        persistedIndex,
        items: persistedHistory[persistedIndex] ?? [],
      });
    }
    return out;
  }, [persistedHistory, historyLength, version]);

  const clampedSelectedPersistedIndex =
    historyLength <= 0 || selectedChangeSetIndex < 0
      ? -1
      : clampIndex(selectedChangeSetIndex, historyLength);

  // Auto-expand rule:
  // - if user selected something -> expand that
  // - otherwise expand the newest (top item in UI)
  const defaultExpandedPersistedIndex =
    historyLength > 0 ? historyLength - 1 : -1;

  const expandedPersistedIndex =
    clampedSelectedPersistedIndex >= 0
      ? clampedSelectedPersistedIndex
      : defaultExpandedPersistedIndex;

  useReemitSelectionOnHistoryChange({
    expressionInfo,
    modelIndex,
    expressionIndex,
    version,
    historyLength,
    clampedSelectedPersistedIndex,
    persistedHistory,
    onSelectionChanged: (m, e, idx, items) => {
      onSelectionChangedRef.current(m, e, idx, items);
    },
  });

  useExpressionChangeHistoryTracker({
    expressionInfo,
    expression,
    version,
    modelIndex,
    expressionIndex,
    onHistoryChange,
    onSelectionChanged,
  });

  const onUserSelectPersistedIndex = (persistedIndex: number, items: readonly IExpressionChangeHistory[]) => {
    // ✅ no toggle behavior: selecting same item keeps it expanded
    onSelectionChangedRef.current(modelIndex, expressionIndex, persistedIndex, items);
  };

  if (!expressionInfo) {
    return (
      <div className='changeHistoryRoot'>
        <div className='changeHistoryEmpty'>No expression selected</div>
      </div>
    );
  }

  if (historyLength === 0) {
    return (
      <div className='changeHistoryRoot'>
        <div className='changeHistoryEmpty'>No changes yet</div>
      </div>
    );
  }

  return (
    <div className='changeHistoryRoot'>
      <div className='changeHistoryAccordion'>
        <div className='changeHistoryAccordionScroll'>
          {batches.map((batch, uiIndex) => {
            const isActive = batch.persistedIndex === clampedSelectedPersistedIndex;
            const isExpanded = batch.persistedIndex === expandedPersistedIndex;

            // “first change set” = newest = top item in UI
            const isFirstChangeSet = uiIndex === 0;

            const headerChange = pickHeaderChange({
              batchItems: batch.items,
              rootExpression: expressionInfo.expression,
            });

            // Label: tN (newest at top)
            const tLabel = `t${historyLength - 1 - batch.persistedIndex}`;

            const headerExpr =
              headerChange?.expression?.expressionString ??
              expressionInfo.expression?.expressionString ??
              '(unknown)';

            const headerOld = headerChange ? shortValue(headerChange.oldValue) : '_';
            const headerNew = headerChange ? shortValue(headerChange.value) : '_';

            const stepsCount = batch.items.length;

            return (
              <div
                key={batch.persistedIndex}
                className={`changeSet ${isActive ? 'isActive' : ''} ${isExpanded ? 'isExpanded' : ''}`}
              >
                <button
                  type='button'
                  className='changeSetHeader'
                  onClick={() => {
                    // ✅ no collapse toggle:
                    // selecting same again is fine (keeps expanded)
                    onUserSelectPersistedIndex(batch.persistedIndex, batch.items);
                  }}
                  title={headerExpr}
                >
                  <div className='changeSetHeaderLeft'>
                    <span className='changeSetBadge'>{tLabel}</span>
                    <div className='changeSetHeaderMeta'>
                      <div className='changeSetExpr'>{headerExpr}</div>
                      <div className='changeSetSteps'>{stepsCount} step{stepsCount === 1 ? '' : 's'}</div>
                    </div>
                  </div>

                  <div className='changeSetHeaderRight'>
                    <span className='changeSetOld'>{headerOld}</span>
                    <span className='changeSetArrow'>→</span>
                    <span className='changeSetNew'>{headerNew}</span>

                    {/* Chevron is just an indicator, not a toggle */}
                    <span
                      className={`changeSetChevron ${isExpanded ? 'isOpen' : ''} ${isFirstChangeSet ? 'isPinned' : ''}`}
                      title={isFirstChangeSet ? 'Newest change set (always auto-expanded)' : undefined}
                    >
                      ▾
                    </span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className='changeSetBody'>
                    <div className='changePath'>
                      {batch.items.map((changeItem, index) => {
                        const exprStr = changeItem.expression.expressionString;

                        return (
                          <div key={`${batch.persistedIndex}_${index}`} className='changeStep'>
                            <div className='changeStepRail'>
                              <div className={`changeStepDot ${index === 0 ? 'isTrigger' : ''}`} />
                              {index < batch.items.length - 1 ? <div className='changeStepLine' /> : null}
                            </div>

                            <div className='changeStepCard'>
                              <div className='changeStepHeader'>
                                <div className='changeStepHeaderLeft'>
                                  <div className='changeStepExpr' title={exprStr}>
                                    {exprStr}
                                  </div>
                                  <div className={`changeStepTag ${index === 0 ? '' : 'derived'}`}>
                                    {index === 0 ? 'trigger' : 'derived'}
                                  </div>
                                </div>

                                <div className='changeStepHeaderRight'>
                                  <span className='changeStepOld'>{shortValue(changeItem.oldValue)}</span>
                                  <span className='changeStepArrow'>→</span>
                                  <span className='changeStepNew'>{shortValue(changeItem.value)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};