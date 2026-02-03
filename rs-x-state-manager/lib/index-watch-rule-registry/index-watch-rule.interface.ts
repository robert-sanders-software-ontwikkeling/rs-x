export type ShouldWatchIndexPredicate = (
  context: unknown,
  index: unknown,
  target: unknown,
) => boolean;

export interface IIndexWatchRule {
  context: unknown;
  test(index: unknown, target: unknown): boolean;
}
