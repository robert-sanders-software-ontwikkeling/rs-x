import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { PerformanceBarChart } from './performance-report-charts.client';
import {
  type BindingPerformanceRow,
  BindingPerformanceTable,
  type MemoryUsageRow,
  MemoryUsageTable,
  type ParseCachePerformanceRow,
  ParseCachePerformanceTable,
  type ParsePerformanceRow,
  ParsePerformanceTable,
  type UpdatePerformanceRow,
  UpdatePerformanceTable,
} from './performance-report-tables.client';

export const metadata = {
  title: 'Performance report',
  description:
    'Parse, bind, update, and memory benchmarks for rs-x expression runtime.',
};

const benchmarkMachine = {
  cpu: 'Apple M4',
  memory: '16.0 GB RAM',
  platform: 'darwin/arm64',
  os: '24.6.0',
  node: 'v25.4.0',
  parseOperationsPerSample: 5000,
  benchmarkScript: 'rs-x-expression-parser/scripts/benchmark-core-concepts-performance.mjs',
};

const parsePerformanceRows: ParsePerformanceRow[] = [
  {
    nodeCount: 1,
    expressionShape: 'v0',
    medianMs: 27.41,
    usPerOperation: 5.48,
    opsPerSecond: 182414,
  },
  {
    nodeCount: 3,
    expressionShape: 'v0 + v1',
    medianMs: 34.964,
    usPerOperation: 6.99,
    opsPerSecond: 143003,
  },
  {
    nodeCount: 7,
    expressionShape: 'v0 + v1 + v2 + v3',
    medianMs: 52.618,
    usPerOperation: 10.52,
    opsPerSecond: 95025,
  },
  {
    nodeCount: 15,
    expressionShape: 'v0 + ... + v7',
    medianMs: 88.548,
    usPerOperation: 17.71,
    opsPerSecond: 56466,
  },
  {
    nodeCount: 31,
    expressionShape: 'v0 + ... + v15',
    medianMs: 125.867,
    usPerOperation: 25.17,
    opsPerSecond: 39724,
  },
  {
    nodeCount: 63,
    expressionShape: 'v0 + ... + v31',
    medianMs: 221.475,
    usPerOperation: 44.29,
    opsPerSecond: 22576,
  },
];

const parseCachePerformanceRows: ParseCachePerformanceRow[] = [
  {
    nodeCount: 1,
    parseAndCloneMs: 27.221,
    parseAndCloneUsPerOperation: 5.44,
    cloneOnlyMs: 3.181,
    cloneOnlyUsPerOperation: 0.64,
  },
  {
    nodeCount: 3,
    parseAndCloneMs: 55.063,
    parseAndCloneUsPerOperation: 11.01,
    cloneOnlyMs: 9.465,
    cloneOnlyUsPerOperation: 1.89,
  },
  {
    nodeCount: 7,
    parseAndCloneMs: 78.192,
    parseAndCloneUsPerOperation: 15.64,
    cloneOnlyMs: 18.68,
    cloneOnlyUsPerOperation: 3.74,
  },
  {
    nodeCount: 15,
    parseAndCloneMs: 116.379,
    parseAndCloneUsPerOperation: 23.28,
    cloneOnlyMs: 35.87,
    cloneOnlyUsPerOperation: 7.17,
  },
  {
    nodeCount: 31,
    parseAndCloneMs: 205.565,
    parseAndCloneUsPerOperation: 41.11,
    cloneOnlyMs: 76.122,
    cloneOnlyUsPerOperation: 15.22,
  },
  {
    nodeCount: 63,
    parseAndCloneMs: 404.932,
    parseAndCloneUsPerOperation: 80.99,
    cloneOnlyMs: 133.894,
    cloneOnlyUsPerOperation: 26.78,
  },
];

