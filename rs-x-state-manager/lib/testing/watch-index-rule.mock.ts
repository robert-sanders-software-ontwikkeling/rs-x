import type { ShouldWatchIndexPredicate } from '../index-watch-rule-registry';
import type { IIndexWatchRule } from '../index-watch-rule-registry/index-watch-rule.interface';

export class IndexWatchRuleMock implements IIndexWatchRule {
  public context: unknown;
  public readonly test = jest.fn();
  public readonly dispose = jest.fn();

  constructor(predicate?: ShouldWatchIndexPredicate) {
    if (predicate) {
      this.test.mockImplementation(predicate);
    }
  }
}
