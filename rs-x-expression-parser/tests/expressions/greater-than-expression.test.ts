import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { GreaterThanExpression } from '../../lib/expressions/greater-than-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('GreaterThanExpression tests', () => {
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
    const model = { a: 1, b: 2 };
    expression = rsx('a > b')(model);

    expect(expression.type).toEqual(ExpressionType.GreaterThan);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: 1, b: 2 };
    expression = rsx('a > b')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(GreaterThanExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.GreaterThan);
      expect(clonedExpression.expressionString).toEqual('a > b');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(false);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value: false', async () => {
    const model = { a: 1, b: 2 };
    expression = rsx('a > b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(false);
    expect(actual).toBe(expression);
  });

  it('will emit change event for initial value: true', async () => {
    const model = { a: 2, b: 1 };
    expression = rsx('a > b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(true);
    expect(actual).toBe(expression);
  });

  it('will emit change event when operands changes', async () => {
    const model = {
      a: {
        b: 3,
      },
      c: 2,
    };
    expression = rsx('a.b > c')(model);
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a.b = 1;
    })) as IExpression;

    expect(actual.value).toEqual(false);
    expect(actual).toBe(expression);
  });
});
