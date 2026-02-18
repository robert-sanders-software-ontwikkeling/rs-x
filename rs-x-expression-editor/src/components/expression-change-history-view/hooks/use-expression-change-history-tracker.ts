import { IExpression, IExpressionChangeHistory, IExpressionChangeTracker } from '@rs-x/expression-parser';
import { useEffect, useRef } from 'react';

import { Subscription } from 'rxjs';
import { IExpressionInfo } from '../../../models/model-with-expressions.interface';
import { ExpressionChangeTrackerFactory } from '../../../services/expression-change-tracker.factory';


function defer(fn: () => void): void {
    queueMicrotask(() => {fn()});
}

function useLatestRef<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

export function useExpressionChangeHistoryTracker(args: {
    expressionInfo: IExpressionInfo | null | undefined;
    expression: IExpression | null | undefined;
    version: number | string;
    modelIndex: number;
    expressionIndex: number;
    onHistoryChange: (
        modelIndex: number,
        expressionIndex: number,
        nextHistory: IExpressionChangeHistory[][]
    ) => void;
    onSelectionChanged: (
        modelIndex: number,
        expressionIndex: number,
        newestPersistedIndex: number,
        stack: IExpressionChangeHistory[]
    ) => void;
}) {
    const {
        expressionInfo,
        expression,
        version,
        modelIndex,
        expressionIndex,
        onHistoryChange,
        onSelectionChanged
    } = args;

    const subscriptionRef = useRef<Subscription | null>(null);
    const trackerRef = useRef<IExpressionChangeTracker | null>(null);

    const expressionInfoRef = useLatestRef(expressionInfo);
    const onHistoryChangeRef = useLatestRef(onHistoryChange);
    const onSelectionChangedRef = useLatestRef(onSelectionChanged);

    useEffect(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
        if (trackerRef.current) {
            trackerRef.current.dispose();
            trackerRef.current = null;
        }

        if (!expression) {
            return;
        }

        // Optional: if you want to NOT track when expressionInfo is missing
        // (but also not resubscribe when it appears), keep it as a runtime check in the callback.
        // If you want to require it to exist before creating the tracker, you can gate here,
        // but then the effect would need expressionInfo in deps to start tracking later.
        const tracker = ExpressionChangeTrackerFactory.create(expression);
        trackerRef.current = tracker;

        const sub = tracker.changed.subscribe((stack) => {
            const info = expressionInfoRef.current;
            if (!info) {
                return;
            }

            const nextHistory: IExpressionChangeHistory[][] = [
                ...(info.changeHistory ?? []),
                stack
            ];

            defer(() => {
                onHistoryChangeRef.current(modelIndex, expressionIndex, nextHistory);

                const newestPersistedIndex = Math.max(0, nextHistory.length - 1);
                onSelectionChangedRef.current(
                    modelIndex,
                    expressionIndex,
                    newestPersistedIndex,
                    stack
                );
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
    }, [expression, version, modelIndex, expressionIndex]);

    return {
        trackerRef,
        subscriptionRef
    };
}