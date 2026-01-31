import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { ObjectExpression } from '../../lib/expressions/object-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('ObjectExpression tests', () => {
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
      x: 10,
      y: 20,
    };
    expression = expressionFactory.create(context, '({ a: x, b: y })');
    expect(expression.type).toEqual(ExpressionType.Object);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const context = {
      x: 10,
      y: 20,
    };
    expression = expressionFactory.create(context, '({ a: x, b: y })');

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ObjectExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Object);
      expect(clonedExpression.expressionString).toEqual(
        '{\n  a: x,\n  b: y\n}',
      );

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: context,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual({ a: 10, b: 20 });
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const context = {
      x: 10,
      y: 20,
    };
    expression = expressionFactory.create(context, '({ a: x, b: y })');

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual({ a: 10, b: 20 });
    expect(actual).toBe(expression);
  });

  it('will emit change event when parameters changes', async () => {
    const context = {
      x: 10,
      y: 20,
    };
    expression = expressionFactory.create(context, '({ a: x, b: y })');
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      context.x = 201;
    })) as IExpression;

    expect(actual.value).toEqual({ a: 201, b: 20 });
    expect(actual).toBe(expression);
  });
});
