/**
 * Angular Signals vs rs-x comparison benchmark
 *
 * Scenarios (at 1000, 3000, 5000, 10000 bindings):
 *   1. Sync identifier   — each binding watches its own unique field on its own model
 *   2. Async identifier  — each binding watches a BehaviorSubject field on its own model
 *   3. Same-model exprs  — N generated complex expressions all bound to one {x, y} model
 *                          (Angular: compiled with new Function, wrapped in computed())
 *
 * Run with:
 *   node --expose-gc rs-x-expression-parser/scripts/benchmark-angular-signals-comparison.mjs
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
  generatedBenchmarkExpressionStrings,
  rsx,
} from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';
import { BehaviorSubject } from 'rxjs';
import {
  computed,
  createEnvironmentInjector,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

// ─── Paths ───────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDirectory = path.resolve(
  repoRoot,
  'reports',
  'angular-signals-comparison',
);
const dateStamp = new Date().toISOString().slice(0, 10);

// ─── Config ──────────────────────────────────────────────────────────────────

const bindingCounts = [1000, 3000, 5000, 10000];
// Scenario 3 uses ALL 1000 generated expressions — one binding per expression.
// The array has exactly 1000 entries, so the benchmark is fixed at count=1000.
// Scenarios 1 and 2 vary binding count; scenario 3 always measures 1000 bindings.
const MB = 1024 * 1024;
const totalMemoryGb = os.totalmem() / (1024 * 1024 * 1024);
const cpuModel = os.cpus()[0]?.model ?? 'unknown';

const getRuns = (count) => {
  if (count >= 10_000) return { bind: 3, update: 10, warmupBind: 1, warmupUpdate: 2 };
  if (count >= 5_000)  return { bind: 4, update: 15, warmupBind: 1, warmupUpdate: 2 };
  return                      { bind: 5, update: 20, warmupBind: 2, warmupUpdate: 3 };
};

// Scenario 3 needs extra warmup so V8 JIT-compiles the AST-evaluation hot paths
// before we start measuring. Without warmup, cold-JIT inflates times ~4×.
const getSameModelRuns = () => ({
  bind: 3, update: 7, warmupBind: 4, warmupUpdate: 2,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushMicrotasks = async (rounds = 3) => {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
};

const gcFlush = async (rounds = 5) => {
  for (let i = 0; i < rounds; i++) {
    if (typeof global.gc === 'function') global.gc();
    await flushMicrotasks(4);
  }
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const measureMs = async (runs, warmup, fn) => {
  for (let i = 0; i < warmup; i++) await fn();
  const samples = [];
  for (let i = 0; i < runs; i++) {
    if (typeof global.gc === 'function') global.gc();
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  return median(samples);
};

const waitForInit = async (bindings, maxPolls = 5000) => {
  let polls = 0;
  while (bindings.some((b) => b.value === undefined)) {
    await flushMicrotasks(1);
    if (++polls >= maxPolls) throw new Error('Timed out waiting for init');
  }
};

// ─── RSX setup ───────────────────────────────────────────────────────────────

// Benchmark the alternative compiled-evaluator engine by default for RSX.
if (process.env.RSX_EXPRESSION_ENGINE_MODE === undefined) {
  process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';
}

await InjectionContainer.load(RsXExpressionParserModule);
const expressionCache = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionCache,
);
const stateManager = InjectionContainer.get(
  RsXStateManagerInjectionTokens.IStateManager,
);

const rsxReset = async () => {
  stateManager.clear();
  expressionCache.dispose();
  await gcFlush();
};

// ─── Angular setup ───────────────────────────────────────────────────────────

const angularInjector = createEnvironmentInjector(
  [provideZonelessChangeDetection()],
  null,
  'BenchmarkInjector',
);

// ─── Pre-compile generated expressions for Angular ───────────────────────────
// Each expression uses x and y identifiers.
// We compile to a plain function and wrap in computed(() => fn(xSig(), ySig())).

console.log(
  `Pre-compiling ${generatedBenchmarkExpressionStrings.length} expressions for Angular…`,
);
const compiledExprFns = generatedBenchmarkExpressionStrings.map(
  (expr) => new Function('x', 'y', `return ${expr}`),
);
console.log('Done.\n');

// ─── Results container ───────────────────────────────────────────────────────

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    cpuModel,
    totalMemoryGb: Number(totalMemoryGb.toFixed(1)),
  },
  config: { bindingCounts },
  scenarios: {
    syncIdentifier: [],
    asyncIdentifier: [],
    sameModelExpressions: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 1 — Sync identifier
// Each binding watches its own unique field on its own model.
//   RSX:     rsx('fieldN')(model_n)
//   Angular: signal(v) + computed(() => s())
// ═══════════════════════════════════════════════════════════════════════════════

console.log('═══ Scenario 1: Sync identifier ═══\n');

for (const count of bindingCounts) {
  const r = getRuns(count);
  await gcFlush(6);

  const expressions = Array.from({ length: count }, (_, i) => `field${i}`);
  const models = Array.from({ length: count }, (_, i) => ({ [`field${i}`]: i }));
  const mid = Math.floor(count / 2);

  // ── RSX bind ──────────────────────────────────────────────────────────────
  await rsxReset();

  const rsxBindMs = await measureMs(r.bind, r.warmupBind, async () => {
    const bindings = expressions.map((expr, i) => rsx(expr)(models[i]));
    await flushMicrotasks(5);
    for (const b of bindings) b.dispose();
  });

  await rsxReset();

  // Keep live bindings for update tests
  const rsxLiveBindings = expressions.map((expr, i) => rsx(expr)(models[i]));
  await flushMicrotasks(5);

  const rsxSingleUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    models[mid][`field${mid}`] += 1;
    await flushMicrotasks(3);
  });

  const rsxBulkUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    for (let i = 0; i < count; i++) models[i][`field${i}`] += 1;
    await flushMicrotasks(3);
  });

  for (const b of rsxLiveBindings) b.dispose();
  await rsxReset();

  // ── Angular bind ──────────────────────────────────────────────────────────
  await gcFlush(4);

  const angularBindMs = await measureMs(r.bind, r.warmupBind, async () => {
    const pairs = Array.from({ length: count }, (_, i) => {
      const s = signal(i);
      const c = computed(() => s());
      c(); // force initial eval
      return { s, c };
    });
    pairs.length; // prevent dead-code elim
  });

  await gcFlush(4);

  // Live pairs for update tests
  const angularPairs = Array.from({ length: count }, (_, i) => {
    const s = signal(i);
    const c = computed(() => s());
    c();
    return { s, c };
  });

  const angularSingleUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    angularPairs[mid].s.update((v) => v + 1);
    angularPairs[mid].c();
  });

  const angularBulkUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    for (const { s } of angularPairs) s.update((v) => v + 1);
    for (const { c } of angularPairs) c();
  });

  angularPairs.length; // prevent GC during measurement
  await gcFlush(4);

  console.log(
    `  ${count.toLocaleString()} bindings` +
    `  | RSX  bind=${rsxBindMs.toFixed(2)}ms single=${rsxSingleUpdateMs.toFixed(4)}ms bulk=${rsxBulkUpdateMs.toFixed(2)}ms` +
    `  | ANG  bind=${angularBindMs.toFixed(2)}ms single=${angularSingleUpdateMs.toFixed(4)}ms bulk=${angularBulkUpdateMs.toFixed(2)}ms`,
  );

  results.scenarios.syncIdentifier.push({
    bindings: count,
    rsx: {
      bindMs: rsxBindMs,
      singleUpdateMs: rsxSingleUpdateMs,
      bulkUpdateMs: rsxBulkUpdateMs,
    },
    angular: {
      bindMs: angularBindMs,
      singleUpdateMs: angularSingleUpdateMs,
      bulkUpdateMs: angularBulkUpdateMs,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 2 — Async identifier (BehaviorSubject)
// Each model field is a BehaviorSubject.
//   RSX:     rsx('stream')(model)  — RSX subscribes automatically
//   Angular: toSignal(subj, { injector })
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Scenario 2: Async identifier (BehaviorSubject) ═══\n');

for (const count of bindingCounts) {
  const r = getRuns(count);
  await gcFlush(6);

  const mid = Math.floor(count / 2);

  // ── RSX async bind ────────────────────────────────────────────────────────
  await rsxReset();

  const rsxAsyncBindMs = await measureMs(r.bind, r.warmupBind, async () => {
    const asyncModels = Array.from(
      { length: count },
      (_, i) => ({ stream: new BehaviorSubject(i) }),
    );
    const bindings = asyncModels.map((m) => rsx('stream')(m));
    await waitForInit(bindings);
    for (const b of bindings) b.dispose();
    for (const m of asyncModels) m.stream.complete();
  });

  await rsxReset();

  // Live for update tests
  const rsxAsyncModels = Array.from(
    { length: count },
    (_, i) => ({ stream: new BehaviorSubject(i) }),
  );
  const rsxAsyncBindings = rsxAsyncModels.map((m) => rsx('stream')(m));
  await waitForInit(rsxAsyncBindings);

  const rsxAsyncSingleUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    rsxAsyncModels[mid].stream.next(rsxAsyncModels[mid].stream.getValue() + 1);
    await flushMicrotasks(3);
  });

  const rsxAsyncBulkUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    for (const m of rsxAsyncModels) m.stream.next(m.stream.getValue() + 1);
    await flushMicrotasks(3);
  });

  for (const b of rsxAsyncBindings) b.dispose();
  for (const m of rsxAsyncModels) m.stream.complete();
  await rsxReset();

  // ── Angular async bind ────────────────────────────────────────────────────
  await gcFlush(4);

  const angularAsyncBindMs = await measureMs(r.bind, r.warmupBind, async () => {
    const pairs = Array.from({ length: count }, (_, i) => {
      const subj = new BehaviorSubject(i);
      const sig = toSignal(subj, { injector: angularInjector });
      sig(); // force initial read
      return { subj, sig };
    });
    for (const { subj } of pairs) subj.complete();
    pairs.length;
  });

  await gcFlush(4);

  // Live for update tests
  const angularAsyncPairs = Array.from({ length: count }, (_, i) => {
    const subj = new BehaviorSubject(i);
    const sig = toSignal(subj, { injector: angularInjector });
    sig();
    return { subj, sig };
  });

  const angularAsyncSingleUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    const { subj, sig } = angularAsyncPairs[mid];
    subj.next(subj.getValue() + 1);
    sig();
  });

  const angularAsyncBulkUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    for (const { subj } of angularAsyncPairs) subj.next(subj.getValue() + 1);
    for (const { sig } of angularAsyncPairs) sig();
  });

  for (const { subj } of angularAsyncPairs) subj.complete();
  await gcFlush(4);

  console.log(
    `  ${count.toLocaleString()} bindings` +
    `  | RSX  bind=${rsxAsyncBindMs.toFixed(2)}ms single=${rsxAsyncSingleUpdateMs.toFixed(4)}ms bulk=${rsxAsyncBulkUpdateMs.toFixed(2)}ms` +
    `  | ANG  bind=${angularAsyncBindMs.toFixed(2)}ms single=${angularAsyncSingleUpdateMs.toFixed(4)}ms bulk=${angularAsyncBulkUpdateMs.toFixed(2)}ms`,
  );

  results.scenarios.asyncIdentifier.push({
    bindings: count,
    rsx: {
      bindMs: rsxAsyncBindMs,
      singleUpdateMs: rsxAsyncSingleUpdateMs,
      bulkUpdateMs: rsxAsyncBulkUpdateMs,
    },
    angular: {
      bindMs: angularAsyncBindMs,
      singleUpdateMs: angularAsyncSingleUpdateMs,
      bulkUpdateMs: angularAsyncBulkUpdateMs,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO 3 — Same-model expressions (generated complex expressions)
// All N bindings target one {x, y} model using expressions from
// generated-benchmark-expression-strings.ts (cycled).
//   RSX:     rsx(generatedExpr[i % 1000])({ x, y })
//   Angular: computed(() => compiledFn[i % 1000](xSig(), ySig()))
//
// "Single update" here means changing x once — all N dependents re-evaluate.
// "Bulk update" means 10 sequential x-changes (each triggers all N).
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ Scenario 3: Same-model expressions (generated) ═══\n');

const BULK_ROUNDS = 10;

const sameModelCount = generatedBenchmarkExpressionStrings.length; // 1000

{
  const count = sameModelCount;
  const r = getSameModelRuns();
  await gcFlush(6);

  const exprCount = generatedBenchmarkExpressionStrings.length; // 1000

  // ── RSX same-model bind ───────────────────────────────────────────────────
  // We measure create+init WITHOUT dispose.  Dispose is measured separately
  // because disposing N expressions from the same model is O(N²) — each
  // dispose removes from a watcher list that still has N-i entries.
  // Including dispose in "bind" would inflate the apparent setup cost.
  await rsxReset();

  let rsxSameBindMs = 0;
  let rsxSameDisposeMs = 0;
  {
    // Warmup runs (dispose included — we just don't record the time)
    for (let w = 0; w < r.warmupBind; w++) {
      const model = { x: 1, y: 2 };
      const bindings = Array.from({ length: count }, (_, i) =>
        rsx(generatedBenchmarkExpressionStrings[i % exprCount])(model),
      );
      await flushMicrotasks(8);
      for (const b of bindings) b.dispose();
      stateManager.clear(); expressionCache.dispose(); await gcFlush(2);
    }
    // Measured runs — create+init timed separately from dispose
    const bindSamples = [];
    const disposeSamples = [];
    for (let run = 0; run < r.bind; run++) {
      if (typeof global.gc === 'function') global.gc();
      const model = { x: 1, y: 2 };
      const t0 = performance.now();
      const bindings = Array.from({ length: count }, (_, i) =>
        rsx(generatedBenchmarkExpressionStrings[i % exprCount])(model),
      );
      await flushMicrotasks(8);
      const t1 = performance.now();
      for (const b of bindings) b.dispose();
      const t2 = performance.now();
      bindSamples.push(t1 - t0);
      disposeSamples.push(t2 - t1);
      stateManager.clear(); expressionCache.dispose(); await gcFlush(2);
    }
    bindSamples.sort((a, b) => a - b);
    disposeSamples.sort((a, b) => a - b);
    rsxSameBindMs = bindSamples[Math.floor(bindSamples.length / 2)];
    rsxSameDisposeMs = disposeSamples[Math.floor(disposeSamples.length / 2)];
  }

  await rsxReset();

  // Live for update tests
  const rsxSameModel = { x: 1, y: 2 };
  const rsxSameBindings = Array.from({ length: count }, (_, i) =>
    rsx(generatedBenchmarkExpressionStrings[i % exprCount])(rsxSameModel),
  );
  await flushMicrotasks(8);

  // Single update: change x → all N re-evaluate
  const rsxSameSingleUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    rsxSameModel.x += 1;
    await flushMicrotasks(5);
  });

  // Bulk update: BULK_ROUNDS sequential changes to x
  const rsxSameBulkUpdateMs = await measureMs(
    Math.max(3, Math.floor(r.update / 4)),
    1,
    async () => {
      for (let round = 0; round < BULK_ROUNDS; round++) {
        rsxSameModel.x += 1;
        await flushMicrotasks(5);
      }
    },
  );

  for (const b of rsxSameBindings) b.dispose();
  await rsxReset();

  // ── Angular same-model bind ───────────────────────────────────────────────
  await gcFlush(4);

  const angularSameBindMs = await measureMs(r.bind, r.warmupBind, async () => {
    const xSig = signal(1);
    const ySig = signal(2);
    const computeds = Array.from({ length: count }, (_, i) => {
      const fn = compiledExprFns[i % exprCount];
      const c = computed(() => fn(xSig(), ySig()));
      c(); // force initial eval
      return c;
    });
    computeds.length;
  });

  await gcFlush(4);

  // Live for update tests
  const angularXSig = signal(1);
  const angularYSig = signal(2);
  const angularSameComputeds = Array.from({ length: count }, (_, i) => {
    const fn = compiledExprFns[i % exprCount];
    const c = computed(() => fn(angularXSig(), angularYSig()));
    c();
    return c;
  });

  // Single update: xSig changes → all N need re-eval
  const angularSameSingleUpdateMs = await measureMs(r.update, r.warmupUpdate, async () => {
    angularXSig.update((v) => v + 1);
    for (const c of angularSameComputeds) c();
  });

  // Bulk update: BULK_ROUNDS sequential changes to xSig
  const angularSameBulkUpdateMs = await measureMs(
    Math.max(3, Math.floor(r.update / 4)),
    1,
    async () => {
      for (let round = 0; round < BULK_ROUNDS; round++) {
        angularXSig.update((v) => v + 1);
        for (const c of angularSameComputeds) c();
      }
    },
  );

  angularSameComputeds.length;
  await gcFlush(4);

  console.log(
    `  ${count.toLocaleString()} bindings` +
    `  | RSX  bind(create+init)=${rsxSameBindMs.toFixed(2)}ms dispose=${rsxSameDisposeMs.toFixed(0)}ms singleX=${rsxSameSingleUpdateMs.toFixed(3)}ms bulkX(${BULK_ROUNDS})=${rsxSameBulkUpdateMs.toFixed(2)}ms` +
    `  | ANG  bind=${angularSameBindMs.toFixed(2)}ms singleX=${angularSameSingleUpdateMs.toFixed(3)}ms bulkX(${BULK_ROUNDS})=${angularSameBulkUpdateMs.toFixed(2)}ms`,
  );

  results.scenarios.sameModelExpressions.push({
    bindings: count,
    bulkRounds: BULK_ROUNDS,
    rsx: {
      bindMs: rsxSameBindMs,
      disposeMs: rsxSameDisposeMs,
      singleUpdateMs: rsxSameSingleUpdateMs,
      bulkUpdateMs: rsxSameBulkUpdateMs,
    },
    angular: {
      bindMs: angularSameBindMs,
      singleUpdateMs: angularSameSingleUpdateMs,
      bulkUpdateMs: angularSameBulkUpdateMs,
    },
  });
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

angularInjector.destroy();
await rsxReset();

// ─── Write output ─────────────────────────────────────────────────────────────

await fs.mkdir(reportsDirectory, { recursive: true });

const jsonPath = path.resolve(reportsDirectory, `benchmark-${dateStamp}.json`);
await fs.writeFile(jsonPath, `${JSON.stringify(results, null, 2)}\n`, 'utf-8');

const lines = [
  '# Angular Signals vs rs-x comparison benchmark',
  '',
  `Generated: ${results.generatedAt}`,
  `Machine: ${cpuModel}, ${totalMemoryGb.toFixed(1)} GB RAM, ${process.platform}/${process.arch}`,
  `Node: ${process.version}`,
  '',
  '## Scenario 1 — Sync identifier',
  '',
  '| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |',
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...results.scenarios.syncIdentifier.map((r) =>
    `| ${r.bindings.toLocaleString()} | ${r.rsx.bindMs.toFixed(3)} | ${r.angular.bindMs.toFixed(3)} | ${r.rsx.singleUpdateMs.toFixed(4)} | ${r.angular.singleUpdateMs.toFixed(4)} | ${r.rsx.bulkUpdateMs.toFixed(3)} | ${r.angular.bulkUpdateMs.toFixed(3)} |`,
  ),
  '',
  '## Scenario 2 — Async identifier (BehaviorSubject)',
  '',
  '| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |',
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...results.scenarios.asyncIdentifier.map((r) =>
    `| ${r.bindings.toLocaleString()} | ${r.rsx.bindMs.toFixed(3)} | ${r.angular.bindMs.toFixed(3)} | ${r.rsx.singleUpdateMs.toFixed(4)} | ${r.angular.singleUpdateMs.toFixed(4)} | ${r.rsx.bulkUpdateMs.toFixed(3)} | ${r.angular.bulkUpdateMs.toFixed(3)} |`,
  ),
  '',
  `## Scenario 3 — Same-model expressions (${generatedBenchmarkExpressionStrings.length} generated, cycled)`,
  '',
  `| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (${BULK_ROUNDS}×) (ms) | ANG bulk-x (${BULK_ROUNDS}×) (ms) |`,
  '| ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...results.scenarios.sameModelExpressions.map((r) =>
    `| ${r.bindings.toLocaleString()} | ${r.rsx.bindMs.toFixed(3)} | ${r.angular.bindMs.toFixed(3)} | ${r.rsx.singleUpdateMs.toFixed(3)} | ${r.angular.singleUpdateMs.toFixed(3)} | ${r.rsx.bulkUpdateMs.toFixed(3)} | ${r.angular.bulkUpdateMs.toFixed(3)} |`,
  ),
  '',
];

const mdPath = path.resolve(reportsDirectory, `benchmark-${dateStamp}.md`);
await fs.writeFile(mdPath, lines.join('\n') + '\n', 'utf-8');

console.log(`\nSaved JSON: ${jsonPath}`);
console.log(`Saved Markdown: ${mdPath}`);
