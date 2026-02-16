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

  change: (modelIndex: number, expressionIndex: number, changes: IExpressionChangeHistory[][]) => void;

  /** notify when user selects a batch, so tree can highlight it */
  onSelectBatch?: (changes: readonly IExpressionChangeHistory[]) => void;
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

export const ExpressionChangeHistoryView: React.FC<IExpressionChangeHistoryViewProps> = (props) => {
  const {
    modelIndex,
    expressionIndex,
    expressionInfo,
    change,
    onSelectBatch,
  } = props;

  const [batches, setBatches] = useState<readonly HistoryBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const trackerRef = useRef<ExpressionChangeTracker | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  // ✅ Store callbacks in refs so effect deps don't change every render
  const changeRef = useRef(change);
  const onSelectBatchRef = useRef(onSelectBatch);

  useEffect(() => {
    changeRef.current = change;
    onSelectBatchRef.current = onSelectBatch;
  }, [change, onSelectBatch]);

  const expression = expressionInfo?.expression;
  const version = expressionInfo?.version ?? 0;
  const persistedHistory = expressionInfo?.changeHistory;

  // ✅ Prevent repeated auto-select for the same "snapshot"
  const lastAutoSelectKeyRef = useRef<string>('');

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

    // reset UI
    setBatches(() => {
      return [];
    });
    setSelectedBatchId(() => {
      return null;
    });

    if (!expressionInfo || !expression) {
      return;
    }

    // hydrate from persisted history (newest first)
    const hydrated: HistoryBatch[] = (expressionInfo.changeHistory ?? [])
      .slice()
      .reverse()
      .map((items, idx) => {
        return {
          id: createBatchId(`h${idx}`),
          items,
        };
      });

    setBatches(() => {
      return hydrated;
    });

    const first = hydrated[0]?.id ?? null;
    setSelectedBatchId(() => {
      return first;
    });

    // ✅ Auto-select only once per snapshot key
    const snapshotKey = `${modelIndex}:${expressionIndex}:${version}:${(expressionInfo.changeHistory ?? []).length}`;
    if (first && hydrated[0]?.items?.length && lastAutoSelectKeyRef.current !== snapshotKey) {
      lastAutoSelectKeyRef.current = snapshotKey;

      defer(() => {
        onSelectBatchRef.current?.(hydrated[0].items);
      });
    }

    // live tracking
    const tracker = new ExpressionChangeTracker(expression);
    trackerRef.current = tracker;

    const sub = tracker.changed.subscribe((stack) => {
      const batch: HistoryBatch = { id: createBatchId('live'), items: stack };

      setBatches((prev) => {
        const next = [batch, ...prev];

        const nextHistory: IExpressionChangeHistory[][] = next.map((b) => {
          return [...b.items];
        });

        defer(() => {
          changeRef.current(modelIndex, expressionIndex, nextHistory);
        });

        return next;
      });

      setSelectedBatchId((prevSelected) => {
        if (prevSelected === null) {
          return batch.id;
        }
        return prevSelected;
      });

      defer(() => {
        onSelectBatchRef.current?.(batch.items);
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
    persistedHistory,
    modelIndex,
    expressionIndex,
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

  const onSelect = (id: string) => {
    setSelectedBatchId(() => {
      return id;
    });

    const found = batches.find((b) => {
      return b.id === id;
    });

    if (found) {
      defer(() => {
        onSelectBatchRef.current?.(found.items);
      });
    }
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
          {batches.map((b) => {
            const isActive = b.id === selectedBatchId;
            const firstExpr = b.items[0]?.expression?.expressionString ?? '(unknown)';

            return (
              <button
                key={b.id}
                type='button'
                className={`changeHistoryItem ${isActive ? 'isActive' : ''}`}
                onClick={() => {
                  onSelect(b.id);
                }}
                title={firstExpr}
              >
                <div className='changeHistoryItemTop'>
                  <div className='changeHistoryItemTitle'>{firstExpr}</div>
                  <div className='changeHistoryItemBadge'>{b.items.length}</div>
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
              {selectedBatch.items.map((c, i) => {
                const exprStr = c.expression.expressionString;

                return (
                  <div key={`${selectedBatch.id}_${i}`} className='changeStep'>
                    <div className='changeStepRail'>
                      <div className={`changeStepDot ${i === 0 ? 'isTrigger' : ''}`} />
                      {i < selectedBatch.items.length - 1 ? <div className='changeStepLine' /> : null}
                    </div>

                    <div className='changeStepCard'>
                      <div className='changeStepHeader'>
                        <div className='changeStepHeaderLeft'>
                          <div className='changeStepExpr' title={exprStr}>
                            {exprStr}
                          </div>
                          <div className={`changeStepTag ${i === 0 ? '' : 'derived'}`}>
                            {i === 0 ? 'trigger' : 'derived'}
                          </div>
                        </div>

                        <div className='changeStepHeaderRight'>
                          <span className='changeStepOld'>{shortValue(c.oldValue)}</span>
                          <span className='changeStepArrow'>→</span>
                          <span className='changeStepNew'>{shortValue(c.value)}</span>
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

  const t = typeof value;

  if (t === 'string') {
    const s = value as string;
    const v = s.length > 80 ? `${s.slice(0, 80)}…` : s;
    return `'${v}'`;
  }

  if (t === 'number' || t === 'boolean' || t === 'bigint') {
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