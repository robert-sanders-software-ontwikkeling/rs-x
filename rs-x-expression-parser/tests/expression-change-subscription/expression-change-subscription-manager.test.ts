import { InjectionContainer } from '@rs-x/core';
import { Subject } from 'rxjs';

import { ExpressionChangeSubscriptionManager } from '../../lib/expression-change-subscription/expression-change-subscription-manager';
import type { IExpressionChangeSubscriptionManager } from '../../lib/expression-change-subscription/expression-change-subscription-manager.interface';
import type { IExpression } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('ExpressionChangeSubscriptionManager', () => {
  let manager: IExpressionChangeSubscriptionManager;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  beforeEach(() => {
    manager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeSubscriptionManager,
    );
  });

  it('is an instance of ExpressionChangeSubscriptionManager', () => {
    expect(manager).toBeInstanceOf(ExpressionChangeSubscriptionManager);
  });

  it('create returns a Subject', () => {
    const model = { a: 1 };
    const expression = rsx('a')(model);
    const { instance } = manager.create(expression);

    expect(instance).toBeInstanceOf(Subject);

    manager.release(expression);
    expression.dispose();
  });

  it('subject emits when expression changes', async () => {
    const model = { a: 1 };
    const expression = rsx('a')(model);
    const { instance } = manager.create(expression);

    const emitted: IExpression[] = [];
    instance.subscribe((e) => emitted.push(e));

    await new Promise<void>((resolve) => {
      expression.changed.subscribe(() => resolve());
      model.a = 2;
    });

    expect(emitted.length).toBe(1);

    manager.release(expression);
    expression.dispose();
  });

  it('two creates on the same expression share one subscription', () => {
    const model = { a: 1 };
    const expression = rsx('a')(model);

    const result1 = manager.create(expression);
    const result2 = manager.create(expression);

    expect(result1.instance).toBe(result2.instance);
    expect(result2.referenceCount).toBe(2);

    manager.release(expression);
    manager.release(expression);
    expression.dispose();
  });

  it('subject completes after all consumers release', () => {
    const model = { a: 1 };
    const expression = rsx('a')(model);

    manager.create(expression);
    manager.create(expression);

    const { instance } = manager.create(expression);
    let completed = false;
    instance.subscribe({ complete: () => (completed = true) });

    manager.release(expression); // ref 2
    expect(completed).toBe(false);

    manager.release(expression); // ref 1
    expect(completed).toBe(false);

    manager.release(expression); // ref 0 → unsubscribe + complete
    expect(completed).toBe(true);

    expression.dispose();
  });

  it('changed emits for any managed expression', async () => {
    const model1 = { a: 1 };
    const model2 = { b: 10 };
    const expr1 = rsx('a')(model1);
    const expr2 = rsx('b')(model2);

    manager.create(expr1);
    manager.create(expr2);

    const emitted: IExpression[] = [];
    manager.changed.subscribe((e) => emitted.push(e));

    await new Promise<void>((resolve) => {
      let count = 0;
      manager.changed.subscribe(() => { if (++count === 2) resolve(); });
      model1.a = 2;
      model2.b = 20;
    });

    expect(emitted.length).toBeGreaterThanOrEqual(2);

    manager.release(expr1);
    manager.release(expr2);
    expr1.dispose();
    expr2.dispose();
  });

  it('factory is empty after all expressions are released', () => {
    const model = { a: 1 };
    const expression = rsx('a')(model);

    manager.create(expression);
    expect(manager.isEmpty).toBe(false);

    manager.release(expression);
    expect(manager.isEmpty).toBe(true);

    expression.dispose();
  });
});
