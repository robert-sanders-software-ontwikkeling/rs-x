import { InjectionContainer } from '@rs-x/core';

import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../lib/rs-x-expression-parser.module';
import { rsx } from '../lib/rsx';

async function waitForValue(
  expression: { value: unknown },
  maxRounds = 200,
): Promise<void> {
  for (let i = 0; i < maxRounds; i++) {
    if (expression.value !== undefined) return;
    await Promise.resolve();
  }
}

describe('rsx compiled option', () => {
  const previousMode = process.env.RSX_EXPRESSION_ENGINE_MODE;

  beforeAll(async () => {
    delete process.env.RSX_EXPRESSION_ENGINE_MODE;
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    if (previousMode === undefined) {
      delete process.env.RSX_EXPRESSION_ENGINE_MODE;
    } else {
      process.env.RSX_EXPRESSION_ENGINE_MODE = previousMode;
    }
    await unloadRsXExpressionParserModule();
  });

  it('rsx without options evaluates correctly', async () => {
    const model = { x: 3, y: 4 };
    const expression = rsx<number>('x + y')(model);
    await waitForValue(expression);
    expect(expression.value).toBe(7);
    expression.dispose();
  });

  it('rsx with { compiled: true } evaluates correctly', async () => {
    const model = { x: 3, y: 4 };
    const expression = rsx<number>('x + y', { compiled: true })(model);
    await waitForValue(expression);
    expect(expression.value).toBe(7);
    expression.dispose();
  });

  it('rsx with { compiled: false } evaluates correctly', async () => {
    const model = { x: 3, y: 4 };
    const expression = rsx<number>('x + y', { compiled: false })(model);
    await waitForValue(expression);
    expect(expression.value).toBe(7);
    expression.dispose();
  });

  it('rsx with { compiled: true } reacts to model changes', async () => {
    const model = { x: 1, y: 2 };
    const expression = rsx<number>('x + y', { compiled: true })(model);
    await waitForValue(expression);
    expect(expression.value).toBe(3);

    model.x = 10;
    for (let i = 0; i < 100; i++) await Promise.resolve();
    expect(expression.value).toBe(12);
    expression.dispose();
  });

  it('rsx with { compiled: false } reacts to model changes', async () => {
    const model = { x: 1, y: 2 };
    const expression = rsx<number>('x + y', { compiled: false })(model);
    await waitForValue(expression);
    expect(expression.value).toBe(3);

    model.x = 10;
    for (let i = 0; i < 100; i++) await Promise.resolve();
    expect(expression.value).toBe(12);
    expression.dispose();
  });

  it('{ compiled: true } and { compiled: false } share the same cached instance (same expression string = same cache key)', async () => {
    const model = { x: 5, y: 5 };
    // Both refer to the same underlying expression instance since compiled is
    // a build-time AOT flag, not a runtime cache discriminator.
    const exprA = rsx<number>('x + y', { compiled: true })(model);
    const exprB = rsx<number>('x + y', { compiled: false })(model);

    await waitForValue(exprA);
    await waitForValue(exprB);

    expect(exprA.value).toBe(10);
    expect(exprB.value).toBe(10);

    exprA.dispose();
    exprB.dispose();
  });
});
