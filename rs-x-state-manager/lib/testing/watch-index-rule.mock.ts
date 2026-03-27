import {
  type IIndexWatchRule,
  type ShouldWatchIndexPredicate,
} from '../index-watch-rule';

export class IndexWatchRuleMock implements IIndexWatchRule {
  public context: unknown;
  public id!: string;
  public readonly test = jest.fn();
  public readonly dispose = jest.fn();

  constructor(predicate?: ShouldWatchIndexPredicate) {
    if (predicate) {
      this.test.mockImplementation(predicate);
    }
  }
}
