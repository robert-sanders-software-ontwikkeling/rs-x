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
    maxEntries?: number;
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

function safeInline(value: unknown): string {
    if (value === undefined) {
        return 'undefined';
    }

    if (value === null) {
        return 'null';
    }

    if (typeof value === 'string') {
        const v = value.length > 60 ? `${value.slice(0, 60)}…` : value;
        return `'${v}'`;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }

    if (typeof value === 'function') {
        return '[Function]';
    }

    if (typeof value === 'symbol') {
        return String(value);
    }

    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return `[Array(${value.length})]`;
        }
        return '{…}';
    }

    return String(value);
}

export const ExpressionChangeHistoryView: React.FC<IExpressionChangeHistoryViewProps> = ( {modelIndex, expressionIndex, expressionInfo, change }) => {
  

    const [batches, setBatches] = useState<readonly HistoryBatch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    const trackerRef = useRef<ExpressionChangeTracker | null>(null);
    const subscriptionRef = useRef<Subscription | null>(null);

    const expression = expressionInfo?.expression;
    const version = expressionInfo?.version ?? 0;

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
            setBatches(() => {
                return [];
            });
            setSelectedBatchId(() => {
                return null;
            });
            return;
        }

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

        setSelectedBatchId(() => {
            return hydrated[0]?.id ?? null;
        });

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
                    change(modelIndex, expressionIndex, nextHistory);
                });

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
    }, [version,  change, expressionInfo]);

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
            <div className='changeHistoryLayout'>
                <div className='changeHistoryList'>
                    <div className='changeHistoryListHeader'>
                        <div className='changeHistoryListTitle'>Change sets</div>
                        <div className='changeHistoryListMeta'>{batches.length}</div>
                    </div>

                    <div className='changeHistoryListScroll'>
                        {batches.map((b, idx) => {
                            const isActive = b.id === selectedBatchId;
                            const title = `Change #${batches.length - idx}`;

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
                                    <div className='changeHistoryItemTop'>
                                        <div className='changeHistoryItemTitle'>{title}</div>
                                        <div className='changeHistoryItemBadge'>{b.items.length}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className='changeHistoryDetail'>
                    {selectedBatch ? (
                        <div className='changeHistoryDetailInner'>
                            <div className='changeHistoryDetailHeader'>
                                <div className='changeHistoryDetailTitle'>
                                    Change path · {selectedBatch.items.length} step{selectedBatch.items.length === 1 ? '' : 's'}
                                </div>

                                <div className='changeHistoryDetailSub'>
                                    Expression: <span className='changeHistoryMono'>{expressionInfo.name}</span>
                                </div>
                            </div>

                            <div className='changeHistoryChanges'>
                                <div className='changePath'>
                                    {selectedBatch.items.map((c, i) => {
                                        const exprStr = c.expression.expressionString;
                                        const oldInline = safeInline(c.oldValue);
                                        const newInline = safeInline(c.value);
                                        const isTrigger = i === 0;

                                        return (
                                            <div key={`${selectedBatch.id}_${i}`} className='changeStep'>
                                                <div className='changeStepRail'>
                                                    <div className={`changeStepDot ${isTrigger ? 'isTrigger' : ''}`} />
                                                    {i < selectedBatch.items.length - 1 && <div className='changeStepLine' />}
                                                </div>

                                                <div className='changeStepCard'>
                                                    <div className='changeStepHeader'>
                                                        <div className='changeStepHeaderLeft'>
                                                            <div className='changeStepExpr' title={exprStr}>
                                                                {exprStr}
                                                            </div>

                                                            {isTrigger ? (
                                                                <div className='changeStepTag'>trigger</div>
                                                            ) : (
                                                                <div className='changeStepTag derived'>derived</div>
                                                            )}
                                                        </div>

                                                        <div className='changeStepHeaderRight' title={`${oldInline} -> ${newInline}`}>
                                                            <span className='changeStepOld'>{oldInline}</span>
                                                            <span className='changeStepArrow'>→</span>
                                                            <span className='changeStepNew'>{newInline}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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