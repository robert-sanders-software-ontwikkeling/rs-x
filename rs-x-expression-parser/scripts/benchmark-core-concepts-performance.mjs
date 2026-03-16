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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDirectory = path.resolve(
  repoRoot,
  'reports',
  'rsx-core-concepts-performance',
);
const dateStamp = new Date().toISOString().slice(0, 10);

const parseTermCounts = [1, 2, 4, 8, 16, 32];
const bindingCounts = [1000, 3000, 5000, 10000];

const runs = {
  parse: 7,
  bind: 5,
  updateSingle: 30,
  updateBulk: 10,
};

const warmups = {
  parse: 1,
  bind: 1,
  updateSingle: 3,
  updateBulk: 2,
};

const parseIterations = 5000;
const totalMemoryGb = os.totalmem() / (1024 * 1024 * 1024);
const cpuModel = os.cpus()[0]?.model ?? 'unknown';
const MB = 1024 * 1024;

const getBindingRuns = (count) => {
  if (count >= 10_000) {
    return {
      bind: 3,
      updateSingle: 12,
      updateBulk: 5,
      warmupBind: 1,
      warmupUpdateSingle: 2,
      warmupUpdateBulk: 1,
    };
  }

  if (count >= 5_000) {
    return {
      bind: 4,
      updateSingle: 20,
      updateBulk: 8,
      warmupBind: 1,
      warmupUpdateSingle: 2,
      warmupUpdateBulk: 2,
    };
  }

  return {
    bind: runs.bind,
    updateSingle: runs.updateSingle,
    updateBulk: runs.updateBulk,
    warmupBind: warmups.bind,
    warmupUpdateSingle: warmups.updateSingle,
    warmupUpdateBulk: warmups.updateBulk,
  };
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const percentile = (values, p) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * p);
  return sorted[index];
};

const summarize = (samples) => ({
  samples,
  minMs: Math.min(...samples),
  maxMs: Math.max(...samples),
  medianMs: median(samples),
  p95Ms: percentile(samples, 0.95),
  avgMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
});

const summarizeMb = (samples) => ({
  minMb: Math.min(...samples),
  maxMb: Math.max(...samples),
  medianMb: median(samples),
  p95Mb: percentile(samples, 0.95),
  avgMb: samples.reduce((sum, value) => sum + value, 0) / samples.length,
});

const formatMs = (value) => `${value.toFixed(3)} ms`;

const makeModelForTerms = (termCount) => {
  const model = {};
  for (let i = 0; i < termCount; i += 1) {
    model[`v${i}`] = i + 1;
  }
  return model;
};

const makeExpressionForTerms = (termCount) => {
  if (termCount === 1) {
    return 'v0';
  }

  const terms = [];
  for (let i = 0; i < termCount; i += 1) {
    terms.push(`v${i}`);
  }
  return terms.join(' + ');
};

const makeExpressionForTermsWithSeed = (termCount, seed) => {
  if (termCount === 1) {
    return `v0_${seed}`;
  }

  const terms = [];
  for (let i = 0; i < termCount; i += 1) {
    terms.push(`v${i}_${seed}`);
  }
  return terms.join(' + ');
};

const makeUniqueExpressions = (count) =>
  Array.from({ length: count }, (_, i) => `x${i} + y${i}`);

const makeWideModel = (count) => {
  const model = {};
  for (let i = 0; i < count; i += 1) {
    model[`x${i}`] = i;
    model[`y${i}`] = i * 2;
  }
  return model;
};

const makeRowModels = (count) =>
  Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));

const countNodes = (expression) => {
  const children = expression.childExpressions ?? [];
  let total = 1;
  for (let i = 0; i < children.length; i += 1) {
    total += countNodes(children[i]);
  }
  return total;
};

const flushMicrotasks = async (rounds = 3) => {
  for (let i = 0; i < rounds; i += 1) {
     
    await Promise.resolve();
  }
};

