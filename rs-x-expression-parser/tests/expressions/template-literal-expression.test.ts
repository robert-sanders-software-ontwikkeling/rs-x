import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { TemplateLiteralExpression } from '../../lib/expressions/template-literal-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('TemplateLiteralExpression tests', () => {
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
    const model = { name: 'Robert' };

    expression = rsx('`Hello ${name}`')(model);
    expect(expression.type).toEqual(ExpressionType.TemplateLiteral);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { name: 'Robert' };
    expression = rsx('`Hello ${name}`')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(TemplateLiteralExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.TemplateLiteral);
      expect(clonedExpression.expressionString).toEqual('`Hello ${name}`');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          context: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual('Hello Robert');
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const model = { name: 'Robert' };
    expression = rsx('`Hello ${name}`')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual('Hello Robert');
    expect(actual).toBe(expression);
  });

  it('will emit change event when operands changes', async () => {
    const model = { name: 'Robert' };
    expression = rsx('`Hello ${name}`')(model);
    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.name = 'Pietje';
    })) as IExpression;

    expect(actual.value).toEqual('Hello Pietje');
    expect(actual).toBe(expression);
  });
});
