import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConstantBigIntExpression } from '../../lib/expressions/constant-bigint-expression';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('ConstantBigIntExpression tests', () => {
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
    expression = expressionFactory.create({}, '9007199254740991n');
    expect(expression.type).toEqual(ExpressionType.BigInt);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    expression = expressionFactory.create({}, '9007199254740991n');

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ConstantBigIntExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.BigInt);
      expect(clonedExpression.expressionString).toEqual('9007199254740991');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: {},
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(9007199254740991n);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    expression = expressionFactory.create({}, '9007199254740991n');

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(9007199254740991n);
    expect(actual).toBe(expression);
  });
});
