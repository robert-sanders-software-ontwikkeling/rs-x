import { afterEach } from 'node:test';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { type IObserver } from '@rs-x/state-manager';

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
    context.aPlusB = rsx`a + b`(context);

    const largerThanExpression = rsx`aPlusB > c`(context);

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

    context.aPlusB = rsx`a + b`(context);
    const largerThanExpression = rsx`aPlusB > c`(context);

    await new WaitForEvent(largerThanExpression, 'changed').wait(emptyFunction);

    await new WaitForEvent(largerThanExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      context.a = 30;
    });

    expect(largerThanExpression.value).toEqual(true);
  });
});
