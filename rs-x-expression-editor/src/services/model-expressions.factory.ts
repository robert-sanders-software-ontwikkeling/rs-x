import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionManager,
  type IExpressionTree,
  RsXExpressionParserInjectionTokens,
} from '@rs-x/expression-parser';

export interface IExpressionTreeFactoryResult {
  expression: IExpressionTree | undefined;
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
  ): IExpressionTreeFactoryResult[] {
    const result: IExpressionTreeFactoryResult[] = [];

    return expressionStrings.map((expressionString) => {
      let error = '';
      let expression: IExpressionTree | undefined = undefined;

      try {
        expression = this._expressionManager
          .create(model)
          .instance.create({ expressionString }).instance as IExpressionTree;
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
