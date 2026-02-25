import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConstantRegExpExpression } from '../../lib/expressions/constant-regexp-expression';
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

describe('ConstantRegExpExpression tests', () => {
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
    expression = rsx`/ab+c/i`({});

    expect(expression.type).toEqual(ExpressionType.RegExp);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    expression = expression = rsx`/ab+c/i`({});

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ConstantRegExpExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.RegExp);
      expect(clonedExpression.expressionString).toEqual('/ab+c/i');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: {},
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(new RegExp('ab+c', 'i'));
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    expression = expression = rsx`/ab+c/i`({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(new RegExp('ab+c', 'i'));
    expect(actual).toBe(expression);
  });
});
