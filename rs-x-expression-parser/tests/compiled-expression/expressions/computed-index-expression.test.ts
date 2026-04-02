process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { IndexWatchRule } from '@rs-x/state-manager';

import { type IExpression } from '../../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../../lib/rs-x-expression-parser.module';
import { rsx } from '../../../lib/rsx';

describe('Computed index expression tests', () => {
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

  it('emits initial value for  array with computed index for array[a + 1 + b]', async () => {
    const model = {
      a: 1,
      b: 2,
      array: [1, 2, 3, 4, 5, 6],
    };

    expression = rsx('array[a + 1 + b]')(model);

    const actual = await new WaitForEvent(expression, 'changed').wait(
      emptyFunction,
    );

    expect(actual).toBe(expression);
    expect(expression.value).toEqual(5);
  });

  describe('emits change value for  array with computed index for array[a + 1 + b] when changing computed index', () => {
    let expression: IExpression;
    let model: { a: number; b: number; array: number[] };

    beforeEach(async () => {
      model = {
        a: 1,
        b: 2,
        array: [1, 2, 3, 4, 5, 6, 7],
      };

      expression = rsx('array[a + 1 + b]')(model);

      await new WaitForEvent(expression, 'changed').wait(emptyFunction);
    });

    afterEach(() => {
      expression.dispose();
    });

    it('emits initial value', async () => {
      expect(expression.value).toEqual(5);
    });

    it('change a', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.a = 3;
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(7);
    });

    it('change b', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.b = 1;
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(4);
    });

    it('change a and b', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.a = 4;
        model.b = 1;
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(7);
    });
  });

  describe('emits change value for  array with computed index for array[x.y.z + 1 + b] when changing computed index', () => {
    let expression: IExpression;
    let model: {
      x: { y: { z: number } };
      b: number;
      array: number[];
    };

    beforeEach(async () => {
      model = {
        x: {
          y: {
            z: 1,
          },
        },
        b: 2,
        array: [1, 2, 3, 4, 5, 6, 7],
      };

      expression = rsx('array[x.y.z + 1 + b]')(model);

      await new WaitForEvent(expression, 'changed').wait(emptyFunction);
    });

    afterEach(() => {
      expression.dispose();
    });

    it('emits initial value', async () => {
      expect(expression.value).toEqual(5);
    });

    it('change  x.y.z', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.x.y.z = 3;
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(7);
    });

    it('change x.y', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.x.y = { z: 2 };
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(6);
    });

    it('change x', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.x = { y: { z: -1 } };
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(3);
    });

    it('change x.y.z and b ', async () => {
      const actual = await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.x.y.z = -1;
        model.b = 1;
      });

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(2);
    });
  });

  it('does not emit change for tasks[trackedTask] when only nested item members change', async () => {
    const taskA = { id: 'A', done: false, note: 'tracked member' };
    const taskB = { id: 'B', done: false, note: 'ignored member' };

    const model = {
      trackedTask: taskA,
      tasks: new Set([taskA, taskB]),
    };

    const watchRule = new IndexWatchRule(
      'tasks-rule',
      model,
      (index, target, rootModel) => {
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
      },
    );

    const trackedTaskExpression = rsx('tasks[trackedTask]')(model, watchRule);
    await new WaitForEvent(trackedTaskExpression, 'changed').wait(
      emptyFunction,
    );

    const trackedChange = await new WaitForEvent(
      trackedTaskExpression,
      'changed',
      {
        ignoreInitialValue: true,
        timeout: 100,
      },
    ).wait(() => {
      taskA.done = true;
    });

    expect(trackedChange).toBeNull();

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

  it('keeps calculated index behavior stable for tasks[trackedTask]', async () => {
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

    const valueBefore = expression.value;

    taskA.done = true;
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(expression.value).toBe(valueBefore);
  });
});
