import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConditionalExpression } from '../../lib/expressions/conditional-expression';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('ConditionalExpression tests', () => {
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
    const model = { a: 1, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    expect(expression.type).toEqual(ExpressionType.Conditional);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: 10, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ConditionalExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Conditional);
      expect(clonedExpression.expressionString).toEqual('a > b ? c : d');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(100);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will return consequent if condition is true', async () => {
    const model = { a: 10, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('will return alternate if condition is false', async () => {
    const model = { a: 1, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(200);
    expect(actual).toBe(expression);
  });

  it('will return emit change event when condition changes', async () => {
    const model = { a: 1, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 3;
    })) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('will emit change event if consequent changes', async () => {
    const model = { a: 10, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.c = 400;
    })) as IExpression;

    expect(actual.value).toEqual(400);
    expect(actual).toBe(expression);
  });

  it('will not emit change event if condition is true and changing alternate', async () => {
    const model = { a: 10, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.d = 400;
    })) as IExpression;

    expect(actual).toBeNull();
  });

  it('will emit change event if alternate changes', async () => {
    const model = { a: 1, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.d = 400;
    })) as IExpression;

    expect(actual.value).toEqual(400);
    expect(actual).toBe(expression);
  });

  it('will not emit change event if condition is false and changing consequent', async () => {
    const model = { a: 1, b: 2, c: 100, d: 200 };
    expression = rsx('a > b ? c : d')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.c = 400;
    })) as IExpression;

    expect(actual).toBeNull();
  });
});
