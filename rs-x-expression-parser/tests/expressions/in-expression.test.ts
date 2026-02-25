import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { InExpression } from '../../lib/expressions/in-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('InExpression tests', () => {
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
      b: {
        hello: 'hi',
      },
    };

    expression = rsx('"hello" in b')(model);

    expect(expression.type).toEqual(ExpressionType.In);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = {
      b: {
        hello: 'hi',
      },
    };
    expression = rsx('"hello" in b')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(InExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.In);
      expect(clonedExpression.expressionString).toEqual('("hello" in b)');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(true);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value: true', async () => {
    const model = {
      b: {
        hello: 'hi',
      },
    };
    expression = rsx('"hello" in b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(true);
    expect(actual).toBe(expression);
  });

  it('will emit change event for initial value: false', async () => {
    const model = {
      b: {
        hello: 'hi',
      },
    };

    expression = rsx('"x" in b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(false);
    expect(actual).toBe(expression);
  });

  it('will emit change event when argument changes', async () => {
    const model = {
      propertyName: 'hello',
      b: {
        hello: 'hi',
      },
    };
    expression = rsx('propertyName in b')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.propertyName = 'x';
    })) as IExpression;

    expect(actual.value).toEqual(false);
    expect(actual).toBe(expression);
  });
});
