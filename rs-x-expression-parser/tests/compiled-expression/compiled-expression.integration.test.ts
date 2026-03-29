import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';
import { ExpressionType } from '../../lib/expressions/expression-parser.interface';

async function waitForValue(
  expression: { value: unknown },
  maxRounds = 200,
): Promise<void> {
  for (let i = 0; i < maxRounds; i += 1) {
    if (expression.value !== undefined) {
      return;
    }
    await Promise.resolve();
  }
}

describe('Compiled expression engine integration', () => {
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

  it('evaluates and updates compiled arithmetic expressions', async () => {
    const model = { a: 2, b: 3, c: 4 };
    const expression = rsx<number>('(a + b) * (a + c)')(model);
    expect(expression.type).toBe(ExpressionType.Multiplication);
    await waitForValue(expression);
    expect(expression.value).toBe(30);

    await new WaitForEvent(expression, 'changed').wait(() => {
      model.a = 10;
    });
    expect(expression.value).toBe((10 + 3) * (10 + 4));

    expression.dispose();
  });

  it('falls back to tree parser for unsupported shapes', async () => {
    const model = {
      a: { b: 5 },
      c: 3,
    };
    const expression = rsx<number>('a.b + c')(model);
    expect(expression.type).toBe(ExpressionType.Addition);
    await waitForValue(expression);
    expect(expression.value).toBe(8);
    expression.dispose();
  });
});
