/**
 * Compiled vs Tree engine crossover benchmark — bind performance
 *
 * Answers: at which expression complexity does compiled mode become faster
 * than tree mode when creating (binding) new expressions?
 *
 * Setup: for each node count, bindings are created and immediately disposed
 * in a tight loop. Both the creation and disposal cost is included.
 *
 * Expression shape: "x + y + x + y + …" (always exactly 2 unique deps)
 *   N pairs of (x + y)  →  4N−1 AST nodes,  2 watch dependencies
 *
 * Why only 2 deps regardless of node count:
 *   - Tree mode: bind = clone the full N-node AST  →  cost scales with N
 *   - Compiled mode: bind = new CompiledExpression(plan)  →  only sets up
 *     entries for the 2 unique deps (x and y), regardless of node count
 *   The crossover is where compiled bind becomes cheaper than tree bind.
 *
 * Run:
 *   node --expose-gc --max-old-space-size=8192 \
 *     rs-x-expression-parser/scripts/benchmark-compiled-tree-bind-crossover.mjs
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  rsx,
} from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

// ─── Paths ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDirectory = path.resolve(
  repoRoot,
  'reports',
  'compiled-tree-crossover',
);
const dateStamp = new Date().toISOString().slice(0, 10);

// ─── Config ───────────────────────────────────────────────────────────────────

// Number of "x + y" pairs.  N pairs → 4N−1 AST nodes, always 2 unique deps.
//  1→3, 2→7, 4→15, 7→27, 12→47, 20→79, 33→131, 55→219, 90→359 nodes
const pairCounts = [1, 2, 4, 7, 12, 20, 33, 55, 90];

// How many model objects to bind the same expression to per timed run.
const BINDINGS = 1000;

const BIND_RUNS = 8;
const BIND_WARMUP = 5; // Extra warmup for stable JIT before timing starts

// ─── Helpers ──────────────────────────────────────────────────────────────────

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * "x + y + x + y + …" with `pairs` repetitions.
 *   pairs=1 → "x + y"  (3 nodes, 2 deps)
 *   pairs=N → 4N−1 nodes, always exactly 2 watch dependencies: x and y
 */
const makeExpression = (pairs) =>
  Array.from({ length: pairs }, () => 'x + y').join(' + ');

/** BINDINGS unique model objects per run — same values, different object refs. */
const makeModels = (count) =>
  Array.from({ length: count }, (_, i) => ({ x: i + 1, y: i + 2 }));

/** Counts total AST nodes recursively. */
const countNodes = (expression) => {
  const children = expression.childExpressions ?? [];
  let total = 1;
  for (const child of children) total += countNodes(child);
  return total;
};

const flushMicrotasks = async (rounds = 3) => {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
};

const gcFlush = async (rounds = 5) => {
  for (let i = 0; i < rounds; i++) {
    if (typeof global.gc === 'function') global.gc();
    await flushMicrotasks(4);
  }
};

// ─── RSX setup ────────────────────────────────────────────────────────────────

await InjectionContainer.load(RsXExpressionParserModule);

const expressionParser = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionParser,
);
const expressionCache = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionCache,
);
const stateManager = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IStateManager,
);

const resetState = async () => {
  stateManager.clear();
  expressionCache.dispose();
  await gcFlush();
};

// ─── Benchmark ────────────────────────────────────────────────────────────────

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    totalMemoryGb: Number((os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)),
  },
  config: {
    pairCounts,
    bindings: BINDINGS,
    bindRuns: BIND_RUNS,
    bindWarmup: BIND_WARMUP,
    expressionShape:
      '"x + y + x + y + …" — N pairs → 4N−1 nodes, always 2 unique deps (x, y)',
    bindingShape: `${BINDINGS} unique model objects per run (same x+y values, different object identity)`,
    measurement:
      'Each timed run: create BINDINGS unique model objects, bind all, dispose all. ' +
      'Cache is reset between runs so compiled mode re-uses the cached compiled plan ' +
      '(compile once during warmup, share plan for all timed runs). ' +
      'Tree mode must clone the AST for each binding on every run.',
  },
  rows: [],
};