const runTimer = async (runCount, warmupCount, action) => {
  for (let i = 0; i < warmupCount; i += 1) {
     
    await action();
  }

  const durationSamples = [];
  const rssAfterSamples = [];
  const heapAfterSamples = [];
  const rssDeltaSamples = [];
  const heapDeltaSamples = [];
  for (let i = 0; i < runCount; i += 1) {
    if (typeof global.gc === 'function') {
      global.gc();
    }
    const memoryBefore = process.memoryUsage();
    const started = performance.now();
     
    await action();
    const ended = performance.now();
    await flushMicrotasks(1);
    const memoryAfter = process.memoryUsage();

    durationSamples.push(ended - started);
    rssAfterSamples.push(memoryAfter.rss / MB);
    heapAfterSamples.push(memoryAfter.heapUsed / MB);
    rssDeltaSamples.push((memoryAfter.rss - memoryBefore.rss) / MB);
    heapDeltaSamples.push((memoryAfter.heapUsed - memoryBefore.heapUsed) / MB);
  }

  return {
    ...summarize(durationSamples),
    memory: {
      rssAfterMb: summarizeMb(rssAfterSamples),
      heapAfterMb: summarizeMb(heapAfterSamples),
      rssDeltaMb: summarizeMb(rssDeltaSamples),
      heapDeltaMb: summarizeMb(heapDeltaSamples),
    },
  };
};

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

const resetRuntimeState = async () => {
  stateManager.clear();
  expressionCache.dispose();
  await flushMicrotasks();
  if (typeof global.gc === 'function') {
    global.gc();
  }
};

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    cpuModel,
    totalMemoryGb: Number(totalMemoryGb.toFixed(1)),
    rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
  },
  config: {
    parseTermCounts,
    bindingCounts,
    runs,
    warmups,
    parseIterations,
    bindingRunOverrides: {
      5000: {
        bind: 4,
        updateSingle: 20,
        updateBulk: 8,
      },
      10000: {
        bind: 3,
        updateSingle: 12,
        updateBulk: 5,
      },
    },
  },
  sections: {
    parseByNodeCount: [],
    parseCacheByNodeCount: [],
    bindingScale: [],
  },
};

console.log('rs-x core-concepts performance benchmark');
console.log(`Node ${process.version}`);

console.log('\nParse by node count');
for (const termCount of parseTermCounts) {
  const expression = makeExpressionForTerms(termCount);
  const parsedForNodeCount = expressionParser.parse(expression);
  const nodeCount = countNodes(parsedForNodeCount);

  const stats = await runTimer(runs.parse, warmups.parse, async () => {
    for (let i = 0; i < parseIterations; i += 1) {
      expressionParser.parse(expression);
    }
  });

  const usPerOperation = (stats.medianMs * 1000) / parseIterations;
  const opsPerSecond = (parseIterations / stats.medianMs) * 1000;

  results.sections.parseByNodeCount.push({
    termCount,
    nodeCount,
    expression,
    parseIterations,
    ...stats,
    usPerOperation,
    opsPerSecond,
  });

  console.log(
    `nodes ${nodeCount.toLocaleString()}: median ${formatMs(stats.medianMs)} (${opsPerSecond.toFixed(0)} ops/s)`,
  );
}

console.log('\nParse cache behavior (parse+clone vs clone-only)');
for (const termCount of parseTermCounts) {
  const expression = makeExpressionForTerms(termCount);
  const parsedForNodeCount = expressionParser.parse(expression);
  const nodeCount = countNodes(parsedForNodeCount);

  await resetRuntimeState();

  let uniqueSeed = 0;
  const parseAndCloneStats = await runTimer(
    runs.parse,
    warmups.parse,
    async () => {
      for (let i = 0; i < parseIterations; i += 1) {
        uniqueSeed += 1;
        const uniqueExpression = makeExpressionForTermsWithSeed(
          termCount,
          uniqueSeed,
        );
        const result = expressionCache.create(uniqueExpression);
        result.instance.dispose();
        expressionCache.release(result.id);
      }
    },
  );

  await resetRuntimeState();

  const pinnedExpression = makeExpressionForTermsWithSeed(termCount, 999999);
  const pinned = expressionCache.create(pinnedExpression);
  pinned.instance.dispose();

  const cloneOnlyStats = await runTimer(runs.parse, warmups.parse, async () => {
    for (let i = 0; i < parseIterations; i += 1) {
      const result = expressionCache.create(pinnedExpression);
      result.instance.dispose();
      expressionCache.release(result.id);
    }
  });

  expressionCache.release(pinned.id);
  await resetRuntimeState();

  results.sections.parseCacheByNodeCount.push({
    termCount,
    nodeCount,
    expression,
    parseIterations,
    parseAndClone: {
      ...parseAndCloneStats,
      usPerOperation: (parseAndCloneStats.medianMs * 1000) / parseIterations,
      opsPerSecond: (parseIterations / parseAndCloneStats.medianMs) * 1000,
    },
    cloneOnly: {
      ...cloneOnlyStats,
      usPerOperation: (cloneOnlyStats.medianMs * 1000) / parseIterations,
      opsPerSecond: (parseIterations / cloneOnlyStats.medianMs) * 1000,
    },
  });

  console.log(
    `nodes ${nodeCount.toLocaleString()}: parse+clone ${formatMs(parseAndCloneStats.medianMs)}, clone-only ${formatMs(cloneOnlyStats.medianMs)}`,
  );
}

