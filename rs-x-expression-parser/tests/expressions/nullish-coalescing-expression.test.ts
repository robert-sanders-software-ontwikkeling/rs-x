import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { NullishCoalescingExpression } from '../../lib/expressions/nullish-coalescing-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('NullishCoalescingExpression tests', () => {
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
    const model = {
      a: null,
      b: 10,
    };

    expression = rsx('a ?? b')(model);
    expect(expression.type).toEqual(ExpressionType.NullishCoalescing);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = {
      a: null,
      b: 10,
    };
    expression = rsx('a ?? b')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(NullishCoalescingExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.NullishCoalescing);
      expect(clonedExpression.expressionString).toEqual('a ?? b');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(10);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const model = {
      a: null,
      b: 10,
    };
    expression = rsx('a ?? b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(10);
    expect(actual).toBe(expression);
  });

  it('will emit change event when parameters changes', async () => {
    const model: { a: number | null; b: number } = {
      a: null,
      b: 10,
    };
    expression = rsx('a ?? b')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 20;
    })) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });
});
