import { InjectionContainer, WaitForEvent } from '@rs-x/core';

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
import { rsx } from '../../lib/rsx';

describe('FunctionExpression tests', () => {
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
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = rsx`multiplWithTwo(a)`(model);

    expect(expression.type).toEqual(ExpressionType.Function);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = rsx`multiplWithTwo(a)`(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(FunctionExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Function);
      expect(clonedExpression.expressionString).toEqual('multiplWithTwo(a)');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
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
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = rsx`multiplWithTwo(a)`(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });

  it('method on nested object', async () => {
    const model = {
      a: 10,
      b: {
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };

    expression = rsx`b.multiply(a)`(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object', async () => {
    const model = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };

    expression = rsx`b[b.methodName](a)`(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('method on root object: change event is emitted when arguments changes', async () => {
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };

    expression = rsx`multiplWithTwo(a)`(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 20;
    })) as IExpression;

    expect(actual.value).toEqual(40);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object: change event is emitted when arguments changes', async () => {
    const model = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };

    expression = rsx`b[b.methodName](a)`(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      model.a = 20;
    })) as IExpression;

    expect(actual.value).toEqual(200);
    expect(actual).toBe(expression);
  });

  it('computed method on nested object: change event is emitted when owner object is replaced', async () => {
    const model = {
      a: 10,
      b: {
        methodName: 'multiply',
        x: 10,
        multiply(a: number) {
          return this.x * a;
        },
      },
    };
    expression = rsx`b[b.methodName](a)`(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      model.b = {
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
    const model = {
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
    expression = rsx`b[b.methodName](a)`(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      model.b.methodName = 'add';
    })) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });
});
