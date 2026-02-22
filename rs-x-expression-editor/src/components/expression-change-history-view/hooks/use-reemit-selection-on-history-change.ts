import { useEffect, useRef } from 'react';

import { IExpressionChangeHistory } from '@rs-x/expression-parser';
import { IExpressionInfo } from '../../../models/expression-info.interface';

function defer(fn: () => void): void {
    queueMicrotask(() => {fn()});
}

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

export function useReemitSelectionOnHistoryChange(args: {
    expressionInfo: IExpressionInfo | null | undefined;
    modelIndex: number;
    expressionIndex: number;
    version: number | string;
    historyLength: number;
    clampedSelectedPersistedIndex: number;
    persistedHistory: IExpressionChangeHistory[][];
    onSelectionChanged: (
        modelIndex: number,
        expressionIndex: number,
        selectedIndex: number,
        items: IExpressionChangeHistory[]
    ) => void;
}) {
    const {
        expressionInfo,
        modelIndex,
        expressionIndex,
        version,
        historyLength,
        clampedSelectedPersistedIndex,
        persistedHistory,
        onSelectionChanged
    } = args;

    const onSelectionChangedRef = useLatestRef(onSelectionChanged);
    const lastEmittedSelectionKeyRef = useRef<string>('');

    useEffect(() => {
        if (!expressionInfo) {
            return;
        }
        if (historyLength <= 0) {
            return;
        }
        if (clampedSelectedPersistedIndex < 0) {
            return;
        }

        const key = `${modelIndex}:${expressionIndex}:${version}:${historyLength}:${clampedSelectedPersistedIndex}`;
        if (lastEmittedSelectionKeyRef.current === key) {
            return;
        }
        lastEmittedSelectionKeyRef.current = key;

        const items = persistedHistory[clampedSelectedPersistedIndex] ?? [];

        defer(() => {
            onSelectionChangedRef.current(
                modelIndex,
                expressionIndex,
                clampedSelectedPersistedIndex,
                items
            );
        });
    }, [
        modelIndex,
        expressionIndex,
        version,
        historyLength,
        clampedSelectedPersistedIndex,
        expressionInfo,
        persistedHistory
    ]);
}