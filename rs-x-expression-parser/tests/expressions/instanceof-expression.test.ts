import { InjectionContainer, Type, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { InstanceofExpression } from '../../lib/expressions/instanceof-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('InstanceofExpression tests', () => {
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
      type: Date,
      a: new Date(),
    };
    expression = rsx`a instanceof type`(model);

    expect(expression.type).toEqual(ExpressionType.Instanceof);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = {
      type: Date,
      a: new Date(),
    };
    expression = rsx`a instanceof type`(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(InstanceofExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Instanceof);
      expect(clonedExpression.expressionString).toEqual('a instanceof type');

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
      type: Date,
      a: new Date(),
    };
    expression = rsx`a instanceof type`(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(true);
    expect(actual).toBe(expression);
  });

  it('will emit change event for initial value: true', async () => {
    const model = {
      type: String,
      a: new Date(),
    };
    expression = rsx`a instanceof type`(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(false);
    expect(actual).toBe(expression);
  });

  it('will emit change event when parameters changes', async () => {
    const model = {
      type: String.constructor,
      a: new Date(),
    };
    expression = rsx`a instanceof type`(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.type = Type.cast(Date);
    })) as IExpression;

    expect(actual.value).toEqual(true);
    expect(actual).toBe(expression);
  });
});
