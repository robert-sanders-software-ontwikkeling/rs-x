import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { FunctionExpression } from '../../lib/expressions/function-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('FunctionExpression tests', () => {
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
    const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = expressionFactory.create(context, 'multiplWithTwo(a)');
    expect(expression.type).toEqual(ExpressionType.Function);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = expressionFactory.create(context, 'multiplWithTwo(a)');

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(FunctionExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Function);
      expect(clonedExpression.expressionString).toEqual('multiplWithTwo(a)');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: context,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(20);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('method on root object', async () => {
    const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = expressionFactory.create(context, 'multiplWithTwo(a)');

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });

  it('method on nested object', async () => {
    const context = {
      a: 10,
      b: {
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };
    expression = expressionFactory.create(context, 'b.multiply(a)');

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object', async () => {
    const context = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };
    expression = expressionFactory.create(context, 'b[b.methodName](a)');

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('method on root object: change event is emitted when arguments changes', async () => {
    const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = expressionFactory.create(context, 'multiplWithTwo(a)');
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      context.a = 20;
    })) as IExpression;

    expect(actual.value).toEqual(40);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object: change event is emitted when arguments changes', async () => {
    const context = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };
    expression = expressionFactory.create(context, 'b[b.methodName](a)');
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      context.a = 20;
    })) as IExpression;

    expect(actual.value).toEqual(200);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object: change event is emitted when owner object is replaced', async () => {
    const context = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };
    expression = expressionFactory.create(context, 'b[b.methodName](a)');
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      context.b = {
        methodName: 'multiply',
        x: 30,
        multiply(a: number) {
          return this.x * a;
        },
      };
    })) as IExpression;

    expect(actual.value).toEqual(300);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object: change event is emitted when changing method name', async () => {
    const context = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
        add(a: number) {
          return this.x + a;
        },
      },
    };
    expression = expressionFactory.create(context, 'b[b.methodName](a)');
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      context.b.methodName = 'add';
    })) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });
});
