'use client';

import { useEffect, useRef, useState } from 'react';
import { type Subscription } from 'rxjs';

import type {
  IExpression,
  IExpressionChangeHistory,
  IExpressionChangeTracker,
} from '@rs-x/expression-parser';

import { ExpressionChangeTrackerFactory } from '../../../services/expression-change-tracker.factory';

function expressionItemKey(item: IExpressionChangeHistory): string {
  const expression = item.expression;
  return `${expression.expressionString}::${String(expression.type)}::${String(item.oldValue)}=>${String(item.value)}`;
}

export function stackKey(stack: readonly IExpressionChangeHistory[]): string {
  return stack.map((x) => expressionItemKey(x)).join('|');
}

export type TrackerSubscriptionResult = {
  tracker: IExpressionChangeTracker | null;
  latestStack: IExpressionChangeHistory[] | null;
  latestStackKey: string | null;
};

export function useExpressionChangeTrackerSubscription(args: {
  expression: IExpression | null | undefined;
}): TrackerSubscriptionResult {
  const { expression } = args;

  const subscriptionRef = useRef<Subscription | null>(null);
  const trackerRef = useRef<IExpressionChangeTracker | null>(null);
  const trackedExpressionRef = useRef<IExpression | null>(null);

  const [latestStack, setLatestStack] = useState<
    IExpressionChangeHistory[] | null
  >(null);
  const [latestStackKey, setLatestStackKey] = useState<string | null>(null);

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
    setLatestStack(null);
    setLatestStackKey(null);
  };

  useEffect(() => {
    if (!expression) {
      disposeCurrent();
      return;
    }

    if (
      trackedExpressionRef.current === expression &&
      trackerRef.current &&
      subscriptionRef.current
    ) {
      return;
    }

    disposeCurrent();

    const tracker = ExpressionChangeTrackerFactory.create(expression);
    trackerRef.current = tracker;
    trackedExpressionRef.current = expression;

    subscriptionRef.current = tracker.changed.subscribe((stack) => {
      const key = stackKey(stack);
      setLatestStack(stack);
      setLatestStackKey(key);
    });

    return () => {
      disposeCurrent();
    };
  }, [expression]);

  return {
    tracker: trackerRef.current,
    latestStack,
    latestStackKey,
  };
}
