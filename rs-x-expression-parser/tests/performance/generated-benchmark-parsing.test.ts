import { performance } from 'node:perf_hooks';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import type { IExpressionCache } from '../../lib/expression-cache/expression-cache.type';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type {
  IExpression,
  IExpressionParser,
} from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function loadGeneratedExpressionStrings(maxCount: number): string[] {
  return generatedBenchmarkExpressionStrings.slice(0, maxCount);
}

describe('Generated benchmark expressions parsing', () => {
  beforeAll(async () => {
    jest.setTimeout(120000);
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('parses generated expressions with parser only', () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const expressionStrings = loadGeneratedExpressionStrings(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);

    const expressionParser = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    ) as IExpressionParser;

    const startMs = performance.now();
    for (let i = 0; i < expressionStrings.length; i += 1) {
      expressionParser.parse(expressionStrings[i]);
    }
    const parseTotalMs = performance.now() - startMs;

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[parsing-only] count=${expressionStrings.length} parseTotalMs=${Number(parseTotalMs.toFixed(2))}`,
      );
    }

    expect(parseTotalMs).toBeGreaterThan(0);
  });

  it('splits parse, cache clone, and factory create+init costs', async () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const expressionStrings = loadGeneratedExpressionStrings(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);

    const expressionParser = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    ) as IExpressionParser;
    const expressionCache = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    ) as IExpressionCache;
    const expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    ) as IExpressionFactory;

    const parseStartMs = performance.now();
    for (let i = 0; i < expressionStrings.length; i += 1) {
      const expressionString = expressionStrings[i];
      const tree = expressionParser.parse(expressionString);
      expressionCache.registerExpressionTree(expressionString, tree);
    }
    const parseMs = performance.now() - parseStartMs;

    const cloneStartMs = performance.now();
    const cloneOnlyExpressions: IExpression[] = [];
    for (let i = 0; i < expressionStrings.length; i += 1) {
      const expressionString = expressionStrings[i];
      const expression = expressionCache.createAndGetInstance(expressionString);
      cloneOnlyExpressions.push(expression);
    }
    const cloneMs = performance.now() - cloneStartMs;

    for (let i = 0; i < cloneOnlyExpressions.length; i += 1) {
      cloneOnlyExpressions[i].dispose();
    }

    const model = { x: 7, y: 8 };
    const createStartMs = performance.now();
    const boundExpressions: IExpression[] = [];
    for (let i = 0; i < expressionStrings.length; i += 1) {
      const expressionString = expressionStrings[i];
      const expression = expressionFactory.create(model, expressionString);
      boundExpressions.push(expression);
    }
    const createMs = performance.now() - createStartMs;

    const initStartMs = performance.now();
    await Promise.all(
      boundExpressions.map((expression) =>
        expression.value !== undefined
          ? Promise.resolve()
          : new WaitForEvent(expression, 'changed').wait(emptyFunction),
      ),
    );
    const initMs = performance.now() - initStartMs;

    for (let i = 0; i < boundExpressions.length; i += 1) {
      boundExpressions[i].dispose();
    }

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[split] count=${expressionStrings.length} parseMs=${Number(parseMs.toFixed(2))} cloneMs=${Number(cloneMs.toFixed(2))} createMs=${Number(createMs.toFixed(2))} initMs=${Number(initMs.toFixed(2))} createPlusInitMs=${Number((createMs + initMs).toFixed(2))}`,
      );
    }

    expect(parseMs).toBeGreaterThan(0);
    expect(cloneMs).toBeGreaterThan(0);
    expect(createMs + initMs).toBeGreaterThan(0);
  });
});
