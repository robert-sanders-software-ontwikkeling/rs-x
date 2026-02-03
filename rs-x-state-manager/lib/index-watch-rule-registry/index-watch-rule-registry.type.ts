import type { IIndexWatchRule } from './index-watch-rule.interface';

export type ShouldWatchIndexPredicate = (
  context: unknown,
  index: unknown,
  target: unknown,
) => boolean;

export interface IIndexWatchRuleRegistry {
  register(
    context: unknown,
    index: unknown,
    predicate: ShouldWatchIndexPredicate,
  ): IIndexWatchRule;
  unregister(
    context: unknown,
    index: unknown,
    predicate: ShouldWatchIndexPredicate,
  ): void;
  get(
    context: unknown,
    index: unknown,
    predicate: ShouldWatchIndexPredicate,
  ): IIndexWatchRule | undefined;
  replaceContext(oldContext: unknown, newContext: unknown): void;
}
