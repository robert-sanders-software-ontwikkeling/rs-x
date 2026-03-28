import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { MemoryUsageTabs } from './memory-usage-tabs.client';
import {
  benchmarkMachine,
  bindingStressGcEvidenceRows,
  bindingPerformanceRows,
  comparisonRows,
  memoryUsageRows,
  parseCachePerformanceRows,
  parsePerformanceRows,
  sharedIdentifierBindingRows,
  topGainsForReleaseNotes,
  topRegressionsForReleaseNotes,
  updatePerformanceRows,
} from './performance-report.data';
import { PerformanceBarChart } from './performance-report-charts.client';
import {
  BindingPerformanceTable,
  ParseCachePerformanceTable,
  ParsePerformanceTable,
  UpdatePerformanceTable,
} from './performance-report-tables.client';

export const metadata = {
  title: 'Performance report',
  description:
    'Parse, bind, update, and memory benchmarks for rs-x expression runtime.',
};

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

const sharedBindingAt10000 = sharedIdentifierBindingRows.find(
  (row) => row.expressionCount === 10000,
);

const bindUniqueAt10000 = bindingPerformanceRows.find(
  (row) => row.bindings === 10000,
);

const sharedVsUniqueFactor =
  sharedBindingAt10000 && bindUniqueAt10000
    ? bindUniqueAt10000.bindUniqueMs / sharedBindingAt10000.totalMs
    : undefined;

const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

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
        Latest core benchmark snapshot with direct old-vs-new deltas for parse,
        bind, update, and memory.
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
          <p className="cardText">
            Compared snapshots:{' '}
            <span className="codeInline">{benchmarkMachine.oldReport}</span> →{' '}
            <span className="codeInline">{benchmarkMachine.newReport}</span>.
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
            value. This happens once per bound expression, not on every update.
            In the core benchmark script, <em>Bind unique</em> uses one wide
            model with unique identifier pairs per binding (
            <span className="codeInline">x0 + y0 ... xN + yN</span>), while{' '}
            <em>Bind same expression</em> uses the same expression string (
            <span className="codeInline">a + b</span>) across many row models.
            The first is a stress shape; the second is closer to typical table
            workloads.
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
          <h2 className="cardTitle">Old vs new summary</h2>
          <p className="cardText">
            The list below is ordered so release notes can call out the biggest
            wins first and then the biggest regressions.
          </p>
          <p className="cardText">
            <strong>Top gains</strong>
          </p>
          <ol className="cardText">
            {topGainsForReleaseNotes.map((row) => (
              <li key={`gain-${row.metric}`}>
                <span className="codeInline">{row.metric}</span>: old{' '}
                <span className="codeInline">{row.oldValue.toFixed(3)}</span>{' '}
                {row.unit} → new{' '}
                <span className="codeInline">{row.newValue.toFixed(3)}</span>{' '}
                {row.unit} ({formatPercent(row.gainPercent)})
              </li>
            ))}
          </ol>
          <p className="cardText">
            <strong>Top regressions</strong>
          </p>
          <ol className="cardText">
            {topRegressionsForReleaseNotes.map((row) => (
              <li key={`regression-${row.metric}`}>
                <span className="codeInline">{row.metric}</span>: old{' '}
                <span className="codeInline">{row.oldValue.toFixed(3)}</span>{' '}
                {row.unit} → new{' '}
                <span className="codeInline">{row.newValue.toFixed(3)}</span>{' '}
                {row.unit} ({formatPercent(row.gainPercent)})
              </li>
            ))}
          </ol>
          <p className="cardText">
            <strong>Selected comparison points</strong>
          </p>
          <ol className="cardText">
            {comparisonRows.map((row) => (
              <li key={`comparison-${row.metric}`}>
                <span className="codeInline">{row.metric}</span>: old{' '}
                <span className="codeInline">{row.oldValue.toFixed(3)}</span>{' '}
                {row.unit} → new{' '}
                <span className="codeInline">{row.newValue.toFixed(3)}</span>{' '}
                {row.unit} ({formatPercent(row.gainPercent)})
              </li>
            ))}
          </ol>
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
        <p className="cardText">
          Note: <span className="codeInline">bindUnique</span> in this chart is
          a stress case with mostly non-shared identifier paths.
        </p>
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
          Why stress-case binding can look non-linear
        </h2>
        <p className="cardText">
          The <span className="codeInline">bindUnique</span> stress scenario is
          intentionally allocation-heavy (many unique identifier paths on a
          wide model). At larger sizes this becomes GC- and memory-pressure
          bound, so wall-clock bind time grows faster than a simple linear
          compute curve.
        </p>
        <p className="cardText">
          Evidence from a focused local run (3 median samples per size) shows
          heap, RSS, and forced-GC time rising rapidly with binding count:
        </p>
        <p className="cardText">
          The 10,000 row is from a separate single-run measurement using{' '}
          <span className="codeInline">--max-old-space-size=8192</span> to make
          the upper bound explicit.
        </p>
        <table className="docsTable">
          <thead>
            <tr>
              <th>Bindings</th>
              <th>Bind median (ms)</th>
              <th>Dispose median (ms)</th>
              <th>Forced GC median (ms)</th>
              <th>Heap after median (MB)</th>
              <th>RSS after median (MB)</th>
            </tr>
          </thead>
          <tbody>
            {bindingStressGcEvidenceRows.map((row) => (
              <tr key={`stress-gc-${row.expressionCount}`}>
                <td>{row.expressionCount.toLocaleString()}</td>
                <td>{row.bindMedianMs.toFixed(2)}</td>
                <td>{row.disposeMedianMs.toFixed(2)}</td>
                <td>{row.gcMedianMs.toFixed(2)}</td>
                <td>{row.heapAfterMedianMb.toFixed(2)}</td>
                <td>{row.rssAfterMedianMb.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cardText">
          Interpretation: non-linearity in this stress shape is expected under
          memory pressure and does not contradict near-linear behavior for the
          shared-identifiers scenario.
        </p>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Realistic shared-identifiers binding scenario
        </h2>
        <p className="cardText">
          This scenario binds many expressions to one model while reusing only
          10 identifiers across all bindings. It validates shared-watch
          behavior and avoids quadratic watch registration growth.
        </p>
        <p className="cardText">
          Source:{' '}
          <span className="codeInline">
            rs-x-expression-parser/tests/performance/shared-watch-scaling.test.ts
          </span>
        </p>
        {sharedVsUniqueFactor !== undefined ? (
          <p className="cardText">
            At 10,000 bindings, this shared scenario is about{' '}
            <span className="codeInline">
              {sharedVsUniqueFactor.toFixed(1)}x
            </span>{' '}
            faster than the core report&apos;s{' '}
            <span className="codeInline">bindUnique</span> stress shape.
          </p>
        ) : null}
        <table className="docsTable">
          <thead>
            <tr>
              <th>Expressions</th>
              <th>Shared identifiers</th>
              <th>watchState calls</th>
              <th>New subscriptions</th>
              <th>Total bind time (ms)</th>
              <th>ms per expression</th>
            </tr>
          </thead>
          <tbody>
            {sharedIdentifierBindingRows.map((row) => (
              <tr key={`shared-${row.expressionCount}`}>
                <td>{row.expressionCount.toLocaleString()}</td>
                <td>{row.sharedIdentifierCount}</td>
                <td>{row.watchStateCalls}</td>
                <td>{row.newSubscriptions}</td>
                <td>{row.totalMs.toFixed(2)}</td>
                <td>{row.msPerExpression.toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
