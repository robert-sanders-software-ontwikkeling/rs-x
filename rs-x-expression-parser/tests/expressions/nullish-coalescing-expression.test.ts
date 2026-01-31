import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
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

describe('NullishCoalescingExpression tests', () => {
  let expressionFactory: IExpressionFactory;
  let expression: IExpression | undefined;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    expression?.dispose();
    expression = undefined;
  });

  it('type', () => {
    const context = {
      a: null,
      b: 10,
    };
    expression = expressionFactory.create(context, 'a ?? b');
    expect(expression.type).toEqual(ExpressionType.NullishCoalescing);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const context = {
      a: null,
      b: 10,
    };
    expression = expressionFactory.create(context, 'a ?? b');

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(NullishCoalescingExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.NullishCoalescing);
      expect(clonedExpression.expressionString).toEqual('a ?? b');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: context,
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
    const context = {
      a: null,
      b: 10,
    };
    expression = expressionFactory.create(context, 'a ?? b');

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(10);
    expect(actual).toBe(expression);
  });

  it('will emit change event when parameters changes', async () => {
    const context: { a: number | null; b: number } = {
      a: null,
      b: 10,
    };
    expression = expressionFactory.create(context, 'a ?? b');
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      context.a = 20;
    })) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });
});
