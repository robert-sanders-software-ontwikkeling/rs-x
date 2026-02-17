// expression-change-history-view.component.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';

import {
  type IExpressionChangeHistory,
  ExpressionChangeTracker,
} from '@rs-x/expression-parser';

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
  id: string;
  items: readonly IExpressionChangeHistory[];
};

function createBatchId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

/**
 * persistedIndex: 0..n-1 (oldest -> newest)
 * uiIndex:        0..n-1 (newest -> oldest)
 */
function persistedIndexToUiIndex(persistedIndex: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  const clampedPersistedIndex = clampIndex(persistedIndex, length);
  return (length - 1) - clampedPersistedIndex;
}

function uiIndexToPersistedIndex(uiIndex: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  const clampedUiIndex = clampIndex(uiIndex, length);
  return (length - 1) - clampedUiIndex;
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

  // Stable refs for callbacks used in rx subscription
  const onHistoryChangeRef = useRef(onHistoryChange);
  const onSelectionChangedRef = useRef(onSelectionChanged);

  useEffect(() => {
    onHistoryChangeRef.current = onHistoryChange;
    onSelectionChangedRef.current = onSelectionChanged;
  }, [onHistoryChange, onSelectionChanged]);

  const expression = expressionInfo?.expression;
  const version = expressionInfo?.version ?? 0;

  // Avoid spamming selection events when we are only syncing from props
  const lastSyncedSelectionKeyRef = useRef<string>('');

  /**
   * HYDRATE + live tracking
   */
  useEffect(() => {
    // cleanup previous tracker/sub
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (trackerRef.current) {
      trackerRef.current.dispose();
      trackerRef.current = null;
    }

    // reset
    setBatches(() => {
      return [];
    });
    setSelectedBatchId(() => {
      return null;
    });

    if (!expressionInfo || !expression) {
      return;
    }

    const persistedHistory = expressionInfo.changeHistory ?? [];
    const length = persistedHistory.length;

    // hydrate UI list: newest -> oldest
    const hydrated: HistoryBatch[] = persistedHistory
      .slice()
      .reverse()
      .map((items, idx) => {
        return { id: createBatchId(`h${idx}`), items };
      });

    setBatches(() => {
      return hydrated;
    });

    // apply selection from props (sync)
    if (length > 0) {
      const uiIndex = persistedIndexToUiIndex(selectedChangeSetIndex, length);
      const selected = hydrated[uiIndex] ?? null;

      setSelectedBatchId(() => {
        return selected?.id ?? null;
      });

      // NOTE: Do NOT call onSelectionChanged here (prop sync)
      // Parent is source of truth for selection; calling back can create loops.
    }

    // live tracking
    const tracker = new ExpressionChangeTracker(expression);
    trackerRef.current = tracker;

    const sub = tracker.changed.subscribe((stack) => {
      const newBatch: HistoryBatch = { id: createBatchId('live'), items: stack };

      setBatches((prev) => {
        const nextBatches = [newBatch, ...prev];

        // UI order -> persisted order (oldest -> newest)
        const nextHistory: IExpressionChangeHistory[][] = nextBatches
          .slice()
          .reverse()
          .map((batch) => {
            return [...batch.items];
          });

        // Defer parent updates from rx subscription
        defer(() => {
          onHistoryChangeRef.current(modelIndex, expressionIndex, nextHistory);

          // auto-select newest after live change
          const newestPersistedIndex = Math.max(0, nextHistory.length - 1);

          // prevent immediate prop-sync loop spam by letting parent drive next render
          onSelectionChangedRef.current(modelIndex, expressionIndex, newestPersistedIndex, newBatch.items);
        });

        return nextBatches;
      });

      setSelectedBatchId(() => {
        return newBatch.id;
      });
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
  }, [
    expression,
    version,
    modelIndex,
    expressionIndex,
    expressionInfo,
    selectedChangeSetIndex,
  ]);

  /**
   * Prop-driven selection sync -> only set local selectedBatchId + highlight once,
   * but NEVER call parent selection event here.
   */
  useEffect(() => {
    if (!expressionInfo) {
      return;
    }

    const persistedHistory = expressionInfo.changeHistory ?? [];
    const length = persistedHistory.length;

    if (length <= 0) {
      setSelectedBatchId(() => {
        return null;
      });
      return;
    }

    const uiIndex = persistedIndexToUiIndex(selectedChangeSetIndex, length);
    const next = batches[uiIndex] ?? null;

    if (!next) {
      return;
    }

    const syncKey = `${modelIndex}:${expressionIndex}:${version}:${selectedChangeSetIndex}:${length}`;
    if (lastSyncedSelectionKeyRef.current === syncKey) {
      return;
    }
    lastSyncedSelectionKeyRef.current = syncKey;

    setSelectedBatchId((prev) => {
      if (prev === next.id) {
        return prev;
      }
      return next.id;
    });
  }, [
    batches,
    expressionInfo,
    modelIndex,
    expressionIndex,
    selectedChangeSetIndex,
    version,
  ]);

  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) {
      return null;
    }
    const found = batches.find((b) => {
      return b.id === selectedBatchId;
    });
    return found ?? null;
  }, [batches, selectedBatchId]);

  /**
   * User selection -> call parent immediately (safe)
   */
  const onUserSelectBatchById = (id: string) => {
    setSelectedBatchId(() => {
      return id;
    });

    if (!expressionInfo) {
      return;
    }

    const uiIndex = batches.findIndex((b) => {
      return b.id === id;
    });

    if (uiIndex < 0) {
      return;
    }

    const length = (expressionInfo.changeHistory ?? []).length;
    const persistedIndex = uiIndexToPersistedIndex(uiIndex, length);

    const batch = batches[uiIndex];
    if (!batch) {
      return;
    }

    onSelectionChanged(modelIndex, expressionIndex, persistedIndex, batch.items);
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

  return (
    <div className='changeHistoryRoot'>
      <div className='changeHistoryList'>
        <div className='changeHistoryListHeader'>
          <div className='changeHistoryListTitle'>Change sets</div>
          <div className='changeHistoryListMeta'>{batches.length}</div>
        </div>

        <div className='changeHistoryListScroll'>
          {batches.map((batch) => {
            const isActive = batch.id === selectedBatchId;
            const firstExpr = batch.items[0]?.expression?.expressionString ?? '(unknown)';

            return (
              <button
                key={batch.id}
                type='button'
                className={`changeHistoryItem ${isActive ? 'isActive' : ''}`}
                onClick={() => {
                  onUserSelectBatchById(batch.id);
                }}
                title={firstExpr}
              >
                <div className='changeHistoryItemTop'>
                  <div className='changeHistoryItemTitle'>{firstExpr}</div>
                  <div className='changeHistoryItemBadge'>{batch.items.length}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='changeHistoryDetail'>
        <div className='changeHistoryDetailHeader'>
          <div className='changeHistoryDetailTitle'>
            {selectedBatch
              ? `${selectedBatch.items.length} step${selectedBatch.items.length === 1 ? '' : 's'}`
              : 'Select a change set'}
          </div>
        </div>

        <div className='changeHistoryChanges'>
          {selectedBatch ? (
            <div className='changePath'>
              {selectedBatch.items.map((changeItem, index) => {
                const exprStr = changeItem.expression.expressionString;

                return (
                  <div key={`${selectedBatch.id}_${index}`} className='changeStep'>
                    <div className='changeStepRail'>
                      <div className={`changeStepDot ${index === 0 ? 'isTrigger' : ''}`} />
                      {index < selectedBatch.items.length - 1 ? <div className='changeStepLine' /> : null}
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
          ) : (
            <div className='changeHistoryEmpty'>Select a change set</div>
          )}
        </div>
      </div>
    </div>
  );
};

function shortValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'string') {
    const s = value as string;
    const v = s.length > 80 ? `${s.slice(0, 80)}…` : s;
    return `'${v}'`;
  }

  if (type === 'number' || type === 'boolean' || type === 'bigint') {
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