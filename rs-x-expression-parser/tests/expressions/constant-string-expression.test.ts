import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConstantStringExpression } from '../../lib/expressions/constant-string-expression';
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

describe('ConstantStringExpression tests', () => {
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
    expression = rsx('"hi"')({});

    expect(expression.type).toEqual(ExpressionType.String);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );

    expression = rsx(`'hi'`)({});

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ConstantStringExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.String);
      expect(clonedExpression.expressionString).toEqual('hi');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          context: {},
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual('hi');
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will return type "string" for template string without parameters ', () => {
    expression = rsx('`hi`')({});

    expect(expression.type).toEqual(ExpressionType.String);
  });

  it('will emit change event for initial value', async () => {
    expression = rsx('"hi"')({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual('hi');
    expect(actual).toBe(expression);
  });
});
