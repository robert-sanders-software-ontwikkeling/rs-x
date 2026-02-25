import { InjectionContainer } from '@rs-x/core';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import { type IExpression } from './expressions/expression-parser.interface';
import { type IExpressionFactory } from './expression-factory';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

export function rsx<TReturn, TModel extends object = object>(
  args: TemplateStringsArray,
  ...values: readonly unknown[]
): (
  model: TModel,
  leafIndexWatchRule?: IIndexWatchRule,
) => IExpression<TReturn> {
  if (values.length !== 0 || args.length !== 1) {
    throw new Error(
      'rsx`...` does not support interpolations. Use exactly one literal.',
    );
  }

  const expressionString = args[0];

  return (model: TModel, leafIndexWatchRule?: IIndexWatchRule) => {
    const expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    ) as IExpressionFactory;

    return expressionFactory.create(
      model,
      expressionString,
      leafIndexWatchRule,
    );
  };
}
