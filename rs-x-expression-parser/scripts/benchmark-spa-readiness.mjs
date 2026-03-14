import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  rsx,
} from '@rs-x/expression-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const parseCounts = [1000, 5000, 10000];
const bindCounts = [1000, 3000, 5000];
const updateCounts = [1000, 3000, 5000];

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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((sorted.length - 1) * p);
  return sorted[index];
}

function summarize(samples) {
  return {
    samples,
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    medianMs: median(samples),
    p95Ms: percentile(samples, 0.95),
    avgMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
  };
}

function formatMs(value) {
  return `${value.toFixed(3)} ms`;
}

function makeUniqueExpressions(count) {
  return Array.from({ length: count }, (_, i) => `x${i} + y${i}`);
}

function makeWideModel(count) {
  const model = {};
  for (let i = 0; i < count; i += 1) {
    model[`x${i}`] = i;
    model[`y${i}`] = i * 2;
  }
  return model;
}

function makeRowModels(count) {
  return Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));
}

async function flushMicrotasks(rounds = 3) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

async function runTimer(runsCount, warmupCount, action) {
  for (let i = 0; i < warmupCount; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await action();
  }

  const samples = [];
  for (let i = 0; i < runsCount; i += 1) {
    if (typeof global.gc === 'function') {
      global.gc();
    }
    const started = performance.now();
    // eslint-disable-next-line no-await-in-loop
    await action();
    const ended = performance.now();
    samples.push(ended - started);
  }
  return summarize(samples);
}

await InjectionContainer.load(RsXExpressionParserModule);
const expressionParser = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionParser,
);

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
  },
  config: {
    parseCounts,
    bindCounts,
    updateCounts,
    runs,
    warmups,
  },
  sections: {
    parse: [],
    bind: {
      uniqueExpressionPerBinding: [],
      cachedExpressionString: [],
    },
    update: {
      singleMutationWithActiveBindings: [],
      bulkMutateAllBindings: [],
    },
  },
};

console.log('rs-x SPA-readiness benchmark');
console.log(`Node ${process.version}`);

console.log('\nParse benchmarks');
for (const count of parseCounts) {
  const expressions = makeUniqueExpressions(count);
  const stats = await runTimer(runs.parse, warmups.parse, async () => {
    let checksum = 0;
    for (let i = 0; i < expressions.length; i += 1) {
      const parsed = expressionParser.parse(expressions[i]);
      checksum += Number(parsed.value ?? 0);
    }
    return checksum;
  });
  results.sections.parse.push({
    count,
    ...stats,
    opsPerSecond: (count / stats.medianMs) * 1000,
    usPerOperation: (stats.medianMs * 1000) / count,
  });
  console.log(
    `parse unique ${count.toLocaleString()}: median ${formatMs(stats.medianMs)} (p95 ${formatMs(stats.p95Ms)})`,
  );
}

console.log('\nBind benchmarks');
for (const count of bindCounts) {
  const uniqueExpressions = makeUniqueExpressions(count);
  const wideModel = makeWideModel(count);
  const rowModels = makeRowModels(count);

  const uniqueStats = await runTimer(runs.bind, warmups.bind, async () => {
    const expressions = [];
    for (let i = 0; i < uniqueExpressions.length; i += 1) {
      expressions.push(rsx(uniqueExpressions[i])(wideModel));
    }
    for (const expression of expressions) {
      expression.dispose();
    }
  });

  results.sections.bind.uniqueExpressionPerBinding.push({
    count,
    ...uniqueStats,
    opsPerSecond: (count / uniqueStats.medianMs) * 1000,
    usPerOperation: (uniqueStats.medianMs * 1000) / count,
  });
  console.log(
    `bind unique ${count.toLocaleString()}: median ${formatMs(uniqueStats.medianMs)} (p95 ${formatMs(uniqueStats.p95Ms)})`,
  );

  const cachedStats = await runTimer(runs.bind, warmups.bind, async () => {
    const expressions = [];
    for (const model of rowModels) {
      expressions.push(rsx('a + b')(model));
    }
    for (const expression of expressions) {
      expression.dispose();
    }
  });

  results.sections.bind.cachedExpressionString.push({
    count,
    ...cachedStats,
    opsPerSecond: (count / cachedStats.medianMs) * 1000,
    usPerOperation: (cachedStats.medianMs * 1000) / count,
  });
  console.log(
    `bind cached ${count.toLocaleString()}: median ${formatMs(cachedStats.medianMs)} (p95 ${formatMs(cachedStats.p95Ms)})`,
  );
}

console.log('\nUpdate benchmarks');
for (const count of updateCounts) {
  const models = makeRowModels(count);
  const expressions = models.map((model) => rsx('a + b')(model));

  const singleStats = await runTimer(
    runs.updateSingle,
    warmups.updateSingle,
    async () => {
      const index = Math.floor(count / 2);
      models[index].a += 1;
      await flushMicrotasks();
    },
  );

  results.sections.update.singleMutationWithActiveBindings.push({
    count,
    ...singleStats,
    operationsPerFrame16_67ms: 16.67 / singleStats.medianMs,
  });
  console.log(
    `single update ${count.toLocaleString()} active: median ${formatMs(singleStats.medianMs)} (p95 ${formatMs(singleStats.p95Ms)})`,
  );

  const bulkStats = await runTimer(
    runs.updateBulk,
    warmups.updateBulk,
    async () => {
      for (let i = 0; i < models.length; i += 1) {
        models[i].a += 1;
      }
      await flushMicrotasks();
    },
  );

  results.sections.update.bulkMutateAllBindings.push({
    count,
    ...bulkStats,
    opsPerSecond: (count / bulkStats.medianMs) * 1000,
    usPerOperation: (bulkStats.medianMs * 1000) / count,
  });
  console.log(
    `bulk update ${count.toLocaleString()}: median ${formatMs(bulkStats.medianMs)} (p95 ${formatMs(bulkStats.p95Ms)})`,
  );

  for (const expression of expressions) {
    expression.dispose();
  }
}

const reportsDirectory = path.resolve(
  repoRoot,
  'reports',
  'rsx-spa-performance',
);
await fs.mkdir(reportsDirectory, { recursive: true });

const dateStamp = new Date().toISOString().slice(0, 10);
const resultsPath = path.resolve(reportsDirectory, `benchmark-${dateStamp}.json`);
await fs.writeFile(resultsPath, `${JSON.stringify(results, null, 2)}\n`, 'utf-8');

console.log(`\nSaved benchmark JSON to: ${resultsPath}`);

