// expression-change-history-view.component.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';

import { type IExpressionChangeHistory, ExpressionChangeTracker } from '@rs-x/expression-parser';

import type { IExpressionInfo } from '../../models/model-with-expressions.interface';
import './expression-change-history-view.component.css';

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

  /** persisted selection index (0..n-1, oldest -> newest) */
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
  /** stable id (based on persistedIndex) */
  id: string;
  /** persisted index (0 oldest -> newest) */
  persistedIndex: number;
  items: readonly IExpressionChangeHistory[];
};

function defer(fn: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      fn();
    });
    return;
  }

  Promise.resolve().then(() => {
    fn();
  });
}

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
    return 'undefined';
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

function buildBatches(persistedHistory: IExpressionChangeHistory[][]): HistoryBatch[] {
  const batches: HistoryBatch[] = [];

  // UI order: newest -> oldest, but persistedIndex remains 0..n-1 oldest -> newest.
  for (let persistedIndex = persistedHistory.length - 1; persistedIndex >= 0; persistedIndex--) {
    const items = persistedHistory[persistedIndex] ?? [];
    batches.push({
      id: `h_${persistedIndex}`,
      persistedIndex,
      items,
    });
  }

  return batches;
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

  const [batches, setBatches] = useState<readonly HistoryBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const trackerRef = useRef<ExpressionChangeTracker | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  const onHistoryChangeRef = useRef(onHistoryChange);
  const onSelectionChangedRef = useRef(onSelectionChanged);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
    onSelectionChangedRef.current = onSelectionChanged;
  }, [onHistoryChange, onSelectionChanged]);

  const expression = expressionInfo?.expression;
  const version = expressionInfo?.version ?? 0;

  /**
   * Hydrate batches when persisted history changes (or expression changes).
   * IMPORTANT: keep selection by mapping selectedChangeSetIndex -> stable id.
   */
  useEffect(() => {
    const persistedHistory = expressionInfo?.changeHistory ?? [];
    const length = persistedHistory.length;

    if (!expressionInfo || length === 0) {
      setBatches(() => {
        return [];
      });
      setSelectedBatchId(() => {
        return null;
      });
      return;
    }

    const nextBatches = buildBatches(persistedHistory);

    setBatches(() => {
      return nextBatches;
    });

    const clampedSelectedChangeSetIndex = clampIndex(selectedChangeSetIndex, length);
    const wantedId = `h_${clampedSelectedChangeSetIndex}`;

    setSelectedBatchId((previousSelectedBatchId) => {
      if (previousSelectedBatchId === wantedId) {
        return previousSelectedBatchId;
      }
      return wantedId;
    });
  }, [expressionInfo, selectedChangeSetIndex, version]);

  /**
   * Live tracking (ExpressionChangeTracker)
   * IMPORTANT: do NOT always auto-select newest.
   * Only auto-select newest if user was already at newest.
   */
  useEffect(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (trackerRef.current) {
      trackerRef.current.dispose();
      trackerRef.current = null;
    }

    if (!expressionInfo || !expression) {
      return;
    }

    const tracker = new ExpressionChangeTracker(expression);
    trackerRef.current = tracker;

    const sub = tracker.changed.subscribe((stack) => {
      const persistedHistoryBeforeAppend = expressionInfo.changeHistory ?? [];
      const lengthBeforeAppend = persistedHistoryBeforeAppend.length;

      const clampedSelectedIndexBeforeAppend =
        lengthBeforeAppend > 0 ? clampIndex(selectedChangeSetIndex, lengthBeforeAppend) : -1;

      const wasAtNewestBeforeAppend =
        lengthBeforeAppend > 0 && clampedSelectedIndexBeforeAppend === lengthBeforeAppend - 1;

      // Build next persisted history: append new stack at end (oldest -> newest)
      const nextHistory: IExpressionChangeHistory[][] = [
        ...persistedHistoryBeforeAppend.map((batch) => {
          return [...batch];
        }),
        [...stack],
      ];

      // Update UI batches immediately from next history (newest -> oldest)
      const nextBatches = buildBatches(nextHistory);

      setBatches(() => {
        return nextBatches;
      });

      // Persist up to parent
      defer(() => {
        onHistoryChangeRef.current(modelIndex, expressionIndex, nextHistory);
      });

      // Keep selection unless user was at newest (then follow newest)
      if (wasAtNewestBeforeAppend) {
        const newestPersistedIndex = nextHistory.length - 1;
        const newestId = `h_${newestPersistedIndex}`;

        setSelectedBatchId(() => {
          return newestId;
        });

        defer(() => {
          onSelectionChangedRef.current(modelIndex, expressionIndex, newestPersistedIndex, stack);
        });
      }
    });

    subscriptionRef.current = sub;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (trackerRef.current) {
        trackerRef.current.dispose();
        trackerRef.current = null;
      }
    };
  }, [expression, expressionInfo, modelIndex, expressionIndex, selectedChangeSetIndex, version]);

  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) {
      return null;
    }

    const found = batches.find((batch) => {
      return batch.id === selectedBatchId;
    });

    return found ?? null;
  }, [batches, selectedBatchId]);

  const onUserSelectBatchById = (id: string) => {
    setSelectedBatchId(() => {
      return id;
    });

    const found = batches.find((batch) => {
      return batch.id === id;
    });

    if (!found) {
      return;
    }

    trackerRef.current?.skip(1);
    onSelectionChanged(modelIndex, expressionIndex, found.persistedIndex, found.items);
  };

  if (!expressionInfo) {
    return (
      <div className='changeHistoryRoot'>
        <div className='changeHistoryEmpty'>No expression selected</div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className='changeHistoryRoot'>
        <div className='changeHistoryEmpty'>No changes yet</div>
      </div>
    );
  }

  const selectedStepsCount = selectedBatch?.items.length ?? 0;

  return (
    <div className='changeHistoryRoot'>
      {/* Flat list */}
      <div className='changeHistoryFlatList'>
        <div className='changeHistoryFlatScroll'>
          {batches.map((batch) => {
            const isActive = batch.id === selectedBatchId;

            const firstChange = batch.items[0];
            const expressionString = firstChange?.expression?.expressionString ?? '(unknown)';

            const headerOldValue = firstChange ? shortValue(firstChange.oldValue) : '';
            const headerNewValue = firstChange ? shortValue(firstChange.value) : '';

            const stepsCount = batch.items.length;

            return (
              <button
                key={batch.id}
                type='button'
                className={`changeHistoryFlatItem ${isActive ? 'isActive' : ''}`}
                onClick={() => {
                  onUserSelectBatchById(batch.id);
                }}
                title={expressionString}
              >
                <div className='changeHistoryFlatLeft'>
                  <div className='changeHistoryFlatExpr'>{expressionString}</div>
                  {stepsCount > 1 ? <div className='changeHistoryFlatMeta'>{stepsCount}</div> : null}
                </div>

                <div className='changeHistoryFlatRight'>
                  <span className='changeHistoryFlatOld'>{headerOldValue}</span>
                  <span className='changeHistoryFlatArrow'>→</span>
                  <span className='changeHistoryFlatNew'>{headerNewValue}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='changeHistoryDivider' />

      {/* Timeline */}
      <div className='changeHistoryTimeline'>
        <div className='changeHistoryTimelineHeader'>
          <div className='changeHistoryTimelineTitle'>
            {selectedBatch ? `${selectedStepsCount} step${selectedStepsCount === 1 ? '' : 's'}` : 'Select a change'}
          </div>
        </div>

        <div className='changeHistoryTimelineBody'>
          {selectedBatch ? (
            <div className='changePath'>
              {selectedBatch.items.map((changeItem, index) => {
                const expressionString = changeItem.expression.expressionString;

                return (
                  <div key={`${selectedBatch.id}_${index}`} className='changeStep'>
                    <div className='changeStepRail'>
                      <div className={`changeStepDot ${index === 0 ? 'isTrigger' : ''}`} />
                      {index < selectedBatch.items.length - 1 ? <div className='changeStepLine' /> : null}
                    </div>

                    <div className='changeStepCard'>
                      <div className='changeStepHeader'>
                        <div className='changeStepHeaderLeft'>
                          <div className='changeStepExpr' title={expressionString}>
                            {expressionString}
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
          ) : (
            <div className='changeHistoryEmpty'>Select a change</div>
          )}
        </div>
      </div>
    </div>
  );
};