import { IExpression, IExpressionChangeHistory, IExpressionChangeTracker } from '@rs-x/expression-parser';
import { useEffect, useRef } from 'react';

import { Subscription } from 'rxjs';
import { IExpressionInfo } from '../../../models/model-with-expressions.interface';
import { ExpressionChangeTrackerFactory } from '../../../services/expression-change-tracker.factory';

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

function expressionItemKey(item: IExpressionChangeHistory): string {
  const expr = item.expression;
  return `${expr.expressionString}::${String(expr.type)}::${String(item.oldValue)}=>${String(item.value)}`;
}

function stackKey(stack: readonly IExpressionChangeHistory[]): string {
  // Order matters
  return stack.map((x) => expressionItemKey(x)).join('|');
}

function lastPersistedStackKey(info: IExpressionInfo | null | undefined): string | null {
  const history = info?.changeHistory;
  if (!history || history.length === 0) {
    return null;
  }
  const last = history[history.length - 1];
  if (!last || last.length === 0) {
    return null;
  }
  return stackKey(last);
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
    onSelectionChanged,
  } = args;

  const subscriptionRef = useRef<Subscription | null>(null);
  const trackerRef = useRef<IExpressionChangeTracker | null>(null);

  const expressionInfoRef = useLatestRef(expressionInfo);
  const onHistoryChangeRef = useLatestRef(onHistoryChange);
  const onSelectionChangedRef = useLatestRef(onSelectionChanged);
  const modelIndexRef = useLatestRef(modelIndex);
  const expressionIndexRef = useLatestRef(expressionIndex);

  // remembers what we already appended to prevent duplicates
  const lastEmittedStackKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // cleanup previous subscription/tracker
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (trackerRef.current) {
      trackerRef.current.dispose();
      trackerRef.current = null;
    }

    lastEmittedStackKeyRef.current = null;

    if (!expression) {
      return;
    }

    const tracker = ExpressionChangeTrackerFactory.create(expression);
    trackerRef.current = tracker;

    // When we (re)subscribe, `changed` emits current value immediately.
    // We consider it a "replay" if it matches the last persisted stack.
    const persistedLastKeyAtSubscribe = lastPersistedStackKey(expressionInfoRef.current);

    const sub = tracker.changed.subscribe((stack) => {
      const info = expressionInfoRef.current;
      if (!info) {
        return;
      }

      const nextKey = stackKey(stack);
      const persistedLastKeyNow = lastPersistedStackKey(info);

      // 1) Drop immediate replay that equals last persisted stack
      // 2) Drop duplicates if the tracker emits the same stack multiple times
      const alreadyEmitted = lastEmittedStackKeyRef.current === nextKey;
      const equalsPersistedLast = persistedLastKeyNow === nextKey || persistedLastKeyAtSubscribe === nextKey;

      if (alreadyEmitted || equalsPersistedLast) {
        lastEmittedStackKeyRef.current = nextKey;
        return;
      }

      lastEmittedStackKeyRef.current = nextKey;

      const prevHistory = info.changeHistory ?? [];
      const nextHistory: IExpressionChangeHistory[][] = [...prevHistory, stack];

      defer(() => {
        const mh = onHistoryChangeRef.current;
        if (typeof mh === 'function') {
          mh(modelIndexRef.current, expressionIndexRef.current, nextHistory);
        }

        const newestPersistedIndex = Math.max(0, nextHistory.length - 1);

        const sel = onSelectionChangedRef.current;
        if (typeof sel === 'function') {
          sel(modelIndexRef.current, expressionIndexRef.current, newestPersistedIndex, stack);
        }
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
  }, [expression, version]);

  return {
    trackerRef,
    subscriptionRef,
  };
}