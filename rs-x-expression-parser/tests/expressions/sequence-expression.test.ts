import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { SequenceExpression } from '../../lib/expressions/sequence-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('SequenceExpression tests', () => {
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
      b: 2,
      value: 100,
      setB(v: number) {
        this.b = v;
      },
    };
    expression = rsx('(setB(value), b)')(model);

    expect(expression.type).toEqual(ExpressionType.Sequence);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model: { b: number | null; value: number; setB(v: number): void } = {
      b: null,
      value: 100,
      setB(v: number) {
        this.b = v;
      },
    };
    expression = rsx('(setB(value), b)')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(SequenceExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Sequence);
      expect(clonedExpression.expressionString).toEqual('(setB(value), b)');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          context: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(100);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const model: { b: number | null; value: number; setB(v: number): void } = {
      b: null,
      value: 100,
      setB(v: number) {
        this.b = v;
      },
    };
    expression = rsx('(setB(value), b)')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('will emit change event when operands changes', async () => {
    const model: { b: number | null; value: number; setB(v: number): void } = {
      b: null,
      value: 100,
      setB(v: number) {
        this.b = v;
      },
    };
    expression = rsx('(setB(value), b)')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.value = 200;
    })) as IExpression;

    expect(actual.value).toEqual(200);
    expect(actual).toBe(expression);
  });
});
