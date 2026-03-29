import { InjectionContainer } from '@rs-x/core';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import { type IExpression } from './expressions/expression-parser.interface';
import { type IExpressionFactory } from './expression-factory';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

let cachedExpressionFactory: IExpressionFactory | undefined;

const getExpressionFactory = (): IExpressionFactory => {
  cachedExpressionFactory ??= InjectionContainer.get(
    RsXExpressionParserInjectionTokens.IExpressionFactory,
  ) as IExpressionFactory;
  return cachedExpressionFactory;
};

export function rsx<TReturn, TModel extends object = object>(
  expressionString: string,
): (
  model: TModel,
  leafIndexWatchRule?: IIndexWatchRule,
) => IExpression<TReturn> {
  const expressionFactory = getExpressionFactory();

  return (model: TModel, leafIndexWatchRule?: IIndexWatchRule) => {
    return expressionFactory.create(
      model,
      expressionString,
      leafIndexWatchRule,
    );
  };
}
