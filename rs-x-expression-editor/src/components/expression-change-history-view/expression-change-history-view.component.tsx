// expression-change-history-view.component.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import type { Subscription } from 'rxjs';

import { type IExpressionChangeHistory, IExpressionChangeTracker } from '@rs-x/expression-parser';

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

    const selectedBatch = useMemo((): HistoryBatch | null => {
        if (clampedSelectedPersistedIndex < 0) {
            return null;
        }
        const items = persistedHistory[clampedSelectedPersistedIndex] ?? [];
        return { persistedIndex: clampedSelectedPersistedIndex, items };
    }, [clampedSelectedPersistedIndex, persistedHistory]);

 
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
        }
    });

    useExpressionChangeHistoryTracker({
        expressionInfo,
        expression,
        version,
        modelIndex,
        expressionIndex,
        onHistoryChange,
        onSelectionChanged
    });


    const onUserSelectPersistedIndex = (persistedIndex: number, items: readonly IExpressionChangeHistory[]) => {
        onSelectionChanged(modelIndex, expressionIndex, persistedIndex, items);
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

    const selectedStepsCount = selectedBatch?.items.length ?? 0;

    return (
        <div className='changeHistoryRoot'>
            {/* Flat list */}
            <div className='changeHistoryFlatList'>
                <div className='changeHistoryFlatScroll'>
                    {batches.map((batch) => {
                        const isActive = batch.persistedIndex === clampedSelectedPersistedIndex;

                        const firstChange = batch.items[0];
                        const expressionString = firstChange?.expression?.expressionString ?? '(unknown)';

                        const headerOld = firstChange ? shortValue(firstChange.oldValue) : '';
                        const headerNew = firstChange ? shortValue(firstChange.value) : '';
                        const stepsCount = batch.items.length;

                        return (
                            <button
                                key={batch.persistedIndex}
                                type='button'
                                className={`changeHistoryFlatItem ${isActive ? 'isActive' : ''}`}
                                onClick={() => {
                                    onUserSelectPersistedIndex(batch.persistedIndex, batch.items);
                                }}
                                title={expressionString}
                            >
                                <div className='changeHistoryFlatLeft'>
                                    <div className='changeHistoryFlatExpr'>{expressionString}</div>
                                </div>

                                <div className='changeHistoryFlatRight'>
                                    <span className='changeHistoryFlatOld'>{headerOld}</span>
                                    <span className='changeHistoryFlatArrow'>→</span>
                                    <span className='changeHistoryFlatNew'>{headerNew}</span>
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
                                const exprStr = changeItem.expression.expressionString;

                                return (
                                    <div key={`${selectedBatch.persistedIndex}_${index}`} className='changeStep'>
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
                        <div className='changeHistoryEmpty'>Select a change</div>
                    )}
                </div>
            </div>
        </div>
    );
};