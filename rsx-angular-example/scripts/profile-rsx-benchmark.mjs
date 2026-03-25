import inspector from 'node:inspector';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { InjectionContainer, WaitForEvent, emptyFunction } from '@rs-x/core';
import { RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';

const DEFAULT_BENCHMARK_EXPRESSION_COUNT = 1000;
const BENCHMARK_TERMS_PER_EXPRESSION = 32;
const TOP_HOTSPOTS = 25;
const DEFAULT_INCREMENT_STEP = 10;
const DEFAULT_LINEARITY_TOLERANCE = 2.0;

function getArgValue(name) {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return undefined;
}

function parseConfig() {
  const source = getArgValue('source') ?? 'runtime';
  const incremental = (getArgValue('incremental') ?? 'false') === 'true';
  const countValue = Number(
    getArgValue('count') ?? DEFAULT_BENCHMARK_EXPRESSION_COUNT,
  );
  const waitTimeoutValue = Number(getArgValue('wait-timeout-ms') ?? 15000);
  const stepValue = Number(getArgValue('step') ?? DEFAULT_INCREMENT_STEP);
  const linearityToleranceValue = Number(
    getArgValue('linearity-tolerance') ?? DEFAULT_LINEARITY_TOLERANCE,
  );
  const json = (getArgValue('json') ?? 'false') === 'true';
  const count =
    Number.isFinite(countValue) && countValue > 0
      ? Math.floor(countValue)
      : DEFAULT_BENCHMARK_EXPRESSION_COUNT;
  const waitTimeoutMs =
    Number.isFinite(waitTimeoutValue) && waitTimeoutValue > 0
      ? Math.floor(waitTimeoutValue)
      : 15000;
  const step =
    Number.isFinite(stepValue) && stepValue > 0
      ? Math.floor(stepValue)
      : DEFAULT_INCREMENT_STEP;
  const linearityTolerance =
    Number.isFinite(linearityToleranceValue) && linearityToleranceValue >= 1
      ? linearityToleranceValue
      : DEFAULT_LINEARITY_TOLERANCE;
  return {
    source,
    incremental,
    count,
    waitTimeoutMs,
    step,
    linearityTolerance,
    json,
  };
}

function buildRuntimeBenchmarkDefinition(expressionCount) {
  const sharedModel = {};
  const expressionStrings = [];

  for (
    let expressionIndex = 0;
    expressionIndex < expressionCount;
    expressionIndex += 1
  ) {
    const terms = [];
    for (
      let termIndex = 0;
      termIndex < BENCHMARK_TERMS_PER_EXPRESSION;
      termIndex += 1
    ) {
      const key = `v_${expressionIndex}_${termIndex}`;
      sharedModel[key] = expressionIndex + termIndex;
      terms.push(key);
    }

    expressionStrings.push(terms.join(' + '));
  }

  return { sharedModel, expressionStrings, fileReadMs: 0 };
}

function buildGeneratedBenchmarkDefinition(expressionCount) {
  const fileReadStart = performance.now();
  const benchmarkFile = resolve(
    process.cwd(),
    'rs-x-expression-parser/lib/benchmark/generated-benchmark-expression-strings.ts',
  );
  const source = readFileSync(benchmarkFile, 'utf8');
  const fileReadMs = performance.now() - fileReadStart;
  const arrayStart = source.indexOf('[');
  const arrayEnd = source.lastIndexOf(']');
  const serializedArray =
    arrayStart >= 0 && arrayEnd > arrayStart
      ? source.slice(arrayStart, arrayEnd + 1)
      : '[]';
  const allExpressionStrings = JSON.parse(serializedArray);
  const expressionStrings = allExpressionStrings.slice(0, expressionCount);

  return {
    sharedModel: { x: 7, y: 8 },
    expressionStrings,
    fileReadMs,
  };
}

function postAsync(session, method, params = undefined) {
  return new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

async function withCpuProfile(work) {
  const session = new inspector.Session();
  session.connect();
  try {
    await postAsync(session, 'Profiler.enable');
    await postAsync(session, 'Profiler.start');
    const output = await work();
    const { profile } = await postAsync(session, 'Profiler.stop');
    await postAsync(session, 'Profiler.disable');
    return { output, profile };
  } finally {
    session.disconnect();
  }
}

function formatCallFrame(callFrame) {
  const fn = callFrame.functionName || '(anonymous)';
  const url = callFrame.url || '(native)';
  const line = Number.isFinite(callFrame.lineNumber)
    ? callFrame.lineNumber + 1
    : 0;
  return `${fn} @ ${url}:${line}`;
}

function summarizeProfile(profile) {
  const totalProfileMs = (profile.endTime - profile.startTime) / 1000;
  const nodes = profile.nodes ?? [];
  const totalHits = nodes.reduce((sum, node) => sum + (node.hitCount ?? 0), 0);
  const msPerHit = totalHits > 0 ? totalProfileMs / totalHits : 0;

  const allHotspots = nodes
    .map((node) => {
      const hits = node.hitCount ?? 0;
      return {
        hits,
        selfMs: hits * msPerHit,
        frame: formatCallFrame(node.callFrame),
        url: node.callFrame?.url ?? '',
      };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const rsxHotspots = allHotspots.filter(
    (entry) =>
      entry.url.includes('/rs-x-') ||
      entry.url.includes('/@rs-x/') ||
      entry.url.includes('/rxjs/'),
  );

  return {
    totalProfileMs,
    totalHits,
    allHotspots: allHotspots.slice(0, TOP_HOTSPOTS),
    rsxHotspots: rsxHotspots.slice(0, TOP_HOTSPOTS),
  };
}

async function waitForEventWithTimeout(waiter, timeoutMs) {
  return await Promise.race([
    waiter.then(() => true),
    new Promise((resolve) => {
      setTimeout(() => resolve(false), timeoutMs);
    }),
  ]);
}

async function waitAllWithTimeout(waiters, timeoutMs) {
  const settled = await Promise.all(
    waiters.map((waiter) => waitForEventWithTimeout(waiter, timeoutMs)),
  );
  return settled.reduce((sum, completed) => sum + (completed ? 1 : 0), 0);
}

async function run() {
  const {
    source,
    incremental,
    count,
    waitTimeoutMs,
    step,
    linearityTolerance,
    json,
  } = parseConfig();
  const phase = {};

  const loadStart = performance.now();
  await InjectionContainer.load(RsXExpressionParserModule);
  phase.injectionLoadMs = performance.now() - loadStart;

  const buildStart = performance.now();
  const { sharedModel, expressionStrings, fileReadMs } =
    source === 'generated'
      ? buildGeneratedBenchmarkDefinition(count)
      : buildRuntimeBenchmarkDefinition(count);
  phase.definitionBuildMs = performance.now() - buildStart;

  if (incremental) {
    const roundRows = [];
    const expressions = [];
    let previousPerExpressionMs;
    let currentCount = 0;
    let cumulativeTotalMs = 0;

    while (currentCount < expressionStrings.length) {
      const nextCount = Math.min(currentCount + step, expressionStrings.length);
      const batchSize = nextCount - currentCount;

      const createStart = performance.now();
      const newExpressions = expressionStrings
        .slice(currentCount, nextCount)
        .map((expressionString) => rsx(expressionString)(sharedModel));
      const createMs = performance.now() - createStart;
      expressions.push(...newExpressions);

      const initStart = performance.now();
      const initializedCount = await waitAllWithTimeout(
        newExpressions.map((expression) =>
          expression.value !== undefined
            ? Promise.resolve()
            : new WaitForEvent(expression, 'changed').wait(emptyFunction),
        ),
        waitTimeoutMs,
      );
      const initMs = performance.now() - initStart;
      const totalMs = createMs + initMs;
      cumulativeTotalMs += totalMs;
      const perExpressionMs = totalMs / batchSize;

      roundRows.push({
        count: nextCount,
        batchSize,
        createMs,
        initMs,
        totalMs,
        cumulativeTotalMs,
        perExpressionMs,
        initializedCount,
      });

      if (initializedCount !== batchSize) {
        throw new Error(
          `Initialization incomplete at count=${nextCount}. initialized=${initializedCount}.`,
        );
      }

      if (previousPerExpressionMs !== undefined) {
        const ratio = perExpressionMs / previousPerExpressionMs;
        if (ratio > linearityTolerance) {
          const details = {
            previousPerExpressionMs,
            currentPerExpressionMs: perExpressionMs,
            ratio,
            tolerance: linearityTolerance,
            currentCount: nextCount,
          };
          throw new Error(
            `Non-linear degradation detected: ${JSON.stringify(details)}`,
          );
        }
      }
      previousPerExpressionMs = perExpressionMs;
      currentCount = nextCount;
    }

    for (let i = 0; i < expressions.length; i += 1) {
      expressions[i].dispose();
    }

    const finalRound = roundRows[roundRows.length - 1];
    const fullInitWithinTarget = cumulativeTotalMs <= 1000;

    const unloadStart = performance.now();
    await InjectionContainer.unload(RsXExpressionParserModule);
    phase.injectionUnloadMs = performance.now() - unloadStart;

    const payload = {
      config: {
        source,
        incremental,
        requestedCount: count,
        expressionCount: expressionStrings.length,
        waitTimeoutMs,
        step,
        linearityTolerance,
      },
      result: {
        fullCount: finalRound.count,
        fullInitTotalMs: cumulativeTotalMs,
        fullInitWithinTarget,
      },
      rounds: roundRows.map((row) => ({
        count: row.count,
        batchSize: row.batchSize,
        createMs: Number(row.createMs.toFixed(2)),
        initMs: Number(row.initMs.toFixed(2)),
        totalMs: Number(row.totalMs.toFixed(2)),
        cumulativeTotalMs: Number(row.cumulativeTotalMs.toFixed(2)),
        perExpressionMs: Number(row.perExpressionMs.toFixed(4)),
      })),
    };

    if (json) {
      console.log(JSON.stringify(payload));
      return;
    }

    console.log('\n=== Config ===');
    console.log(JSON.stringify(payload.config));
    console.log('\n=== Incremental Initialization ===');
    console.table(payload.rounds);
    console.log('\n=== Full Count Result ===');
    console.log(
      JSON.stringify({
        fullCount: payload.result.fullCount,
        fullInitTotalMs: Number(payload.result.fullInitTotalMs.toFixed(2)),
        fullInitWithinTarget: payload.result.fullInitWithinTarget,
      }),
    );
    return;
  }

  const { output: expressions, profile: createProfile } = await withCpuProfile(
    async () => {
      const createStart = performance.now();
      const createdExpressions = expressionStrings.map((expressionString) =>
        rsx(expressionString)(sharedModel),
      );
      phase.createExpressionsMs = performance.now() - createStart;
      return createdExpressions;
    },
  );

  const initStart = performance.now();
  const initializedCount = await waitAllWithTimeout(
    expressions.map((expression) =>
      new WaitForEvent(expression, 'changed').wait(emptyFunction),
    ),
    waitTimeoutMs,
  );
  phase.initialResolutionMs = performance.now() - initStart;

  const changedStart = performance.now();
  const changedWaiters = expressions.map((expression) =>
    new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(emptyFunction),
  );
  if (source === 'generated') {
    sharedModel.x = sharedModel.x + 1;
  } else {
    sharedModel.v_0_0 = sharedModel.v_0_0 + 1;
  }
  const changedCount = await waitAllWithTimeout(changedWaiters, waitTimeoutMs);
  phase.singleMutationPropagationMs = performance.now() - changedStart;

  const disposeStart = performance.now();
  for (let i = 0; i < expressions.length; i += 1) {
    expressions[i].dispose();
  }
  phase.disposeMs = performance.now() - disposeStart;

  const unloadStart = performance.now();
  await InjectionContainer.unload(RsXExpressionParserModule);
  phase.injectionUnloadMs = performance.now() - unloadStart;

  const profileSummary = summarizeProfile(createProfile);

  const phaseTotal =
    phase.injectionLoadMs +
    phase.definitionBuildMs +
    phase.createExpressionsMs +
    phase.initialResolutionMs +
    phase.singleMutationPropagationMs +
    phase.disposeMs +
    phase.injectionUnloadMs;

  const payload = {
    config: {
      source,
      expressionCount: expressionStrings.length,
      requestedCount: count,
      waitTimeoutMs,
      initializedCount,
      changedCount,
    },
    phase: {
      fileReadMs,
      injectionLoadMs: phase.injectionLoadMs,
      definitionBuildMs: phase.definitionBuildMs,
      createExpressionsMs: phase.createExpressionsMs,
      initialResolutionMs: phase.initialResolutionMs,
      singleMutationPropagationMs: phase.singleMutationPropagationMs,
      disposeMs: phase.disposeMs,
      injectionUnloadMs: phase.injectionUnloadMs,
      totalMs: phaseTotal,
    },
    profile: {
      totalProfileMs: profileSummary.totalProfileMs,
      totalHits: profileSummary.totalHits,
      topRsx: profileSummary.rsxHotspots.slice(0, 10),
    },
  };

  if (json) {
    console.log(JSON.stringify(payload));
    return;
  }

  console.log('\n=== Config ===');
  console.log(
    JSON.stringify({
      source,
      expressionCount: expressionStrings.length,
      requestedCount: count,
      waitTimeoutMs,
      initializedCount,
      changedCount,
    }),
  );

  console.log('\n=== Phase Breakdown (ms) ===');
  console.table([
    { phase: 'injectionLoad', ms: phase.injectionLoadMs.toFixed(2) },
    { phase: 'definitionBuild', ms: phase.definitionBuildMs.toFixed(2) },
    { phase: 'createExpressions', ms: phase.createExpressionsMs.toFixed(2) },
    { phase: 'initialResolution', ms: phase.initialResolutionMs.toFixed(2) },
    {
      phase: 'singleMutationPropagation',
      ms: phase.singleMutationPropagationMs.toFixed(2),
    },
    { phase: 'dispose', ms: phase.disposeMs.toFixed(2) },
    { phase: 'injectionUnload', ms: phase.injectionUnloadMs.toFixed(2) },
    { phase: 'total', ms: phaseTotal.toFixed(2) },
  ]);

  console.log('\n=== CPU Hotspots During createExpressions ===');
  console.log(
    `profileDurationMs=${profileSummary.totalProfileMs.toFixed(2)} totalHits=${profileSummary.totalHits}`,
  );
  console.table(
    profileSummary.allHotspots.map((entry) => ({
      selfMs: entry.selfMs.toFixed(2),
      hits: entry.hits,
      frame: entry.frame,
    })),
  );

  console.log('\n=== RS-X / RxJS Hotspots During createExpressions ===');
  console.table(
    profileSummary.rsxHotspots.map((entry) => ({
      selfMs: entry.selfMs.toFixed(2),
      hits: entry.hits,
      frame: entry.frame,
    })),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