const bindingPerformanceRows: BindingPerformanceRow[] = [
  {
    bindings: 1000,
    bindUniqueMs: 35.092,
    bindSameExpressionMs: 25.444,
  },
  {
    bindings: 3000,
    bindUniqueMs: 121.675,
    bindSameExpressionMs: 123.711,
  },
  {
    bindings: 5000,
    bindUniqueMs: 235.588,
    bindSameExpressionMs: 228.468,
  },
  {
    bindings: 10000,
    bindUniqueMs: 521.444,
    bindSameExpressionMs: 638.054,
  },
];

const updatePerformanceRows: UpdatePerformanceRow[] = [
  {
    bindings: 1000,
    singleUpdateMs: 0.089,
    bulkUpdateMs: 7.904,
  },
  {
    bindings: 3000,
    singleUpdateMs: 0.077,
    bulkUpdateMs: 29.483,
  },
  {
    bindings: 5000,
    singleUpdateMs: 0.071,
    bulkUpdateMs: 55.091,
  },
  {
    bindings: 10000,
    singleUpdateMs: 0.107,
    bulkUpdateMs: 146.234,
  },
];

const memoryUsageRows: MemoryUsageRow[] = [
  { scenario: 'Parse (1 nodes)', medianHeapMb: 10.9, peakRssMb: 100.2 },
  { scenario: 'Parse (3 nodes)', medianHeapMb: 15.9, peakRssMb: 104.2 },
  { scenario: 'Parse (7 nodes)', medianHeapMb: 12.2, peakRssMb: 98.9 },
  { scenario: 'Parse (15 nodes)', medianHeapMb: 12.5, peakRssMb: 95.5 },
  { scenario: 'Parse (31 nodes)', medianHeapMb: 21.3, peakRssMb: 113.4 },
  { scenario: 'Parse (63 nodes)', medianHeapMb: 23.8, peakRssMb: 130.4 },
  { scenario: 'Bind unique (1,000)', medianHeapMb: 125.1, peakRssMb: 334.8 },
  {
    scenario: 'Bind same expression (1,000)',
    medianHeapMb: 210.9,
    peakRssMb: 420.3,
  },
  {
    scenario: 'Single update (1,000)',
    medianHeapMb: 225.7,
    peakRssMb: 425.6,
  },
  { scenario: 'Bulk update (1,000)', medianHeapMb: 230.1, peakRssMb: 426.6 },
  { scenario: 'Bind unique (3,000)', medianHeapMb: 519.9, peakRssMb: 830.9 },
  {
    scenario: 'Bind same expression (3,000)',
    medianHeapMb: 788.6,
    peakRssMb: 1090.9,
  },
  {
    scenario: 'Single update (3,000)',
    medianHeapMb: 853.2,
    peakRssMb: 1103,
  },
  { scenario: 'Bulk update (3,000)', medianHeapMb: 865.1, peakRssMb: 1104.9 },
  {
    scenario: 'Bind unique (5,000)',
    medianHeapMb: 1270.1,
    peakRssMb: 1522.9,
  },
  {
    scenario: 'Bind same expression (5,000)',
    medianHeapMb: 1639.8,
    peakRssMb: 1972.1,
  },
  {
    scenario: 'Single update (5,000)',
    medianHeapMb: 1731.6,
    peakRssMb: 1991.6,
  },
  { scenario: 'Bulk update (5,000)', medianHeapMb: 1751.3, peakRssMb: 2008.9 },
  {
    scenario: 'Bind unique (10,000)',
    medianHeapMb: 2445.2,
    peakRssMb: 2940.5,
  },
  {
    scenario: 'Bind same expression (10,000)',
    medianHeapMb: 3073.7,
    peakRssMb: 3030.8,
  },
  {
    scenario: 'Single update (10,000)',
    medianHeapMb: 3210.3,
    peakRssMb: 3439.3,
  },
  {
    scenario: 'Bulk update (10,000)',
    medianHeapMb: 3249.9,
    peakRssMb: 3505,
  },
];

