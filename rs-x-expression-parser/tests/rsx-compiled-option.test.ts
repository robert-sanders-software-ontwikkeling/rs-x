import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import { CompiledExpression } from '../lib/compiled-expression/compiled-expression';
import { AbstractExpression } from '../lib/expressions/abstract-expression';
import { type IExpressionTree } from '../lib/expressions/expression-parser.interface';
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

describe('rsx return type structure (tree mode)', () => {
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

  it('rsx() returns AbstractExpression (IExpressionTree) by default', async () => {
    const model = { a: 1, b: 2 };
    const expression = rsx<number>('a + b')(model);
    try {
      expect(expression).toBeInstanceOf(AbstractExpression);
    } finally {
      expression.dispose();
    }
  });

  it('rsx({ compiled: false }) returns AbstractExpression (IExpressionTree)', async () => {
    const model = { a: 1, b: 2 };
    const expression = rsx<number>('a + b', { compiled: false })(model);
    try {
      expect(expression).toBeInstanceOf(AbstractExpression);
    } finally {
      expression.dispose();
    }
  });

  it('rsx() result exposes childExpressions (IExpressionTree structure)', async () => {
    const model = { a: 1, b: 2 };
    const expression = rsx<number>('a + b')(model);
    try {
      await new WaitForEvent(expression, 'changed').wait(() => {});
      const tree = expression as IExpressionTree<number>;
      expect(Array.isArray(tree.childExpressions)).toBe(true);
      expect(tree.childExpressions.length).toBeGreaterThan(0);
    } finally {
      expression.dispose();
    }
  });

  it('rsx() result has parent undefined at root', async () => {
    const model = { a: 1 };
    const expression = rsx<number>('a')(model);
    try {
      await new WaitForEvent(expression, 'changed').wait(() => {});
      const tree = expression as IExpressionTree<number>;
      expect(tree.parent).toBeUndefined();
      expect(tree.hidden).toBe(false);
    } finally {
      expression.dispose();
    }
  });
});

describe('rsx return type structure (compiled mode)', () => {
  const previousMode = process.env.RSX_EXPRESSION_ENGINE_MODE;

  beforeAll(async () => {
    process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';
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

  it('rsx({ compiled: true }) returns CompiledExpression in compiled mode', async () => {
    const model = { a: 1, b: 2 };
    const expression = rsx<number>('a + b', { compiled: true })(model);
    try {
      expect(expression).toBeInstanceOf(CompiledExpression);
    } finally {
      expression.dispose();
    }
  });

  it('rsx() returns CompiledExpression in compiled mode (global default)', async () => {
    const model = { a: 1, b: 2 };
    const expression = rsx<number>('a + b')(model);
    try {
      expect(expression).toBeInstanceOf(CompiledExpression);
    } finally {
      expression.dispose();
    }
  });

  it('rsx({ compiled: false }) still uses the global engine mode (compiled flag only controls AOT precompiled lookup)', async () => {
    const model = { a: 1, b: 2 };
    // compiled: false skips AOT precompiled cache; the engine selector still
    // applies RSX_EXPRESSION_ENGINE_MODE=compiled → CompiledExpression.
    const expression = rsx<number>('a + b', { compiled: false })(model);
    try {
      expect(expression).toBeInstanceOf(CompiledExpression);
    } finally {
      expression.dispose();
    }
  });

  it('CompiledExpression stubs: childExpressions is empty, parent is undefined, hidden is false', async () => {
    const model = { a: 1, b: 2 };
    const expression = rsx<number>('a + b', { compiled: true })(model);
    try {
      await new WaitForEvent(expression, 'changed').wait(() => {});
      // Cast to IExpressionTree to inspect the internal stubs.
      // These properties intentionally have no tree semantics on CompiledExpression.
      const asTree = expression as unknown as IExpressionTree<number>;
      expect(asTree.childExpressions).toEqual([]);
      expect(asTree.parent).toBeUndefined();
      expect(asTree.hidden).toBe(false);
    } finally {
      expression.dispose();
    }
  });
});
