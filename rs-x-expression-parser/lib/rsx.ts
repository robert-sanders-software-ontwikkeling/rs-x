import { InjectionContainer } from '@rs-x/core';
import { IExpressionFactory } from './expression-factory';

import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';
import { IExpression } from './expressions/expression-parser.interface';

export function rsx<TReturn, TModel extends object = object>(
  args: TemplateStringsArray,
  ...values: readonly unknown[]
): (model: TModel) => IExpression<TReturn> {
  if (values.length !== 0 || args.length !== 1) {
    throw new Error('rsx`...` does not support interpolations. Use exactly one literal.');
  }

  const expressionString = args[0];

  return (model: TModel) => {
    const expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory
    ) as IExpressionFactory;

    return expressionFactory.create(model, expressionString);
  };
}