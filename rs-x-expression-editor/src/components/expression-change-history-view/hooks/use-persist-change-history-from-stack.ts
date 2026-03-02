import { useEffect, useRef } from 'react';

import type { IExpressionChangeHistory } from '@rs-x/expression-parser';

function defer(fn: () => void): void {
    queueMicrotask(() => {
        fn();
    });
}

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

function stackKey(stack: readonly IExpressionChangeHistory[], expressionItemKey: (x: IExpressionChangeHistory) => string): string {
    return stack.map((x) => expressionItemKey(x)).join('|');
}

function expressionItemKey(item: IExpressionChangeHistory): string {
    const expression = item.expression;
    return `${expression.expressionString}::${String(expression.type)}::${String(item.oldValue)}=>${String(item.value)}`;
}

function lastPersistedStackKey(
    changeHistory: IExpressionChangeHistory[][],
): string | null {
    if (!changeHistory || changeHistory.length === 0) {
        return null;
    }
    const last = changeHistory[changeHistory.length - 1];
    if (!last || last.length === 0) {
        return null;
    }
    return stackKey(last, expressionItemKey);
}

export function usePersistChangeHistoryFromStack(args: {
    // source
    latestStack: IExpressionChangeHistory[] | null;
    latestStackKey: string | null;

    // current persisted history
    changeHistory: IExpressionChangeHistory[][];

    // identity for callbacks
    modelIndex: number;
    expressionIndex: number;

    // callbacks
    onHistoryChange: (
        modelIndex: number,
        expressionIndex: number,
        nextHistory: IExpressionChangeHistory[][],
    ) => void;

    onSelectionChanged: (
        modelIndex: number,
        expressionIndex: number,
        newestPersistedIndex: number,
        stack: IExpressionChangeHistory[],
        replay: boolean,
    ) => void;
}): void {
    const {
        latestStack,
        latestStackKey,
        changeHistory,
        modelIndex,
        expressionIndex,
        onHistoryChange,
        onSelectionChanged,
    } = args;

    const changeHistoryRef = useLatestRef(changeHistory);
    const onHistoryChangeRef = useLatestRef(onHistoryChange);
    const onSelectionChangedRef = useLatestRef(onSelectionChanged);
    const modelIndexRef = useLatestRef(modelIndex);
    const expressionIndexRef = useLatestRef(expressionIndex);

    // prevent duplicates across emissions
    const lastEmittedStackKeyRef = useRef<string | null>(null);

    // capture persisted last key at first emission after mount/expression switch
    const persistedLastKeyAtMountRef = useRef<string | null>(null);

    useEffect(() => {
        // reset “baseline” when history identity changes dramatically (usually expression switch)
        // you can also reset this from the caller when expression changes.
        persistedLastKeyAtMountRef.current = lastPersistedStackKey(changeHistoryRef.current);
        lastEmittedStackKeyRef.current = null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // keep simple; caller can remount this hook per expression if desired

    useEffect(() => {
        if (!latestStack || !latestStackKey) {
            return;
        }

        const historyNow = changeHistoryRef.current;
        const persistedLastKeyNow = lastPersistedStackKey(historyNow);

        const alreadyEmitted = lastEmittedStackKeyRef.current === latestStackKey;
        const equalsPersistedLast =
            persistedLastKeyNow === latestStackKey ||
            persistedLastKeyAtMountRef.current === latestStackKey;

        if (alreadyEmitted || equalsPersistedLast) {
            lastEmittedStackKeyRef.current = latestStackKey;
            return;
        }

        lastEmittedStackKeyRef.current = latestStackKey;

        const nextHistory: IExpressionChangeHistory[][] = [...historyNow, latestStack];

        defer(() => {
            onHistoryChangeRef.current(
                modelIndexRef.current,
                expressionIndexRef.current,
                nextHistory,
            );

            const newestPersistedIndex = Math.max(0, nextHistory.length - 1);
            onSelectionChangedRef.current(
                modelIndexRef.current,
                expressionIndexRef.current,
                newestPersistedIndex,
                latestStack,
                false,
            );
        });
    }, [latestStack, latestStackKey, changeHistoryRef, onHistoryChangeRef, onSelectionChangedRef, modelIndexRef, expressionIndexRef]);
}