console.log('rs-x compiled vs tree crossover benchmark (bind performance)');
console.log(`Node ${process.version}  CPU: ${results.environment.cpuModel}`);
console.log(
  `${BINDINGS} bindings  |  ${BIND_RUNS} bind runs  |  ${BIND_WARMUP} warmup`,
);
console.log('Expression: "x + y + x + y + …" (2 deps, growing node count)\n');

const measureMode = async (expression, mode) => {
  process.env.RSX_EXPRESSION_ENGINE_MODE = mode;

  const samples = [];
  for (let r = 0; r < BIND_WARMUP + BIND_RUNS; r++) {
    await resetState();
    const models = makeModels(BINDINGS);
    const t0 = performance.now();
    const bindings = models.map((m) => rsx(expression)(m));
    const elapsed = performance.now() - t0;
    for (const b of bindings) b.dispose();
    if (r >= BIND_WARMUP) samples.push(elapsed);
  }

  return { bindMs: median(samples) };
};

for (const pairs of pairCounts) {
  const expression = makeExpression(pairs);
  const nodeCount = countNodes(expressionParser.parse(expression));

  console.log(
    `\n── ${nodeCount} nodes (${pairs} pair${pairs === 1 ? '' : 's'}) ──`,
  );

  const tree = await measureMode(expression, 'tree');
  const compiled = await measureMode(expression, 'compiled');

  const speedup = tree.bindMs / compiled.bindMs;
  const winner =
    speedup >= 1.05
      ? `compiled ${speedup.toFixed(1)}× faster`
      : compiled.bindMs / tree.bindMs >= 1.05
        ? `tree ${(compiled.bindMs / tree.bindMs).toFixed(1)}× faster`
        : 'equal';

  console.log(
    `  bind:  tree ${tree.bindMs.toFixed(1).padStart(7)} ms   compiled ${compiled.bindMs.toFixed(1).padStart(7)} ms  → ${winner}`,
  );

  results.rows.push({ pairs, nodeCount, tree, compiled });
}

// ─── Crossover detection ──────────────────────────────────────────────────────

const findCrossover = () => {
  for (let i = 1; i < results.rows.length; i++) {
    const a = results.rows[i - 1];
    const b = results.rows[i];
    if (
      a.tree.bindMs <= a.compiled.bindMs &&
      b.compiled.bindMs < b.tree.bindMs
    ) {
      const dN = b.nodeCount - a.nodeCount;
      const treeSlope = (b.tree.bindMs - a.tree.bindMs) / dN;
      const compSlope = (b.compiled.bindMs - a.compiled.bindMs) / dN;
      if (Math.abs(compSlope - treeSlope) > 1e-9) {
        const t = (a.tree.bindMs - a.compiled.bindMs) / (compSlope - treeSlope);
        return {
          nodeCount: Math.round(a.nodeCount + t),
          between: [a.nodeCount, b.nodeCount],
        };
      }
    }
  }
  // Check if compiled wins from the start
  if (
    results.rows.length > 0 &&
    results.rows[0].compiled.bindMs < results.rows[0].tree.bindMs
  ) {
    return { nodeCount: results.rows[0].nodeCount, compiledAlwaysWins: true };
  }
  return null;
};

const bindCrossover = findCrossover();
results.crossover = bindCrossover;

console.log(
  '\n── Crossover summary ──────────────────────────────────────────',
);
const fmt = (c) =>
  c === null
    ? 'not found in measured range'
    : c.compiledAlwaysWins
      ? `compiled wins from the start (≤ ${c.nodeCount} nodes)`
      : `~${c.nodeCount} nodes (between ${c.between[0]} and ${c.between[1]} nodes)`;
console.log(`  Bind time crossover:  ${fmt(bindCrossover)}`);

// ─── Save ─────────────────────────────────────────────────────────────────────

await fs.mkdir(reportsDirectory, { recursive: true });
const outputPath = path.join(
  reportsDirectory,
  `benchmark-${dateStamp}-bind.json`,
);
await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
console.log(`\nSaved → ${outputPath}`);
