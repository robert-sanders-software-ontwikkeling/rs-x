import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { IndexWatchRule } from '@rs-x/state-manager';
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
    expression = rsx('[1,2]')({});

    expect(expression.type).toEqual(ExpressionType.Array);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );

    expression = rsx('[1,2]')({});

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(ArrayExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Array);
      expect(clonedExpression.expressionString).toEqual('[1, 2]');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          context: {},
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
    expression = rsx('[1,2]')({});
    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(expression.value).toEqual([1, 2]);
    expect(actual).toBe(expression);
  });

  it('will emit change event for initial value: [1, ...[2, 3]]', async () => {
    expression = rsx('[1, ...[2, 3]]')({});

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

    expression = rsx('[1, ...array]')(model);

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
    expression = rsx('[1, ...array]')(model);

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

    expression = rsx('[1, ...array]')(model, indexWatchRule);

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    expect(model.array[0]).isWritableProperty('x');
    expect(model.array[1]).isWritableProperty('x');
    expect(model.array[0]).not.isWritableProperty('y');
    expect(model.array[1]).not.isWritableProperty('y');
  });

  it('emits exactly one change for cart[0] when recursively watched nested qty changes', async () => {
    const model = {
      cart: [
        { id: 'A', qty: 1, note: 'tracked item' },
        { id: 'B', qty: 5, note: 'ignored item' },
      ],
    };

    const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
      if (target === rootModel && index === 'cart') {
        return true;
      }

      if (Array.isArray(target)) {
        return Number(index) === 0;
      }

      if (target === model.cart[0]) {
        return String(index) === 'qty';
      }

      return false;
    });

    // Recursive leaf watching (enabled by rule)
    const firstItemExpression = rsx('cart[0]')(model, watchRule);
    await new WaitForEvent(firstItemExpression, 'changed').wait(emptyFunction);

    const actual = await new WaitForEvent(firstItemExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.cart[0].qty = 4;
    });

    expect(actual).toBe(firstItemExpression);
    expect(firstItemExpression.value).toBeDefined();
    expect((firstItemExpression.value as { qty: number }).qty).toBe(4);
  });

  it('emits change for tasks[trackedTask] when recursively watched done changes', async () => {
    const taskA = { id: 'A', done: false, note: 'tracked member' };
    const taskB = { id: 'B', done: false, note: 'ignored member' };

    const model = {
      trackedTask: taskA,
      tasks: new Set([taskA, taskB]),
    };

    const watchRule = new IndexWatchRule(model, (index, target, rootModel) => {
      const root = rootModel as typeof model;

      if (target === root && index === 'tasks') {
        return true;
      }

      if (target instanceof Set) {
        return (
          index === root.trackedTask ||
          (typeof index === 'object' &&
            index !== null &&
            (index as { id?: unknown }).id === root.trackedTask.id)
        );
      }

      if (
        target === root.trackedTask ||
        (typeof target === 'object' &&
          target !== null &&
          (target as { id?: unknown }).id === root.trackedTask.id)
      ) {
        return String(index) === 'done';
      }

      return false;
    });

    const trackedTaskExpression = rsx('tasks[trackedTask]')(model, watchRule);
    await new WaitForEvent(trackedTaskExpression, 'changed').wait(emptyFunction);

    const trackedChange = await new WaitForEvent(
      trackedTaskExpression,
      'changed',
      {
        ignoreInitialValue: true,
      },
    ).wait(() => {
      taskA.done = true;
    });

    expect(trackedChange).toBe(trackedTaskExpression);

    const ignoredChange = await new WaitForEvent(
      trackedTaskExpression,
      'changed',
      {
        ignoreInitialValue: true,
        timeout: 100,
      },
    ).wait(() => {
      taskA.note = 'ignored';
    });

    expect(ignoredChange).toBeNull();
  });

  it('keeps the calculated index identifier bound to root context for tasks[trackedTask]', async () => {
    const taskA = { id: 'A', done: false, note: 'tracked member' };
    const taskB = { id: 'B', done: false, note: 'other member' };

    const model = {
      trackedTask: taskA,
      tasks: new Set([taskA, taskB]),
    };

    expression = rsx('tasks[trackedTask]')(model);
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    // Flush deferred member-path bindings.
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const memberSegments = expression.childExpressions as IExpression[];
    const indexExpression = memberSegments[1] as IExpression;
    const trackedTaskIdentifier =
      indexExpression.childExpressions[0] as IExpression;

    expect(trackedTaskIdentifier.expressionString).toBe('trackedTask');
    expect(trackedTaskIdentifier.value).toBe(taskA);
    expect(indexExpression.value).toBe(taskA);

    taskA.done = true;
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(trackedTaskIdentifier.value).toBe(taskA);
    expect(indexExpression.value).toBe(taskA);
  });
});
