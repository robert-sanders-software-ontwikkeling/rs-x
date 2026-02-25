import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConstantBooleanExpression } from '../../lib/expressions/constant-boolean-expression';
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

describe('ConstantBooleanExpression tests', () => {
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
    expression = rsx('true')({});

    expect(expression.type).toEqual(ExpressionType.Boolean);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    expression = rsx('true')({});

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ConstantBooleanExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Boolean);
      expect(clonedExpression.expressionString).toEqual('true');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: {},
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
    expression = rsx('true')({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(true);
    expect(actual).toBe(expression);
  });

  it('will emit change event for initial value: false', async () => {
    expression = rsx('false')({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(false);
    expect(actual).toBe(expression);
  });
});
