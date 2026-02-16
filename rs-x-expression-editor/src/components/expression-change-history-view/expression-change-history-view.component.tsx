import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';

import {
  type IExpression,
  type IExpressionChangeHistory,
  ExpressionChangeTracker,
} from '@rs-x/expression-parser';

export interface IExpressionChangeHistoryViewProps {
  expression: IExpression | undefined;
  maxEntries?: number; // max batches shown
  className?: string;
}

type HistoryBatch = {
  id: string;
  items: readonly IExpressionChangeHistory[];
};

function createBatchId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const ExpressionChangeHistoryView: React.FC<IExpressionChangeHistoryViewProps> = (props) => {
  const { expression, maxEntries = 50, className } = props;

  const [batches, setBatches] = useState<readonly HistoryBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const trackerRef = useRef<ExpressionChangeTracker | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  useEffect(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (trackerRef.current) {
      trackerRef.current.dispose();
      trackerRef.current = null;
    }

    setBatches([]);
    setSelectedBatchId(null);

    if (!expression) {
      return;
    }

    const tracker = new ExpressionChangeTracker(expression);
    trackerRef.current = tracker;

    const sub = tracker.changed.subscribe((stack) => {
      const batch: HistoryBatch = { id: createBatchId(), items: stack };

      setBatches((prev) => {
        const next = [batch, ...prev];
        if (next.length > maxEntries) {
          return next.slice(0, maxEntries);
        }
        return next;
      });

      setSelectedBatchId((prevSelected) => {
        if (prevSelected === null) {
          return batch.id;
        }
        return prevSelected;
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
  }, [expression, maxEntries]);

  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) {
      return null;
    }
    const found = batches.find((b) => {
      return b.id === selectedBatchId;
    });
    return found ?? null;
  }, [batches, selectedBatchId]);

  const onSelectBatch = (id: string) => {
    setSelectedBatchId(() => {
      return id;
    });
  };

  if (!expression) {
    return (
      <div className={`changeHistoryRoot ${className ?? ''}`}>
        <div className='changeHistoryEmpty'>No expression selected</div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className={`changeHistoryRoot ${className ?? ''}`}>
        <div className='changeHistoryEmpty'>No changes yet</div>
      </div>
    );
  }

  return (
    <div className={`changeHistoryRoot ${className ?? ''}`}>
      <div className='changeHistoryLayout'>
        <div className='changeHistoryList'>
          {batches.map((b, idx) => {
            const isActive = b.id === selectedBatchId;
            const title = `#${batches.length - idx} · ${b.items.length} change${b.items.length === 1 ? '' : 's'}`;

            return (
              <button
                key={b.id}
                type='button'
                className={`changeHistoryItem ${isActive ? 'isActive' : ''}`}
                onClick={() => {
                  onSelectBatch(b.id);
                }}
                title={title}
              >
                <div className='changeHistoryItemTitle'>{title}</div>
                <div className='changeHistoryItemSub'>
                  {b.items[0]?.expression?.expressionString ?? '(unknown)'}
                </div>
              </button>
            );
          })}
        </div>

        <div className='changeHistoryDetail'>
          {selectedBatch ? (
            <div className='changeHistoryDetailInner'>
              <div className='changeHistoryDetailHeader'>
                <div className='changeHistoryDetailTitle'>
                  {selectedBatch.items.length} change{selectedBatch.items.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className='changeHistoryChanges'>
                {selectedBatch.items.map((c, i) => {
                  const exprStr = c.expression.expressionString;
                  const oldStr = safeStringify(c.oldValue);
                  const newStr = safeStringify(c.value);

                  return (
                    <div key={`${selectedBatch.id}_${i}`} className='changeHistoryChange'>
                      <div className='changeHistoryChangeExpr' title={exprStr}>
                        {exprStr}
                      </div>

                      <div className='changeHistoryChangeGrid'>
                        <div className='changeHistoryLabel'>old</div>
                        <pre className='changeHistoryPre'>{oldStr}</pre>

                        <div className='changeHistoryLabel'>new</div>
                        <pre className='changeHistoryPre'>{newStr}</pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className='changeHistoryEmpty'>Select a change set</div>
          )}
        </div>
      </div>
    </div>
  );
};

function safeStringify(value: unknown): string {
  try {
    if (value === undefined) {
      return 'undefined';
    }
    return JSON.stringify(value, null, 2) ?? 'null';
  } catch {
    return String(value);
  }
}