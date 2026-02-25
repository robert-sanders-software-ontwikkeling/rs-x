import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { BitwiseLeftShiftExpression } from '../../lib/expressions/bitwise-left-shift-expression';
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

describe('BitwiseLeftShiftExpression tests', () => {
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
    const model = { a: 5, b: 2 };
    expression = rsx('a << b')(model);

    expect(expression.type).toEqual(ExpressionType.BitwiseLeftShift);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: 5, b: 2 };
    expression = rsx('a << b')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(BitwiseLeftShiftExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.BitwiseLeftShift);
      expect(clonedExpression.expressionString).toEqual('a << b');

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

  it('will emit change event for initial value', async () => {
    const model = { a: 5, b: 2 };
    expression = rsx('a << b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(20);
    expect(actual).toBe(expression);
  });

  it('will emit change event when operands changes', async () => {
    const model = {
      a: {
        b: 5,
      },
      c: 2,
    };
    expression = rsx('a.b << c')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a.b = 4;
    })) as IExpression;

    expect(actual.value).toEqual(16);
    expect(actual).toBe(expression);
  });
});
