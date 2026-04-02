import { performance } from 'node:perf_hooks';

import {
  CompiledExpressionCompiler,
  JsExpressionAstParser,
  generatedBenchmarkExpressionStrings,
} from '../dist/index.js';

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 20000);
const iterations = readPositiveIntegerEnv('RSX_BENCHMARK_ITERATIONS', 5);
const warmupCount = readPositiveIntegerEnv('RSX_BENCHMARK_WARMUP_COUNT', 500);

const expressionStrings = generatedBenchmarkExpressionStrings.slice(
  0,
  maxCount,
);
if (expressionStrings.length === 0) {
  throw new Error('No benchmark expressions found.');
}

const warmupExpressions = expressionStrings.slice(
  0,
  Math.min(warmupCount, expressionStrings.length),
);

const warmupCompiler = new CompiledExpressionCompiler(
  new JsExpressionAstParser(),
);
for (let i = 0; i < warmupExpressions.length; i += 1) {
  warmupCompiler.tryCompile(warmupExpressions[i]);
}

const times = [];
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const compiler = new CompiledExpressionCompiler(new JsExpressionAstParser());
  const startMs = performance.now();
  for (let i = 0; i < expressionStrings.length; i += 1) {
    compiler.tryCompile(expressionStrings[i]);
  }
  const totalMs = performance.now() - startMs;
  times.push(totalMs);
  console.log(
    `[profile-run] iteration=${iteration + 1} count=${expressionStrings.length} totalMs=${Number(totalMs.toFixed(2))}`,
  );
}

const sorted = [...times].sort((a, b) => a - b);
const median =
  sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
const sum = sorted.reduce((acc, value) => acc + value, 0);
const mean = sum / sorted.length;

console.log(
  `[profile-summary] iterations=${iterations} minMs=${Number(sorted[0].toFixed(2))} medianMs=${Number(median.toFixed(2))} meanMs=${Number(mean.toFixed(2))} maxMs=${Number(sorted[sorted.length - 1].toFixed(2))}`,
);
