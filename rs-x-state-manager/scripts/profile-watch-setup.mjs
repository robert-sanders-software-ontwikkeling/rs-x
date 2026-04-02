import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  RsXStateManagerInjectionTokens,
  RsXStateManagerModule,
  unloadRsXStateManagerModule,
} from '../dist/index.js';

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

const iterations = readPositiveIntegerEnv('RSX_WATCH_SETUP_ITERATIONS', 5);
const loops = readPositiveIntegerEnv('RSX_WATCH_SETUP_LOOPS', 20000);

class Model {
  constructor(value) {
    this.a = value;
  }
}

const scenarios = [
  {
    label: 'plain-object',
    index: 'a',
    createContext: (value) => ({ a: value }),
  },
  {
    label: 'class-instance',
    index: 'a',
    createContext: (value) => new Model(value),
  },
  {
    label: 'array-index',
    index: 0,
    createContext: (value) => [value, value + 1],
  },
  {
    label: 'map-key',
    index: 'a',
    createContext: (value) => new Map([['a', value]]),
  },
  {
    label: 'date-year',
    index: 'year',
    createContext: () => new Date(2021, 2, 3),
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
      : (sorted[middle] ?? 0);
  return { min, max, mean, median };
}

async function main() {
  await InjectionContainer.load(RsXStateManagerModule);
  const stateManager = InjectionContainer.get(
    RsXStateManagerInjectionTokens.IStateManager,
  );
  const canGc = typeof globalThis.gc === 'function';

  for (const scenario of scenarios) {
    const times = [];
    for (let i = 0; i < iterations; i += 1) {
      if (canGc) {
        globalThis.gc();
      }
      const start = performance.now();
      for (let j = 0; j < loops; j += 1) {
        const context = scenario.createContext(j);
        stateManager.watchState(context, scenario.index);
        stateManager.releaseState(context, scenario.index);
      }
      times.push(performance.now() - start);
    }

    const stats = summarize(times);
    console.log(
      `[watch-setup-${scenario.label}] iterations=${iterations} loops=${loops} minMs=${stats.min.toFixed(2)} medianMs=${stats.median.toFixed(2)} meanMs=${stats.mean.toFixed(2)} maxMs=${stats.max.toFixed(2)}`,
    );
  }

  await unloadRsXStateManagerModule();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
