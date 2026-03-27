import { type IIndexWatchRule } from './index-watch-rule.interface';

export interface IIndexWatchRuleFactory {
  create(context: unknown, index: unknown): IIndexWatchRule;
}
