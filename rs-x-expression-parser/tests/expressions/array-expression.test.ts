import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { IndexWatchRuleMock } from '@rs-x/state-manager/testing';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ArrayExpression } from '../../lib/expressions/array-expression';
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

describe('Array expression tests', () => {
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
    expression = rsx`[1,2]`({});

    expect(expression.type).toEqual(ExpressionType.Array);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );

    expression = rsx`[1,2]`({});

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ArrayExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Array);
      expect(clonedExpression.expressionString).toEqual('[1, 2]');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          rootContext: {},
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual([1, 2]);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value: [1, 2]', async () => {
    expression = rsx`[1,2]`({});
    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(expression.value).toEqual([1, 2]);
    expect(actual).toBe(expression);
  });

  it('will emit change event for initial value: [1, ...[2, 3]]', async () => {
    expression = rsx`[1, ...[2, 3]]`({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(expression.value).toEqual([1, 2, 3]);
    expect(actual).toBe(expression);
  });

  it('will emit change event when one of the identifiers in array expression changes', async () => {
    const model = {
      array: [2, 3],
    };

    expression = rsx`[1, ...array]`(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
      model.array.push(4);
    })) as IExpression;

    expect(expression.value).toEqual([1, 2, 3, 4]);
    expect(actual).toBe(expression);
  });

  it('will  not watch items by default', async () => {
    const model = {
      array: [{ value: 2 }, { value: 3 }],
    };
    expression = rsx`[1, ...array]`(model);

    expect(model.array[0]).not.isWritableProperty('value');
    expect(model.array[1]).not.isWritableProperty('value');
  });

  it('will  watch item property for which should-watch-index predicate return true  ', async () => {
    const model = {
      array: [
        { x: 2, y: 3 },
        { x: 4, Y: 5 },
      ],
    };

    const indexWatchRule = new IndexWatchRuleMock(
      (index: unknown, target: unknown) => {
        if (Array.isArray(target)) {
          return true;
        }

        return index === 'x';
      },
    );

    expression = rsx`[1, ...array]`(model, indexWatchRule);

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    expect(model.array[0]).isWritableProperty('x');
    expect(model.array[1]).isWritableProperty('x');
    expect(model.array[0]).not.isWritableProperty('y');
    expect(model.array[1]).not.isWritableProperty('y');
  });
});
