/**
 * Compiled vs Tree engine crossover benchmark — update performance
 *
 * Answers: at which expression complexity does compiled mode become faster
 * than tree mode for reactive updates?
 *
 * Setup: for each node count, all bindings are established and fully
 * initialized BEFORE any timing starts. The benchmark measures only
 * the steady-state update cost (re-evaluating expressions when a model
 * value changes), not the one-time bind cost.
 *
 * Expression shape: "x + y + x + y + …" (always exactly 2 unique deps)
 *   N pairs of (x + y)  →  4N−1 AST nodes,  2 watch dependencies
 *
 * Why only 2 deps regardless of node count:
 *   - Tree mode: update = re-walk the AST  →  cost scales with node count
 *   - Compiled mode: update = call compiled JS function  →  nearly flat
 *   The crossover is where compiled update becomes cheaper than tree update.
 *
 * Run:
 *   node --expose-gc --max-old-space-size=8192 \
 *     rs-x-expression-parser/scripts/benchmark-compiled-tree-crossover.mjs
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
// Pair counts chosen to cover 3…359 nodes with good density around the crossover.
const pairCounts = [1, 2, 4, 7, 12, 20, 33, 55, 90];
//  Resulting node counts: 3, 7, 15, 27, 47, 79, 131, 219, 359

// 1000 unique model objects bound to the same expression.
const BINDINGS = 1000;

// Update iterations — warmup runs are excluded from measurement.
const UPDATE_RUNS = 25;
const UPDATE_WARMUP = 10;

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
 *   pairs=1 → 3 nodes  |  pairs=N → 4N−1 nodes,  always 2 deps: x and y.
 */
const makeExpression = (pairs) =>
  Array.from({ length: pairs }, () => 'x + y').join(' + ');

/** 1000 unique model objects — same field values, different object references. */
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

const waitForInit = async (bindings, maxPolls = 5000) => {
  let polls = 0;
  while (bindings.some((b) => b.value === undefined)) {
    await flushMicrotasks(1);
    if (++polls >= maxPolls) throw new Error('Timed out waiting for init');
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
    updateRuns: UPDATE_RUNS,
    updateWarmup: UPDATE_WARMUP,
    expressionShape:
      '"x + y + x + y + …" — N pairs → 4N−1 nodes, always 2 unique deps (x, y)',
    bindingShape: `${BINDINGS} unique model objects (same x+y values, different object identity)`,
    measurement:
      'Bindings are established and fully initialized before timing starts. ' +
      'Only steady-state update cost is measured (no bind overhead in the numbers). ' +
      'Single update: one model value changes, one binding re-evaluates. ' +
      'Bulk update: all model values change, all bindings re-evaluate.',
  },
  rows: [],
};

console.log('rs-x compiled vs tree crossover benchmark (update performance)');
console.log(`Node ${process.version}  CPU: ${results.environment.cpuModel}`);
console.log(
  `${BINDINGS} bindings  |  ${UPDATE_RUNS} update runs  |  ${UPDATE_WARMUP} warmup`,
);
console.log('Expression: "x + y + x + y + …" (2 deps, growing node count)');
console.log('Bindings are pre-established before any timing starts.\n');

const measureMode = async (expression, mode) => {
  process.env.RSX_EXPRESSION_ENGINE_MODE = mode;
  await resetState();

  // Establish all bindings and wait for initial evaluation.
  const models = makeModels(BINDINGS);
  const bindings = models.map((m) => rsx(expression)(m));
  await waitForInit(bindings);

  // Extra warmup updates — lets V8 JIT compile the update hot path
  // before we start timing.  Warmup updates do not appear in samples.
  for (let w = 0; w < UPDATE_WARMUP; w++) {
    for (const m of models) m.x = (m.x ?? 0) + 1;
    await flushMicrotasks();
  }

  // ── Single update: one model changes → one binding re-evaluates ───────────
  const singleSamples = [];
  const midModel = models[Math.floor(BINDINGS / 2)];
  for (let r = 0; r < UPDATE_RUNS; r++) {
    if (typeof global.gc === 'function') global.gc();
    const t0 = performance.now();
    midModel.x = (midModel.x ?? 0) + 1;
    await flushMicrotasks();
    singleSamples.push(performance.now() - t0);
  }

  // ── Bulk update: all models change → all bindings re-evaluate ─────────────
  const bulkSamples = [];
  for (let r = 0; r < UPDATE_RUNS; r++) {
    if (typeof global.gc === 'function') global.gc();
    const t0 = performance.now();
    for (const m of models) m.x = (m.x ?? 0) + 1;
    await flushMicrotasks();
    bulkSamples.push(performance.now() - t0);
  }

  for (const b of bindings) b.dispose();
  await resetState();

  return {
    singleUpdateMs: median(singleSamples),
    bulkUpdateMs: median(bulkSamples),
  };
};