console.log('\nBinding scale');
for (const count of bindingCounts) {
  const bindingRuns = getBindingRuns(count);
  const uniqueExpressions = makeUniqueExpressions(count);
  const wideModel = makeWideModel(count);
  const rowModels = makeRowModels(count);

  await resetRuntimeState();

  const bindUniqueStats = await runTimer(
    bindingRuns.bind,
    bindingRuns.warmupBind,
    async () => {
      const expressions = [];
      for (let i = 0; i < uniqueExpressions.length; i += 1) {
        expressions.push(rsx(uniqueExpressions[i])(wideModel));
      }
      for (const expression of expressions) {
        expression.dispose();
      }
    },
  );

  await resetRuntimeState();

  const bindSameStats = await runTimer(
    bindingRuns.bind,
    bindingRuns.warmupBind,
    async () => {
      const expressions = [];
      for (let i = 0; i < rowModels.length; i += 1) {
        expressions.push(rsx('a + b')(rowModels[i]));
      }
      for (const expression of expressions) {
        expression.dispose();
      }
    },
  );

  await resetRuntimeState();

  const updateExpressions = rowModels.map((row) => rsx('a + b')(row));

  const updateSingleStats = await runTimer(
    bindingRuns.updateSingle,
    bindingRuns.warmupUpdateSingle,
    async () => {
      const index = Math.floor(count / 2);
      rowModels[index].a += 1;
      await flushMicrotasks();
    },
  );

  const updateBulkStats = await runTimer(
    bindingRuns.updateBulk,
    bindingRuns.warmupUpdateBulk,
    async () => {
      for (let i = 0; i < rowModels.length; i += 1) {
        rowModels[i].a += 1;
      }
      await flushMicrotasks();
    },
  );

  for (const expression of updateExpressions) {
    expression.dispose();
  }
  await resetRuntimeState();

  results.sections.bindingScale.push({
    bindings: count,
    bindUnique: {
      ...bindUniqueStats,
      usPerBinding: (bindUniqueStats.medianMs * 1000) / count,
      bindingsPerSecond: (count / bindUniqueStats.medianMs) * 1000,
    },
    bindSameExpressionAgain: {
      ...bindSameStats,
      usPerBinding: (bindSameStats.medianMs * 1000) / count,
      bindingsPerSecond: (count / bindSameStats.medianMs) * 1000,
    },
    updateSingleActiveBinding: {
      ...updateSingleStats,
    },
    updateBulkActiveBindings: {
      ...updateBulkStats,
      usPerBinding: (updateBulkStats.medianMs * 1000) / count,
      bindingsPerSecond: (count / updateBulkStats.medianMs) * 1000,
    },
  });

  console.log(
    `bindings ${count.toLocaleString()}: bind unique ${formatMs(bindUniqueStats.medianMs)}, bind same ${formatMs(bindSameStats.medianMs)}, single update ${formatMs(updateSingleStats.medianMs)}, bulk update ${formatMs(updateBulkStats.medianMs)}`,
  );
}

await fs.mkdir(reportsDirectory, { recursive: true });

const jsonOutputPath = path.resolve(
  reportsDirectory,
  `benchmark-${dateStamp}.json`,
);
await fs.writeFile(
  jsonOutputPath,
  `${JSON.stringify(results, null, 2)}\n`,
  'utf-8',
);

