import type {
  IExpressionChangeHistory,
  IExpressionTree,
} from '@rs-x/expression-parser';

import { useExpressionChangeTrackerSubscription } from './use-expression-change-tracker-subscription';
import { usePersistChangeHistoryFromStack } from './use-persist-change-history-from-stack';

export function useExpressionChangeHistoryTracker(args: {
  changeHistory: IExpressionChangeHistory[][];
  expression: IExpressionTree | null | undefined;
  version: number | string;
  modelIndex: number;
  expressionIndex: number;

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
}) {
  const {
    changeHistory,
    expression,
    modelIndex,
    expressionIndex,
    onHistoryChange,
    onSelectionChanged,
  } = args;

  const { tracker, latestStack, latestStackKey } =
    useExpressionChangeTrackerSubscription({ expression });

  usePersistChangeHistoryFromStack({
    latestStack,
    latestStackKey,
    changeHistory,
    modelIndex,
    expressionIndex,
    onHistoryChange,
    onSelectionChanged,
  });

  return { tracker };
}
