import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConstantNullExpression } from '../../lib/expressions/constant-null-expression';
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

describe('ConstantNullExpression tests', () => {
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
    expression = rsx`null`({});

    expect(expression.type).toEqual(ExpressionType.Null);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );

    expression = rsx`null`({});

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ConstantNullExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Null);
      expect(clonedExpression.expressionString).toEqual('null');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: {},
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(null);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    expression = rsx`null`({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(null);
    expect(actual).toBe(expression);
  });
});