const markdownLines = [
  '# rs-x core concepts performance benchmark',
  '',
  `Generated at: ${results.generatedAt}`,
  `Machine: ${results.environment.cpuModel}, ${results.environment.totalMemoryGb.toFixed(1)} GB RAM, ${results.environment.platform}/${results.environment.arch}, OS ${results.environment.osRelease}`,
  `Node: ${results.environment.nodeVersion}`,
  '',
  '## How to read this report',
  '',
  '- Parse by node count: how long it takes to read an expression string and build the internal expression tree.',
  '- Parse cache behavior: the first time an expression string appears, rs-x parses it and stores a cached template tree. When the same string is used again, rs-x skips parsing and clones that cached template.',
  '- Binding performance: first-time setup cost when an expression is attached to a model and its first value is computed.',
  '- Update performance: cost after setup when data changes; only affected bound expressions are recalculated.',
  '- In this benchmark, each bound row expression is `a + b`.',
  '- `Single update` changes one row (`a` for one bound expression), so only that row expression is recalculated.',
  '- `Bulk update` changes every row (`a` for all bound expressions), so each bound row expression is recalculated once.',
  '- Memory usage: `Median heap` is typical JS heap after a run; `Peak RSS` is highest process memory while running.',
  `- Parse scenarios execute ${parseIterations.toLocaleString()} parse/create operations per sample and do not bind to models.`,
  '- Binding/update scenarios use the exact binding count shown in each row.',
  '',
  '## Comparison guidance',
  '',
  '- Compare runs only when machine, Node version, and benchmark script are the same.',
  '- Prefer medians over min/max to avoid overreacting to GC and scheduler noise.',
  '- For release notes, validate changes with repeated runs and track the median trend.',
  '',
  '## Parse by node count',
  '',
  '| Nodes | Expression | Median (ms) | us/op | ops/s |',
  '| ---: | --- | ---: | ---: | ---: |',
  ...results.sections.parseByNodeCount.map((row) => {
    return `| ${row.nodeCount} | \`${row.expression}\` | ${row.medianMs.toFixed(3)} | ${row.usPerOperation.toFixed(2)} | ${row.opsPerSecond.toFixed(0)} |`;
  }),
  '',
  '## Parse cache behavior (parse+clone vs clone-only)',
  '',
  '| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |',
  '| ---: | ---: | ---: | ---: | ---: |',
  ...results.sections.parseCacheByNodeCount.map((row) => {
    return `| ${row.nodeCount} | ${row.parseAndClone.medianMs.toFixed(3)} | ${row.parseAndClone.usPerOperation.toFixed(2)} | ${row.cloneOnly.medianMs.toFixed(3)} | ${row.cloneOnly.usPerOperation.toFixed(2)} |`;
  }),
  '',
  '## Binding performance (initial full evaluation)',
  '',
  '| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |',
  '| ---: | ---: | ---: |',
  ...results.sections.bindingScale.map((row) => {
    return `| ${row.bindings.toLocaleString()} | ${row.bindUnique.medianMs.toFixed(3)} | ${row.bindSameExpressionAgain.medianMs.toFixed(3)} |`;
  }),
  '',
  '## Update performance (incremental reevaluation)',
  '',
  '| Bindings | Single update median (ms) | Bulk update median (ms) |',
  '| ---: | ---: | ---: |',
  ...results.sections.bindingScale.map((row) => {
    return `| ${row.bindings.toLocaleString()} | ${row.updateSingleActiveBinding.medianMs.toFixed(3)} | ${row.updateBulkActiveBindings.medianMs.toFixed(3)} |`;
  }),
  '',
  '## Memory usage',
  '',
  '| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |',
  '| --- | ---: | ---: |',
  ...results.sections.parseByNodeCount.map((row) => {
    return `| Parse (${row.nodeCount} nodes) | ${row.memory.heapAfterMb.medianMb.toFixed(1)} | ${row.memory.rssAfterMb.maxMb.toFixed(1)} |`;
  }),
  ...results.sections.bindingScale.flatMap((row) => {
    return [
      `| Bind unique (${row.bindings.toLocaleString()}) | ${row.bindUnique.memory.heapAfterMb.medianMb.toFixed(1)} | ${row.bindUnique.memory.rssAfterMb.maxMb.toFixed(1)} |`,
      `| Bind same expression (${row.bindings.toLocaleString()}) | ${row.bindSameExpressionAgain.memory.heapAfterMb.medianMb.toFixed(1)} | ${row.bindSameExpressionAgain.memory.rssAfterMb.maxMb.toFixed(1)} |`,
      `| Single update (${row.bindings.toLocaleString()}) | ${row.updateSingleActiveBinding.memory.heapAfterMb.medianMb.toFixed(1)} | ${row.updateSingleActiveBinding.memory.rssAfterMb.maxMb.toFixed(1)} |`,
      `| Bulk update (${row.bindings.toLocaleString()}) | ${row.updateBulkActiveBindings.memory.heapAfterMb.medianMb.toFixed(1)} | ${row.updateBulkActiveBindings.memory.rssAfterMb.maxMb.toFixed(1)} |`,
    ];
  }),
  '',
].join('\n');

const markdownOutputPath = path.resolve(
  reportsDirectory,
  `benchmark-${dateStamp}.md`,
);
await fs.writeFile(markdownOutputPath, `${markdownLines}\n`, 'utf-8');

console.log(`\nSaved benchmark JSON to: ${jsonOutputPath}`);
console.log(`Saved benchmark Markdown to: ${markdownOutputPath}`);
