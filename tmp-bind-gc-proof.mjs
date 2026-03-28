import { performance } from 'node:perf_hooks';
import { InjectionContainer } from '@rs-x/core';
import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

function makeUniqueExpressions(count) {
  return Array.from({ length: count }, (_, i) => 'x' + i + ' + y' + i);
}

function makeWideModel(count) {
  const model = {};
  for (let i = 0; i < count; i += 1) {
    model['x' + i] = i;
    model['y' + i] = i * 2;
  }
  return model;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

await InjectionContainer.load(RsXExpressionParserModule);

const sizes = [1000, 2000, 3000, 4000];
for (const count of sizes) {
  const runs = [];
  for (let r = 0; r < 3; r += 1) {
    global.gc?.();
    const before = process.memoryUsage();

    const model = makeWideModel(count);
    const expressions = makeUniqueExpressions(count);

    const t0 = performance.now();
    const created = [];
    for (let i = 0; i < expressions.length; i += 1) {
      created.push(rsx(expressions[i])(model));
    }
    const t1 = performance.now();

    for (const expression of created) {
      expression.dispose();
    }
    const t2 = performance.now();

    const gc0 = performance.now();
    global.gc?.();
    const gc1 = performance.now();

    const after = process.memoryUsage();
    runs.push({
      bindMs: t1 - t0,
      disposeMs: t2 - t1,
      gcMs: gc1 - gc0,
      heapBeforeMb: before.heapUsed / 1024 / 1024,
      heapAfterMb: after.heapUsed / 1024 / 1024,
      rssAfterMb: after.rss / 1024 / 1024,
    });
  }

  console.log(
    JSON.stringify(
      {
        count,
        bindMedianMs: median(runs.map((x) => x.bindMs)),
        disposeMedianMs: median(runs.map((x) => x.disposeMs)),
        gcMedianMs: median(runs.map((x) => x.gcMs)),
        heapAfterMedianMb: median(runs.map((x) => x.heapAfterMb)),
        rssAfterMedianMb: median(runs.map((x) => x.rssAfterMb)),
      },
      null,
      2,
    ),
  );
}
