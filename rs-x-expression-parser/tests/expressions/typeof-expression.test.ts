import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { TypeofExpression } from '../../lib/expressions/typeof-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('TypeofExpression tests', () => {
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
      index: 0,
      a: ['1', 1],
    };

    expression = rsx('typeof a[index]')(model);
    expect(expression.type).toEqual(ExpressionType.Typeof);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = {
      index: 0,
      a: ['1', 1],
    };
    expression = rsx('typeof a[index]')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(TypeofExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Typeof);
      expect(clonedExpression.expressionString).toEqual('typeof a[index]');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual('string');
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const model = {
      index: 0,
      a: ['1', 1],
    };
    expression = rsx('typeof a[index]')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual('string');
    expect(actual).toBe(expression);
  });

  it('will emit change event when operands changes', async () => {
    const model = {
      index: 0,
      a: ['1', 1],
    };
    expression = rsx('typeof a[index]')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.index = 1;
    })) as IExpression;

    expect(actual.value).toEqual('number');
    expect(actual).toBe(expression);
  });
});
