import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  CompiledExpressionEngine,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../dist/index.js';

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const iterations = readPositiveIntegerEnv('RSX_RUNTIME_ITERATIONS', 5);
const loops = readPositiveIntegerEnv('RSX_RUNTIME_LOOPS', 20000);
const warmupLoops = readPositiveIntegerEnv('RSX_RUNTIME_WARMUP_LOOPS', 5000);

const expressions = [
  {
    label: 'identifier',
    expression: 'foo',
    context: { foo: 123 },
  },
  {
    label: 'member-chain',
    expression: 'user.profile.age',
    context: { user: { profile: { age: 42 } } },
  },
  {
    label: 'computed-index',
    expression: 'items[index].value',
    context: {
      index: 1,
      items: [{ value: 1 }, { value: 2 }, { value: 3 }],
    },
  },
  {
    label: 'deep-member-chain',
    expression: 'a.b.c.d.e.f',
    context: { a: { b: { c: { d: { e: { f: 99 } } } } } },
  },
  {
    label: 'mixed-computed-chain',
    expression: 'items[index].user.profile.name',
    context: {
      index: 2,
      items: [
        { user: { profile: { name: 'a' } } },
        { user: { profile: { name: 'b' } } },
        { user: { profile: { name: 'c' } } },
      ],
    },
  },
  {
    label: 'complex',
    expression: '((x + y) * 3) - (x / (y + 1)) + (x * y)',
    context: { x: 10, y: 5 },
  },
];

function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sorted.length > 0 ? sum / sorted.length : 0;
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle] ?? 0;
  return { min, max, mean, median };
}

async function main() {
  await InjectionContainer.load(RsXExpressionParserModule);

  const engine = InjectionContainer.get(
    RsXExpressionParserInjectionTokens.ICompiledExpressionEngine,
  );
  const services = InjectionContainer.get(
    RsXExpressionParserInjectionTokens.IExpressionServices,
  );

  for (const scenario of expressions) {
    const expression = engine.tryCreate(scenario.expression);
    if (!expression) {
      throw new Error(`Failed to compile expression: ${scenario.expression}`);
    }

    expression.bind({ services, context: scenario.context });
    const evalFn = expression.evaluateCompiledValue?.bind(expression);
    if (typeof evalFn !== 'function') {
      throw new Error(`evaluateCompiledValue not found for ${scenario.label}`);
    }

    for (let i = 0; i < warmupLoops; i += 1) {
      evalFn();
    }

    const times = [];
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      for (let j = 0; j < loops; j += 1) {
        evalFn();
      }
      times.push(performance.now() - start);
    }

    const stats = summarize(times);
    console.log(
      `[runtime-${scenario.label}] iterations=${iterations} loops=${loops} minMs=${stats.min.toFixed(2)} medianMs=${stats.median.toFixed(2)} meanMs=${stats.mean.toFixed(2)} maxMs=${stats.max.toFixed(2)}`,
    );

    expression.dispose();
  }

  await unloadRsXExpressionParserModule();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
