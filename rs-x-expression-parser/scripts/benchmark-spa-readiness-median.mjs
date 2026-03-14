import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..');
const reportsDirectory = path.resolve(
  repoRoot,
  'reports',
  'rsx-spa-performance',
);
const benchmarkScript = path.resolve(__dirname, 'benchmark-spa-readiness.mjs');
const dateStamp = new Date().toISOString().slice(0, 10);
const latestRunPath = path.resolve(
  reportsDirectory,
  `benchmark-${dateStamp}.json`,
);

const runsArg = process.argv.find((arg) => arg.startsWith('--runs='));
const runs = Math.max(
  1,
  Number.isFinite(Number(runsArg?.split('=')[1]))
    ? Number(runsArg.split('=')[1])
    : 5,
);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const runBenchmarkOnce = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--expose-gc', '--max-old-space-size=4096', benchmarkScript],
      {
        cwd: packageRoot,
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Benchmark run failed with exit code ${code}`));
    });
  });

const buildCountMap = (section) =>
  new Map(section.map((entry) => [entry.count, entry.medianMs]));

const aggregateSection = (runSections, selector, counts) => {
  const selected = runSections.map((sections) => buildCountMap(selector(sections)));
  return counts.map((count) => {
    const perRunMediansMs = selected.map((countMap) => countMap.get(count));
    return {
      count,
      medianOfRunMediansMs: median(perRunMediansMs),
      minRunMedianMs: Math.min(...perRunMediansMs),
      maxRunMedianMs: Math.max(...perRunMediansMs),
      perRunMediansMs,
    };
  });
};

await fs.mkdir(reportsDirectory, { recursive: true });

const runFiles = [];
const runResults = [];

for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
  console.log(`\n[median-bench] run ${runIndex}/${runs}`);
  await runBenchmarkOnce();

  const runFile = path.resolve(
    reportsDirectory,
    `benchmark-${dateStamp}-median-run-${runIndex}.json`,
  );
  await fs.copyFile(latestRunPath, runFile);
  runFiles.push(runFile);

  const runJson = JSON.parse(await fs.readFile(runFile, 'utf-8'));
  runResults.push(runJson);
}

const first = runResults[0];
const sections = runResults.map((run) => run.sections);
const aggregated = {
  parse: aggregateSection(
    sections,
    (section) => section.parse,
    first.config.parseCounts,
  ),
  bind: {
    uniqueExpressionPerBinding: aggregateSection(
      sections,
      (section) => section.bind.uniqueExpressionPerBinding,
      first.config.bindCounts,
    ),
    cachedExpressionString: aggregateSection(
      sections,
      (section) => section.bind.cachedExpressionString,
      first.config.bindCounts,
    ),
  },
  update: {
    singleMutationWithActiveBindings: aggregateSection(
      sections,
      (section) => section.update.singleMutationWithActiveBindings,
      first.config.updateCounts,
    ),
    bulkMutateAllBindings: aggregateSection(
      sections,
      (section) => section.update.bulkMutateAllBindings,
      first.config.updateCounts,
    ),
  },
};

const medianReport = {
  generatedAt: new Date().toISOString(),
  runs,
  environment: first.environment,
  config: first.config,
  sourceRuns: runFiles.map((file) => path.relative(repoRoot, file)),
  aggregated,
};

const outputPath = path.resolve(
  reportsDirectory,
  `benchmark-${dateStamp}-${runs}run-median.json`,
);
await fs.writeFile(outputPath, `${JSON.stringify(medianReport, null, 2)}\n`, 'utf-8');

const line = (value) => `${value.toFixed(3)}`;
const markdown = [
  '# RS-X SPA benchmark median-of-runs report',
  '',
  `Date: ${dateStamp}`,
  `Runs: ${runs}`,
  '',
  '## Parse',
  '',
  '| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |',
  '| --- | ---: | ---: | ---: |',
  ...aggregated.parse.map(
    (entry) =>
      `| ${entry.count.toLocaleString()} | ${line(entry.medianOfRunMediansMs)} | ${line(entry.minRunMedianMs)} | ${line(entry.maxRunMedianMs)} |`,
  ),
  '',
  '## Bind',
  '',
  '### Unique expression per binding',
  '',
  '| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |',
  '| --- | ---: | ---: | ---: |',
  ...aggregated.bind.uniqueExpressionPerBinding.map(
    (entry) =>
      `| ${entry.count.toLocaleString()} | ${line(entry.medianOfRunMediansMs)} | ${line(entry.minRunMedianMs)} | ${line(entry.maxRunMedianMs)} |`,
  ),
  '',
  '### Cached expression string',
  '',
  '| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |',
  '| --- | ---: | ---: | ---: |',
  ...aggregated.bind.cachedExpressionString.map(
    (entry) =>
      `| ${entry.count.toLocaleString()} | ${line(entry.medianOfRunMediansMs)} | ${line(entry.minRunMedianMs)} | ${line(entry.maxRunMedianMs)} |`,
  ),
  '',
  '## Update',
  '',
  '### Single mutation with active bindings',
  '',
  '| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |',
  '| --- | ---: | ---: | ---: |',
  ...aggregated.update.singleMutationWithActiveBindings.map(
    (entry) =>
      `| ${entry.count.toLocaleString()} | ${line(entry.medianOfRunMediansMs)} | ${line(entry.minRunMedianMs)} | ${line(entry.maxRunMedianMs)} |`,
  ),
  '',
  '### Bulk mutate all bindings',
  '',
  '| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |',
  '| --- | ---: | ---: | ---: |',
  ...aggregated.update.bulkMutateAllBindings.map(
    (entry) =>
      `| ${entry.count.toLocaleString()} | ${line(entry.medianOfRunMediansMs)} | ${line(entry.minRunMedianMs)} | ${line(entry.maxRunMedianMs)} |`,
  ),
  '',
].join('\n');

const markdownPath = path.resolve(
  reportsDirectory,
  `benchmark-${dateStamp}-${runs}run-median.md`,
);
await fs.writeFile(markdownPath, `${markdown}\n`, 'utf-8');

console.log(`\nSaved median JSON report to: ${outputPath}`);
console.log(`Saved median Markdown report to: ${markdownPath}`);
