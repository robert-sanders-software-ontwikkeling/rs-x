import {
  type IExpression,
  type IExpressionChangeHistory,
  type IExpressionChangeTracker,
} from '@rs-x/expression-parser';
import { useEffect, useRef } from 'react';
import { Subscription } from 'rxjs';
import type { IExpressionInfo } from '../../../models/model-with-expressions.interface';
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

  /**
   * Kept for API compatibility / other logic, but MUST NOT drive tracker lifecycle.
   * Tracker should only be recreated when `expression` instance changes.
   */
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
    version, // eslint-disable-line @typescript-eslint/no-unused-vars
    modelIndex,
    expressionIndex,
    onHistoryChange,
    onSelectionChanged,
  } = args;

  const subscriptionRef = useRef<Subscription | null>(null);
  const trackerRef = useRef<IExpressionChangeTracker | null>(null);

  // ✅ which expression instance is currently tracked
  const trackedExpressionRef = useRef<IExpression | null>(null);

  // latest refs to avoid resubscribing on changing props
  const expressionInfoRef = useLatestRef(expressionInfo);
  const onHistoryChangeRef = useLatestRef(onHistoryChange);
  const onSelectionChangedRef = useLatestRef(onSelectionChanged);
  const modelIndexRef = useLatestRef(modelIndex);
  const expressionIndexRef = useLatestRef(expressionIndex);

  // prevent duplicates
  const lastEmittedStackKeyRef = useRef<string | null>(null);

  const disposeCurrent = (): void => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (trackerRef.current) {
      trackerRef.current.dispose();
      trackerRef.current = null;
    }
    trackedExpressionRef.current = null;
    lastEmittedStackKeyRef.current = null;
  };

  useEffect(() => {
    // expression removed => teardown
    if (!expression) {
      disposeCurrent();
      return;
    }

    // already tracking this instance => do nothing (no dispose)
    if (trackedExpressionRef.current === expression && trackerRef.current && subscriptionRef.current) {
      return;
    }

    // new expression instance => switch tracker
    disposeCurrent();

    const tracker = ExpressionChangeTrackerFactory.create(expression);
    trackerRef.current = tracker;
    trackedExpressionRef.current = expression;

    // When subscribing, tracker emits current state immediately:
    // treat it as replay if it equals the last persisted stack
    const persistedLastKeyAtSubscribe = lastPersistedStackKey(expressionInfoRef.current);

    subscriptionRef.current = tracker.changed.subscribe((stack) => {
      const info = expressionInfoRef.current;
      if (!info) {
        return;
      }

      const nextKey = stackKey(stack);
      const persistedLastKeyNow = lastPersistedStackKey(info);

      const alreadyEmitted = lastEmittedStackKeyRef.current === nextKey;
      const equalsPersistedLast =
        persistedLastKeyNow === nextKey || persistedLastKeyAtSubscribe === nextKey;

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

    return () => {
      // unmount / expression changes => teardown
      disposeCurrent();
    };
  }, [expression]); // ✅ ONLY expression drives lifecycle

  return { trackerRef, subscriptionRef };
}