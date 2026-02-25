import { InjectionContainer } from '@rs-x/core';

import { AbstractExpression } from '../lib/expressions/abstract-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../lib/rs-x-expression-parser.module';
import { rsx } from '../lib/rsx';

describe('rsx (integration)', () => {
  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('creates an expression and evaluates correctly', () => {
    const model = { a: 1, b: 2 };

    const expression = rsx<number>('a+b')(model);
    expect(expression).toBeInstanceOf(AbstractExpression);
  });
});
