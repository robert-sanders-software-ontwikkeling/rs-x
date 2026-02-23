import { InjectionContainer } from '@rs-x/core';
import {
  type IExpression,
  type IExpressionManager,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

export interface IExpressionFactoryResult {
  expression: IExpression | undefined;
  expressionString: string;
  error: string;
}

export class ModelExpressionsFactory {
  private static _instance: ModelExpressionsFactory;
  private readonly _expressionManager: IExpressionManager;

  private constructor() {
    this._expressionManager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionManager,
    );
  }

  public static getInstance(): ModelExpressionsFactory {
    if (!this._instance) {
      this._instance = new ModelExpressionsFactory();
    }
    return this._instance;
  }

  public create(
    model: object,
    expressionStrings: string[],
  ): IExpressionFactoryResult[] {
    const result: IExpressionFactoryResult[] = [];

    return expressionStrings.map((expressionString) => {
      let error = '';
      let expression: IExpression | undefined = undefined;

      try {
        expression = this._expressionManager
          .create(model)
          .instance.create({ expressionString }).instance;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }

      return {
        expressionString,
        expression,
        error,
      };
    });

    return result;
  }
}
