import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionChangeTracker,
  type IExpressionChangeTrackerManager,
  type IExpressionTree,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

export class ExpressionChangeTrackerFactory {
  private static _expressionChangeTrackerManager: IExpressionChangeTrackerManager;

  private constructor() {}

  public static create(expression: IExpressionTree): IExpressionChangeTracker {
    if (!this._expressionChangeTrackerManager) {
      this._expressionChangeTrackerManager = InjectionContainer.get(
        RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager,
      );
    }
    return this._expressionChangeTrackerManager.create(expression).instance;
  }
}
