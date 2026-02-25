import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { UnaryPlusExpression } from '../../lib/expressions/unary-plus-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('UnaryPlusExpression tests', () => {
  let expression: IExpression | undefined;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    expression?.dispose();
    expression = undefined;
  });

  it('type', () => {
    const model = { a: '2' };
    expression = rsx('+a')(model);

    expect(expression.type).toEqual(ExpressionType.UnaryPlus);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: '2' };
    expression = rsx('+a')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(UnaryPlusExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.UnaryPlus);
      expect(clonedExpression.expressionString).toEqual('+a');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(2);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const model = { a: '2' };
    expression = rsx('+a')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(2);
    expect(actual).toBe(expression);
  });

  it('will emit change event when operands changes', async () => {
    const model = { a: '2' };
    expression = rsx('+a')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = '3';
    })) as IExpression;

    expect(actual.value).toEqual(3);
    expect(actual).toBe(expression);
  });
});