const parseChartRows = parsePerformanceRows.map((row) => ({
  label: `${row.nodeCount} nodes`,
  values: {
    usPerOperation: row.usPerOperation,
  },
}));

const parseCacheChartRows = parseCachePerformanceRows.map((row) => ({
  label: `${row.nodeCount} nodes`,
  values: {
    parseAndCloneUs: row.parseAndCloneUsPerOperation,
    cloneOnlyUs: row.cloneOnlyUsPerOperation,
  },
}));

const bindingChartRows = bindingPerformanceRows.map((row) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  values: {
    bindUniqueMs: row.bindUniqueMs,
    bindSameExpressionMs: row.bindSameExpressionMs,
  },
}));

const updateChartRows = updatePerformanceRows.map((row) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  values: {
    singleUpdateMs: row.singleUpdateMs,
    bulkUpdateMs: row.bulkUpdateMs,
  },
}));

const memoryChartRows = memoryUsageRows.map((row) => ({
  label: row.scenario,
  values: {
    peakRssMb: row.peakRssMb,
  },
}));

export default function PerformanceReportCoreConceptPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div className="docsApiTitleBlock">
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance report' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Performance report</h1>
        </div>
        <div className="docsApiActions docsApiActionsTitle">
          <Link className="btn btnGhost" href="/docs/core-concepts/performance-demo">
            Open live demo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <p className="sectionLead docsApiLead">
        Baseline performance numbers for parse, bind, update, and memory under
        realistic binding scales.
      </p>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Machine and runtime</h2>
          <p className="cardText">
            Machine: <span className="codeInline">{benchmarkMachine.cpu}</span>,{' '}
            <span className="codeInline">{benchmarkMachine.memory}</span>,{' '}
            <span className="codeInline">{benchmarkMachine.platform}</span>, OS{' '}
            <span className="codeInline">{benchmarkMachine.os}</span>, Node{' '}
            <span className="codeInline">{benchmarkMachine.node}</span>.
          </p>
          <p className="cardText">
            Parse scenarios run{' '}
            <span className="codeInline">
              {benchmarkMachine.parseOperationsPerSample.toLocaleString()}
            </span>{' '}
            operations per sample and do not bind expressions to models.
          </p>
          <p className="cardText">
            Benchmark script:{' '}
            <span className="codeInline">{benchmarkMachine.benchmarkScript}</span>
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">What this report means</h2>
          <p className="cardText">
            Parse performance shows how long rs-x needs to read an expression
            string and build its internal tree.
          </p>
          <p className="cardText">
            Parse cache behavior explains expression creation: the first time an
            expression string is used, rs-x parses and caches a template tree.
            Next time that same string is used, rs-x reuses the cached template
            and only clones it instead of parsing again.
          </p>
          <p className="cardText">
            Binding performance shows first-time setup cost: rs-x attaches an
            expression to a model and computes the first value.
          </p>
          <p className="cardText">
            Update performance shows what happens after setup when data changes.
            rs-x recomputes only expressions affected by that change.
            Unaffected expressions are not recalculated.
          </p>
          <p className="cardText">
            In this benchmark, each row expression is{' '}
            <span className="codeInline">a + b</span>.
            For a single update, only one bound expression is recalculated.
            For a bulk update, every bound expression is recalculated once.
          </p>
          <p className="cardText">
            Memory usage shows typical heap usage and highest process memory
            (RSS) while these scenarios run.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Conclusion</h2>
          <p className="cardText">
            Performance is good for normal app sizes. In practice, many pages
            stay in the low hundreds to low thousands of active bindings at the
            same time.
          </p>
          <p className="cardText">
            Table model: with <span className="codeInline">x</span> rows and{' '}
            <span className="codeInline">y</span> column expressions, active
            bindings are about{' '}
            <span className="codeInline">x * y</span>.
            Parsing is usually close to{' '}
            <span className="codeInline">y</span>, because each expression
            string is parsed once and then cloned from cache for other rows.
          </p>
          <p className="cardText">
            Example: <span className="codeInline">1,000</span> rows ×{' '}
            <span className="codeInline">10</span> columns gives about{' '}
            <span className="codeInline">10,000</span> active bindings. In this
            benchmark, setup is roughly 0.5-0.7s once, single-row updates are
            still very fast, and full bulk updates are the expensive path.
          </p>
          <p className="cardText">
            Main limit at very large graphs is memory, not parsing. Keep only
            visible rows mounted and dispose inactive expressions.
          </p>
        </article>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Parse performance</h2>
        <PerformanceBarChart
          ariaLabel="Parse performance chart in microseconds per operation by node count"
          rows={parseChartRows}
          series={[
            { key: 'usPerOperation', label: 'Parse us/op', barClassName: 'isPrimary' },
          ]}
          valueUnit="us"
          decimals={2}
          xAxisLabel="Expression size (node count)"
          yAxisLabel="Cost (us/op)"
        />
        <ParsePerformanceTable rows={parsePerformanceRows} />
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Parse cache behavior (parse+clone vs clone-only)</h2>
        <PerformanceBarChart
          ariaLabel="Parse cache behavior chart comparing parse plus clone versus clone only"
          rows={parseCacheChartRows}
          series={[
            {
              key: 'parseAndCloneUs',
              label: 'Parse+clone us/op',
              barClassName: 'isPrimary',
            },
            {
              key: 'cloneOnlyUs',
              label: 'Clone-only us/op',
              barClassName: 'isSecondary',
            },
          ]}
          valueUnit="us"
          decimals={2}
          xAxisLabel="Expression size (node count)"
          yAxisLabel="Creation cost (us/op)"
        />
        <ParseCachePerformanceTable rows={parseCachePerformanceRows} />
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Binding performance (initial full evaluation)</h2>
        <PerformanceBarChart
          ariaLabel="Binding performance chart comparing unique bind and same-expression bind"
          rows={bindingChartRows}
          series={[
            {
              key: 'bindUniqueMs',
              label: 'Bind unique ms',
              barClassName: 'isPrimary',
            },
            {
              key: 'bindSameExpressionMs',
              label: 'Bind same-expression ms',
              barClassName: 'isSecondary',
            },
          ]}
          valueUnit="ms"
          decimals={3}
          xAxisLabel="Active bindings"
          yAxisLabel="Setup time (ms)"
        />
        <BindingPerformanceTable rows={bindingPerformanceRows} />
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Update performance (recalculate affected bound expressions)
        </h2>
        <PerformanceBarChart
          ariaLabel="Update performance chart comparing single update and bulk update"
          rows={updateChartRows}
          series={[
            {
              key: 'singleUpdateMs',
              label: 'Single update ms',
              barClassName: 'isPrimary',
            },
            {
              key: 'bulkUpdateMs',
              label: 'Bulk update ms',
              barClassName: 'isSecondary',
            },
          ]}
          valueUnit="ms"
          decimals={3}
          xAxisLabel="Active bindings"
          yAxisLabel="Update time (ms)"
        />
        <UpdatePerformanceTable rows={updatePerformanceRows} />
        <p className="cardText">
          What is recalculated here: bound expressions that read changed fields.
          In this benchmark, that means recalculating{' '}
          <span className="codeInline">a + b</span> for the row(s) where{' '}
          <span className="codeInline">a</span> changed.
        </p>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Memory usage</h2>
        <PerformanceBarChart
          ariaLabel="Memory usage chart showing peak RSS per scenario"
          rows={memoryChartRows}
          series={[
            { key: 'peakRssMb', label: 'Peak RSS MB', barClassName: 'isSecondary' },
          ]}
          valueUnit="mb"
          decimals={1}
          xAxisLabel="Scenario"
          yAxisLabel="Peak RSS (MB)"
        />
        <MemoryUsageTable rows={memoryUsageRows} />
      </article>
    </DocsPageTemplate>
  );
}
