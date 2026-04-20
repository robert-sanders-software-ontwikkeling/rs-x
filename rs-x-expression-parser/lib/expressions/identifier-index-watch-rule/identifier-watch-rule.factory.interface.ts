import type { IIndexWatchRule } from '@rs-x/state-manager';

export interface IIdentifierWatchRuleData {
  index: unknown;
  indexWatchRule: IIndexWatchRule | undefined;
  isLeaf: boolean;
  isMemberExpressionSegment: boolean;
}

export interface IIdentifierWatchRuleFactory {
  create(context: unknown, data: IIdentifierWatchRuleData): IIndexWatchRule;
}
