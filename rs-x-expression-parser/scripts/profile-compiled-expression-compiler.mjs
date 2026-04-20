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

const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 2000);
const iterations = readPositiveIntegerEnv('RSX_BENCHMARK_ITERATIONS', 1);

const expressionStrings = generatedBenchmarkExpressionStrings.slice(
  0,
  maxCount,
);
if (expressionStrings.length === 0) {
  throw new Error('No benchmark expressions found.');
}

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const compiler = new CompiledExpressionCompiler(new JsExpressionAstParser());
  const startMs = performance.now();
  for (let i = 0; i < expressionStrings.length; i += 1) {
    compiler.tryCompile(expressionStrings[i]);
  }
  const totalMs = performance.now() - startMs;
  console.log(
    `[profile-run] iteration=${iteration + 1} count=${expressionStrings.length} totalMs=${Number(totalMs.toFixed(2))}`,
  );
}
