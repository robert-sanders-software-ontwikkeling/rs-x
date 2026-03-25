import { afterEach } from 'node:test';

import { BehaviorSubject } from 'rxjs';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { type IObserver } from '@rs-x/state-manager';

import { IdentifierExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/identifier-expression-evaluate-unit';
import { type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';

describe('Expression observer tests', () => {
  let observer: IObserver | undefined;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule;
  });

  afterEach(() => {
    observer?.dispose();
    observer = undefined;
  });

  it('initial value', async () => {
    const context: {
      a: number;
      b: number;
      c: number;
      aPlusB: IExpression | undefined;
    } = {
      a: 10,
      b: 20,
      c: 40,
      aPlusB: undefined,
    };
    context.aPlusB = rsx('a + b')(context);

    const largerThanExpression = rsx('aPlusB > c')(context);

    await new WaitForEvent(largerThanExpression, 'changed').wait(emptyFunction);

    expect(largerThanExpression.value).toEqual(false);
  });

  it('changed value', async () => {
    const context: {
      a: number;
      b: number;
      c: number;
      aPlusB: IExpression | undefined;
    } = {
      a: 10,
      b: 20,
      c: 40,
      aPlusB: undefined,
    };

    context.aPlusB = rsx('a + b')(context);
    const largerThanExpression = rsx('aPlusB > c')(context);

    await new WaitForEvent(largerThanExpression, 'changed').wait(emptyFunction);

    await new WaitForEvent(largerThanExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      context.a = 30;
    });

    expect(largerThanExpression.value).toEqual(true);
  });

  it('propagates one change per bound expression for a single model mutation', async () => {
    const model = { a: 1 };
    const expressions = Array.from({ length: 10 }, (_, index) =>
      rsx(`a + ${index}`)(model),
    );

    try {
      await Promise.all(
        expressions.map((expression) =>
          new WaitForEvent(expression, 'changed').wait(emptyFunction),
        ),
      );

      const postInitialChangeCounts = new Array(expressions.length).fill(0);
      const replaySeen = new Array(expressions.length).fill(false);
      const subscriptions = expressions.map((expression, index) =>
        expression.changed.subscribe(() => {
          if (replaySeen[index]) {
            postInitialChangeCounts[index] += 1;
          } else {
            replaySeen[index] = true;
          }
        }),
      );

      const firstChangePerExpression = Promise.all(
        expressions.map((expression) =>
          new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
          }).wait(emptyFunction),
        ),
      );

      model.a = 2;
      await firstChangePerExpression;
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(postInitialChangeCounts).toEqual(
        new Array(expressions.length).fill(1),
      );
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    } finally {
      expressions.forEach((expression) => expression.dispose());
    }
  });

  it('scales linearly as expression count grows (raw replay vs mutation events)', async () => {
    const sizes = [1, 2, 5, 10, 20, 50, 100];

    for (const size of sizes) {
      const model = { a: 1 };
      const expressions = Array.from({ length: size }, (_, index) =>
        rsx(`a + ${index}`)(model),
      );

      try {
        await Promise.all(
          expressions.map((expression) =>
            new WaitForEvent(expression, 'changed').wait(emptyFunction),
          ),
        );

        const rawCounts = new Array(size).fill(0);
        const mutationOnlyCounts = new Array(size).fill(0);
        const replaySeen = new Array(size).fill(false);

        const subscriptions = expressions.map((expression, index) =>
          expression.changed.subscribe(() => {
            rawCounts[index] += 1;

            // changed is ReplaySubject(1): first delivery after subscribe is replay.
            if (replaySeen[index]) {
              mutationOnlyCounts[index] += 1;
            } else {
              replaySeen[index] = true;
            }
          }),
        );

        const firstChangePerExpression = Promise.all(
          expressions.map((expression) =>
            new WaitForEvent(expression, 'changed', {
              ignoreInitialValue: true,
            }).wait(emptyFunction),
          ),
        );

        model.a = 2;
        await firstChangePerExpression;
        await new Promise((resolve) => setTimeout(resolve, 0));

        const rawTotal = rawCounts.reduce((sum, count) => sum + count, 0);
        const mutationOnlyTotal = mutationOnlyCounts.reduce(
          (sum, count) => sum + count,
          0,
        );

        expect(rawTotal).toBe(size * 2);
        expect(mutationOnlyTotal).toBe(size);

        subscriptions.forEach((subscription) => subscription.unsubscribe());
      } finally {
        expressions.forEach((expression) => expression.dispose());
      }
    }
  });

  it('identifier notifications scale linearly with expression count', async () => {
    const identifierCommitSpy = jest.spyOn(
      IdentifierExpressionEvaluateUnit.prototype,
      'commitChange',
    );

    try {
      const sizes = [1, 2, 5, 10, 20, 50, 100];

      for (const size of sizes) {
        const model = { a: 1 };
        const expressions = Array.from({ length: size }, (_, index) =>
          rsx(`a + ${index}`)(model),
        );

        try {
          await Promise.all(
            expressions.map((expression) =>
              new WaitForEvent(expression, 'changed').wait(emptyFunction),
            ),
          );

          identifierCommitSpy.mockClear();

          const firstChangePerExpression = Promise.all(
            expressions.map((expression) =>
              new WaitForEvent(expression, 'changed', {
                ignoreInitialValue: true,
              }).wait(emptyFunction),
            ),
          );

          model.a = 2;
          await firstChangePerExpression;
          await new Promise((resolve) => setTimeout(resolve, 0));

          const identifierNotifications = identifierCommitSpy.mock.calls.length;

          expect(identifierNotifications).toBe(size);
        } finally {
          expressions.forEach((expression) => expression.dispose());
        }
      }
    } finally {
      identifierCommitSpy.mockRestore();
    }
  });

  it('identifier notifications for a.b.c.d example scenario do not grow superlinearly', async () => {
    const identifierCommitSpy = jest.spyOn(
      IdentifierExpressionEvaluateUnit.prototype,
      'commitChange',
    );

    try {
      const sizes = [1, 2, 5, 10, 20, 50];
      const replaceATotals: Array<{
        size: number;
        identifierNotifications: number;
      }> = [];
      const nestedNextTotals: Array<{
        size: number;
        identifierNotifications: number;
      }> = [];

      for (const size of sizes) {
        const nestedObservable = new BehaviorSubject({ d: 200 });
        const rootObservable = new BehaviorSubject({ c: nestedObservable });
        const model = {
          a: {
            b: new BehaviorSubject({
              c: new BehaviorSubject({ d: 20 }),
            }),
          },
        };

        const expressions = Array.from({ length: size }, () =>
          rsx('a.b.c.d')(model),
        );

        try {
          await Promise.all(
            expressions.map((expression) =>
              new WaitForEvent(expression, 'changed').wait(emptyFunction),
            ),
          );

          identifierCommitSpy.mockClear();

          const firstChangePerExpression = Promise.all(
            expressions.map((expression) =>
              new WaitForEvent(expression, 'changed', {
                ignoreInitialValue: true,
              }).wait(emptyFunction),
            ),
          );

          model.a = { b: rootObservable };
          await firstChangePerExpression;
          await new Promise((resolve) => setTimeout(resolve, 0));

          replaceATotals.push({
            size,
            identifierNotifications: identifierCommitSpy.mock.calls.length,
          });

          identifierCommitSpy.mockClear();

          const secondChangePerExpression = Promise.all(
            expressions.map((expression) =>
              new WaitForEvent(expression, 'changed', {
                ignoreInitialValue: true,
              }).wait(emptyFunction),
            ),
          );

          nestedObservable.next({ d: 300 });
          await secondChangePerExpression;
          await new Promise((resolve) => setTimeout(resolve, 0));

          nestedNextTotals.push({
            size,
            identifierNotifications: identifierCommitSpy.mock.calls.length,
          });
        } finally {
          expressions.forEach((expression) => expression.dispose());
        }
      }

      const assertNoSuperlinearGrowth = (
        totals: Array<{ size: number; identifierNotifications: number }>,
      ) => {
        const baselinePerExpression =
          totals[0]!.identifierNotifications / totals[0]!.size;
        for (const row of totals) {
          // Allow some fixed overhead, but block n^2-style growth.
          expect(row.identifierNotifications).toBeLessThanOrEqual(
            row.size * baselinePerExpression + baselinePerExpression,
          );
        }
      };

      assertNoSuperlinearGrowth(replaceATotals);
      assertNoSuperlinearGrowth(nestedNextTotals);

      for (let i = 1; i < replaceATotals.length; i += 1) {
        expect(replaceATotals[i]!.identifierNotifications).toBeLessThanOrEqual(
          replaceATotals[i - 1]!.identifierNotifications,
        );
      }
      for (let i = 1; i < nestedNextTotals.length; i += 1) {
        expect(
          nestedNextTotals[i]!.identifierNotifications,
        ).toBeLessThanOrEqual(nestedNextTotals[i - 1]!.identifierNotifications);
      }
    } finally {
      identifierCommitSpy.mockRestore();
    }
  });
});
