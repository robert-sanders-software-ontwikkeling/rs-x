import { expectCompiledOrTreeInstanceOf } from './_compiled-assertions';
process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';

import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../../lib/expressions/expression-parser.interface';
import { FunctionExpression } from '../../../lib/expressions/function-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../../lib/rsx';

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
    expression = rsx('multiplWithTwo(a)')(model);

    expect(expression.type).toEqual(ExpressionType.Function);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = rsx('multiplWithTwo(a)')(model);

    const clonedExpression = expression.clone();

    try {
      expectCompiledOrTreeInstanceOf(clonedExpression, FunctionExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Function);
      expect(clonedExpression.expressionString).toEqual('multiplWithTwo(a)');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          context: model,
          services,
        });
      });
      expect(clonedExpression.value).toEqual(20);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('method on root object', async () => {
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };
    expression = rsx('multiplWithTwo(a)')(model);

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

    expression = rsx('b.multiply(a)')(model);

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

    expression = rsx('b[b.methodName](a)')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('method on root object: change event is emitted when arguments changes', async () => {
    const model = { a: 10, multiplWithTwo: (a: number) => 2 * a };

    expression = rsx('multiplWithTwo(a)')(model);

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

    expression = rsx('b[b.methodName](a)')(model);

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
    expression = rsx('b[b.methodName](a)')(model);

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
    expression = rsx('b[b.methodName](a)')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      model.b.methodName = 'add';
    })) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });

  it('evaluates zero-argument function calls without exposing tree internals', async () => {
    const model = {
      a: 1,
      initializeA() {
        this.a = 2;
      },
    };

    expression = rsx('initializeA()')(model);
    await new WaitForEvent(expression, 'changed').wait(() => {});
    expect(model.a).toBe(2);
    expect(expression.value).toBeUndefined();
    expect(
      Object.prototype.hasOwnProperty.call(
        expression as object,
        'childExpressions',
      ),
    ).toBe(false);
  });

  it('supports inline arrow-function callbacks across array methods', async () => {
    const model = {
      lines: [
        { qty: 2, unitPrice: 10, lineTotal: 20 },
        { qty: 1, unitPrice: 7, lineTotal: 7 },
        { qty: 5, unitPrice: 3, lineTotal: 15 },
      ],
    };

    const scenarios: Array<{
      expressionString: string;
      expectedValue: unknown;
    }> = [
      {
        expressionString:
          'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
        expectedValue: 42,
      },
      {
        expressionString: 'lines.map((line) => line.qty * line.unitPrice)',
        expectedValue: [20, 7, 15],
      },
      {
        expressionString: 'lines.filter((line) => line.qty > 1).length',
        expectedValue: 2,
      },
      {
        expressionString: 'lines.find((line) => line.unitPrice === 7).qty',
        expectedValue: 1,
      },
      {
        expressionString: 'lines.some((line) => line.qty >= 5)',
        expectedValue: true,
      },
      {
        expressionString: 'lines.every((line) => line.unitPrice > 0)',
        expectedValue: true,
      },
    ];

    for (const scenario of scenarios) {
      const scenarioExpression = rsx(scenario.expressionString)(model);
      const changedExpression = (await new WaitForEvent(
        scenarioExpression,
        'changed',
      ).wait(() => {})) as IExpression | null;
      const resolvedExpression = changedExpression ?? scenarioExpression;

      expect(resolvedExpression.value).toEqual(scenario.expectedValue);
      scenarioExpression.dispose();
    }
  });
});
