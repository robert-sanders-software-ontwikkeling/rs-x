import inspector from 'node:inspector';
import { performance } from 'node:perf_hooks';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import type { IExpressionCache } from '../../lib/expression-cache/expression-cache.type';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionParser } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

type ProfileNode = {
  callFrame?: {
    functionName?: string;
    url?: string;
    lineNumber?: number;
  };
  hitCount?: number;
};

type CpuProfile = {
  startTime: number;
  endTime: number;
  nodes?: ProfileNode[];
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function loadGeneratedExpressionStrings(maxCount: number): string[] {
  return generatedBenchmarkExpressionStrings.slice(0, maxCount);
}

function formatCallFrame(node: ProfileNode): string {
  const functionName = node.callFrame?.functionName || '(anonymous)';
  const url = node.callFrame?.url || '(native)';
  const lineNumber =
    typeof node.callFrame?.lineNumber === 'number'
      ? node.callFrame.lineNumber + 1
      : 0;
  return `${functionName} @ ${url}:${lineNumber}`;
}

async function postAsync(
  session: inspector.Session,
  method: string,
  params?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return await new Promise((resolvePromise, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolvePromise((result ?? {}) as Record<string, unknown>);
    });
  });
}

async function withCpuProfile<T>(
  work: () => Promise<T>,
): Promise<{ output: T; profile: CpuProfile }> {
  const shouldEnableCpuProfile =
    process.env.RSX_BENCHMARK_ENABLE_CPU_PROFILE === 'true';
  if (!shouldEnableCpuProfile) {
    const startTime = Date.now() * 1000;
    const output = await work();
    const endTime = Date.now() * 1000;
    return {
      output,
      profile: {
        startTime,
        endTime,
        nodes: [],
      },
    };
  }

  const session = new inspector.Session();
  session.connect();
  try {
    await postAsync(session, 'Profiler.enable');
    await postAsync(session, 'Profiler.start');
    const output = await work();
    const result = await postAsync(session, 'Profiler.stop');
    await postAsync(session, 'Profiler.disable');
    return {
      output,
      profile: result.profile as CpuProfile,
    };
  } finally {
    session.disconnect();
  }
}

describe('Generated benchmark bottleneck profiling', () => {
  beforeAll(async () => {
    jest.setTimeout(180000);
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('profiles create/bind bottlenecks for same-model expressions', async () => {
    const defaultCount = process.env.CI ? 300 : 1000;
    const count = readPositiveIntegerEnv(
      'RSX_BENCHMARK_MAX_COUNT',
      defaultCount,
    );
    const expressionStrings = loadGeneratedExpressionStrings(count);
    expect(expressionStrings.length).toBeGreaterThan(0);

    const expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    ) as IExpressionFactory;
    const expressionCache = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    ) as IExpressionCache;
    const expressionParser = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    ) as IExpressionParser;
    const stateManager = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IStateManager,
    ) as IStateManager;

    let watchStateCalls = 0;
    let watchStateMs = 0;
    let cacheCreateCalls = 0;
    let cacheCreateMs = 0;
    let parseCalls = 0;
    let parseMs = 0;

    const originalWatchState = stateManager.watchState.bind(stateManager);
    const originalCacheCreate = expressionCache.create.bind(expressionCache);
    const originalParse = expressionParser.parse.bind(expressionParser);

    stateManager.watchState = (
      context: unknown,
      index: unknown,
      options?: { indexWatchRule?: unknown; ownerId?: unknown },
    ): unknown => {
      const start = performance.now();
      const result = originalWatchState(
        context,
        index,
        options as Parameters<IStateManager['watchState']>[2],
      );
      watchStateCalls += 1;
      watchStateMs += performance.now() - start;
      return result;
    };

    expressionCache.create = (
      data: string,
    ): {
      referenceCount: number;
      instance: ReturnType<IExpressionCache['create']>['instance'];
      id: string;
    } => {
      const start = performance.now();
      const result = originalCacheCreate(data);
      cacheCreateCalls += 1;
      cacheCreateMs += performance.now() - start;
      return result;
    };

    expressionParser.parse = (expression: string) => {
      const start = performance.now();
      const result = originalParse(expression);
      parseCalls += 1;
      parseMs += performance.now() - start;
      return result;
    };

    try {
      const model = { x: 7, y: 8 };
      const { output: expressions, profile } = await withCpuProfile(
        async () => {
          const created = expressionStrings.map((expressionString) =>
            expressionFactory.create(model, expressionString),
          );
          return created;
        },
      );

      const initStart = performance.now();
      await Promise.all(
        expressions.map((expression) =>
          expression.value !== undefined
            ? Promise.resolve()
            : new WaitForEvent(expression, 'changed').wait(emptyFunction),
        ),
      );
      const initMs = performance.now() - initStart;

      for (let i = 0; i < expressions.length; i += 1) {
        expressions[i].dispose();
      }

      const nodes = profile.nodes ?? [];
      const totalProfileMs = (profile.endTime - profile.startTime) / 1000;
      const totalHits = nodes.reduce(
        (sum, node) => sum + (node.hitCount ?? 0),
        0,
      );
      const msPerHit = totalHits > 0 ? totalProfileMs / totalHits : 0;
      const hotspots = nodes
        .map((node) => {
          const hits = node.hitCount ?? 0;
          return {
            hits,
            selfMs: hits * msPerHit,
            frame: formatCallFrame(node),
            url: node.callFrame?.url ?? '',
          };
        })
        .filter((entry) => entry.hits > 0)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 20);

      const rsxHotspots = hotspots.filter(
        (entry) =>
          entry.url.includes('/rs-x-') ||
          entry.url.includes('/@rs-x/') ||
          entry.url.includes('/rxjs/'),
      );

      if (process.env.RSX_BENCHMARK_LOG !== 'false') {
        console.log(
          `[bottleneck] count=${expressionStrings.length} watchStateCalls=${watchStateCalls} watchStateMs=${Number(
            watchStateMs.toFixed(2),
          )} cacheCreateCalls=${cacheCreateCalls} cacheCreateMs=${Number(
            cacheCreateMs.toFixed(2),
          )} parseCalls=${parseCalls} parseMs=${Number(
            parseMs.toFixed(2),
          )} initMs=${Number(initMs.toFixed(2))} profileTotalMs=${Number(
            totalProfileMs.toFixed(2),
          )}`,
        );
        console.table(
          rsxHotspots.map((entry) => ({
            hits: entry.hits,
            selfMs: Number(entry.selfMs.toFixed(2)),
            frame: entry.frame,
          })),
        );
      }
    } finally {
      stateManager.watchState = originalWatchState;
      expressionCache.create = originalCacheCreate;
      expressionParser.parse = originalParse;
    }
  });
});