for (const pairs of pairCounts) {
  const expression = makeExpression(pairs);
  const nodeCount = countNodes(expressionParser.parse(expression));

  console.log(
    `\n── ${nodeCount} nodes (${pairs} pair${pairs === 1 ? '' : 's'}) ──`,
  );

  const tree = await measureMode(expression, 'tree');
  const compiled = await measureMode(expression, 'compiled');

  const fmtWinner = (tMs, cMs) => (tMs <= cMs ? 'tree' : 'compiled');
  const fmtSpeedup = (tMs, cMs) => {
    const speedup = tMs / cMs;
    if (speedup >= 1.05) return `compiled ${speedup.toFixed(1)}× faster`;
    if (cMs / tMs >= 1.05) return `tree ${(cMs / tMs).toFixed(1)}× faster`;
    return 'equal';
  };

  console.log(
    `  single upd:  tree ${tree.singleUpdateMs.toFixed(3).padStart(7)} ms   compiled ${compiled.singleUpdateMs.toFixed(3).padStart(7)} ms  → ${fmtSpeedup(tree.singleUpdateMs, compiled.singleUpdateMs)}`,
  );
  console.log(
    `  bulk upd:    tree ${tree.bulkUpdateMs.toFixed(2).padStart(7)} ms   compiled ${compiled.bulkUpdateMs.toFixed(2).padStart(7)} ms  → ${fmtSpeedup(tree.bulkUpdateMs, compiled.bulkUpdateMs)}`,
  );

  results.rows.push({ pairs, nodeCount, tree, compiled });
}

// ─── Crossover detection ──────────────────────────────────────────────────────

const findCrossover = (metric) => {
  // Find first index where tree wins (compiled wins before it or never).
  let firstTreeWin = -1;
  let firstCompiledWin = -1;
  for (let i = 0; i < results.rows.length; i++) {
    const { tree, compiled } = results.rows[i];
    if (tree[metric] <= compiled[metric] && firstTreeWin === -1)
      firstTreeWin = i;
    if (compiled[metric] < tree[metric] && firstCompiledWin === -1)
      firstCompiledWin = i;
  }

  // Find the crossover: first index where compiled wins after tree was winning.
  for (let i = 1; i < results.rows.length; i++) {
    const a = results.rows[i - 1];
    const b = results.rows[i];
    if (
      a.tree[metric] <= a.compiled[metric] &&
      b.compiled[metric] < b.tree[metric]
    ) {
      const dN = b.nodeCount - a.nodeCount;
      const treeSlope = (b.tree[metric] - a.tree[metric]) / dN;
      const compSlope = (b.compiled[metric] - a.compiled[metric]) / dN;
      if (Math.abs(compSlope - treeSlope) > 1e-9) {
        const t =
          (a.tree[metric] - a.compiled[metric]) / (compSlope - treeSlope);
        return {
          nodeCount: Math.round(a.nodeCount + t),
          between: [a.nodeCount, b.nodeCount],
        };
      }
    }
  }
  return null;
};

const singleCrossover = findCrossover('singleUpdateMs');
const bulkCrossover = findCrossover('bulkUpdateMs');
results.crossovers = {
  singleUpdateMs: singleCrossover,
  bulkUpdateMs: bulkCrossover,
};

console.log(
  '\n── Crossover summary ──────────────────────────────────────────',
);
const fmt = (c) =>
  c === null
    ? 'not found in measured range'
    : `~${c.nodeCount} nodes (between ${c.between[0]} and ${c.between[1]} nodes)`;
console.log(`  Single update crossover:  ${fmt(singleCrossover)}`);
console.log(`  Bulk update crossover:    ${fmt(bulkCrossover)}`);

// ─── Save ─────────────────────────────────────────────────────────────────────

await fs.mkdir(reportsDirectory, { recursive: true });
const outputPath = path.join(reportsDirectory, `benchmark-${dateStamp}.json`);
await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
console.log(`\nSaved → ${outputPath}`);
