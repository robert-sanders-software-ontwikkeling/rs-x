import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { MemoryUsageTabs } from './memory-usage-tabs.client';
import { PerformanceBarChart } from './performance-report-charts.client';
import {
  type BindingPerformanceRow,
  BindingPerformanceTable,
  type MemoryUsageRow,
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
  benchmarkScript:
    'rs-x-expression-parser/scripts/benchmark-core-concepts-performance.mjs',
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
          <Link
            className="btn btnGhost"
            href="/docs/core-concepts/performance-demo"
          >
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
            <span className="codeInline">
              {benchmarkMachine.benchmarkScript}
            </span>
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">What this report means</h2>
          <p className="cardText">
            <strong>Parse</strong> measures how long rs-x takes to read an
            expression string and build its internal node tree. Parse cost grows
            sub-linearly with expression size — a 63-node expression takes about
            8× longer than a 1-node expression, not 63×.
          </p>
          <p className="cardText">
            <strong>Parse cache</strong> measures expression creation cost in a
            real app. The first time a string like{' '}
            <span className="codeInline">a + b</span> is used, rs-x parses it
            and caches a template tree. Every subsequent binding using that same
            string skips parsing and only clones the cached tree — 3–8× faster
            depending on expression size. In a table with 1,000 rows sharing the
            same column expressions, only the first row parses; the rest clone.
          </p>
          <p className="cardText">
            <strong>Binding</strong> measures first-time setup: rs-x attaches an
            expression to a specific model object and computes its initial
            value. This happens once per bound expression, not on every update.{' '}
            <em>Bind unique</em> binds each expression to a different model
            object. <em>Bind same expression</em> reuses the same parsed
            expression tree cloned across all bindings.
          </p>
          <p className="cardText">
            <strong>Single update</strong> changes one field on one model and
            measures how long rs-x takes to propagate that change. Only the
            expressions that actually read the changed field are recalculated —
            all other bindings in the graph are untouched. This is the common
            case when a user edits one cell in a table.
          </p>
          <p className="cardText">
            <strong>Bulk update</strong> changes a field on every model at once
            and measures total recalculation time across all bindings. This is
            the worst-case scenario: every bound expression must be recalculated
            in one pass. In practice this path is taken on full data reloads.
          </p>
          <p className="cardText">
            <strong>Memory</strong> shows median heap and peak RSS recorded
            while each scenario runs. Heap is the JavaScript-managed memory; RSS
            includes all process memory such as the V8 runtime and native
            buffers. In all benchmark scenarios the expression is{' '}
            <span className="codeInline">a + b</span>. More complex expressions
            with more nodes or async values will use proportionally more memory.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Conclusion</h2>
          <p className="cardText">
            <strong>Single updates are effectively free.</strong> Regardless of
            how many bindings are active — 1,000 or 10,000 — a single field
            change propagates in <span className="codeInline">~0.09 ms</span>.
            rs-x only recalculates the expressions that depend on the changed
            field; the rest of the graph is not touched.
          </p>
          <p className="cardText">
            <strong>
              Parse cache makes repeated expression strings nearly free.
            </strong>{' '}
            Clone-only creation costs{' '}
            <span className="codeInline">0.64–27 µs</span> versus{' '}
            <span className="codeInline">5.5–81 µs</span> for a full parse, a
            3–8× saving. In a table where every row uses the same column
            expression, only the first row pays the parse cost.
          </p>
          <p className="cardText">
            <strong>
              Binding setup is a one-time cost, not a recurring one.
            </strong>{' '}
            At <span className="codeInline">1,000</span> bindings setup takes
            roughly <span className="codeInline">35 ms</span> — imperceptible
            during a page load. At <span className="codeInline">10,000</span>{' '}
            bindings it is about <span className="codeInline">0.5–0.6 s</span>,
            still paid once, not on every render.
          </p>
          <p className="cardText">
            <strong>Bulk update scales linearly and is predictable.</strong> At
            10,000 bindings a full recalculation of every expression takes{' '}
            <span className="codeInline">~146 ms</span>, which is roughly{' '}
            <span className="codeInline">14.6 µs</span> per expression. This
            path only runs on a full data reload; incremental changes remain
            fast.
          </p>
          <p className="cardText">
            <strong>Memory is the practical limit at large scales.</strong> At{' '}
            <span className="codeInline">1,000</span> bindings heap usage is
            around <span className="codeInline">125–230 MB</span>; at{' '}
            <span className="codeInline">10,000</span> it reaches roughly{' '}
            <span className="codeInline">2.4–3.3 GB</span>. Most real UIs stay
            well below 5,000 simultaneously active bindings. For large tables,
            mount only visible rows and dispose bindings when they leave the
            viewport — this keeps memory flat regardless of dataset size.
          </p>
          <p className="cardText">
            <strong>Table model example.</strong> With{' '}
            <span className="codeInline">x</span> rows and{' '}
            <span className="codeInline">y</span> column expressions, active
            bindings are <span className="codeInline">x × y</span> and parse
            operations are roughly <span className="codeInline">y</span> (each
            column expression is parsed once, then cloned). A table of{' '}
            <span className="codeInline">1,000</span> rows ×{' '}
            <span className="codeInline">10</span> columns produces{' '}
            <span className="codeInline">10,000</span> active bindings: setup
            ~0.5 s once, single-cell updates ~0.09 ms, full bulk reload ~146 ms.
          </p>
        </article>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Parse performance</h2>
        <PerformanceBarChart
          ariaLabel="Parse performance chart in microseconds per operation by node count"
          rows={parseChartRows}
          series={[
            {
              key: 'usPerOperation',
              label: 'Parse us/op',
              barClassName: 'isPrimary',
            },
          ]}
          valueUnit="us"
          decimals={2}
          xAxisLabel="Expression size (node count)"
          yAxisLabel="Cost (us/op)"
        />
        <ParsePerformanceTable rows={parsePerformanceRows} />
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Parse cache behavior (parse+clone vs clone-only)
        </h2>
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
        <h2 className="cardTitle">
          Binding performance (initial full evaluation)
        </h2>
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
        <MemoryUsageTabs rows={memoryUsageRows} />
      </article>
    </DocsPageTemplate>
  );
}
