import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { MemoryUsageTabs } from './memory-usage-tabs.client';
import {
  benchmarkMachine,
  bindingStressGcEvidenceRows,
  bindingPerformanceRows,
  comparisonRows,
  identifierOnlyBindingPerformanceRows,
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
  xValue: row.nodeCount,
  values: { usPerOperation: row.usPerOperation },
}));

const parseCacheChartRows = parseCachePerformanceRows.map((row) => ({
  label: `${row.nodeCount} nodes`,
  xValue: row.nodeCount,
  values: {
    parseAndCloneUs: row.parseAndCloneUsPerOperation,
    cloneOnlyUs: row.cloneOnlyUsPerOperation,
  },
}));

const bindingChartRows = bindingPerformanceRows.map((row) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  xValue: row.bindings,
  values: {
    bindUniqueMs: row.bindUniqueMs,
    bindSameExpressionMs: row.bindSameExpressionMs,
  },
}));

const updateChartRows = updatePerformanceRows.map((row) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  xValue: row.bindings,
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
        Latest core benchmark snapshot with direct {benchmarkMachine.oldVersion}
        {' '}vs {benchmarkMachine.newVersion} deltas for parse, bind, update,
        and memory.
      </p>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          What changed in {benchmarkMachine.newVersion}
        </h2>
        <p className="cardText">
          The following optimisations were introduced between{' '}
          {benchmarkMachine.oldVersion} and {benchmarkMachine.newVersion}.
          Each entry explains what changed and why it improves the numbers.
        </p>
        <ul className="cardText">
          <li>
            <strong>Expression parse cache.</strong> Already present in{' '}
            {benchmarkMachine.oldVersion} — an expression string is parsed
            exactly once, stored as a cached template, and every subsequent
            binding clones that template instead of re-parsing. In a table with
            1,000 rows sharing the same column expression only the first row
            parses; the other 999 clone. Clone is 1.2–1.8× faster than
            parse+clone in {benchmarkMachine.newVersion} — the gap narrowed
            compared to earlier versions because the new parser is much faster.
            What {benchmarkMachine.newVersion} improves is the clone path
            itself (see below), making each clone cheaper than before.
          </li>
          <li>
            <strong>Faster parser.</strong> The internal expression string
            parser was replaced with a faster JavaScript parser. This directly
            reduces the time spent in the parse step before any tree is built,
            improving parse throughput across all expression sizes. Gain ranges
            from <strong>+17.9%</strong> (63 nodes) to{' '}
            <strong>+85.4%</strong> (1 node), averaging{' '}
            <strong>~52%</strong> across all sizes tested. The gain is largest
            on small expressions because the parser overhead is proportionally
            bigger relative to the tree-building cost.
          </li>
          <li>
            <strong>One watch per model field.</strong> In{' '}
            {benchmarkMachine.oldVersion}, each expression binding registered
            its own watcher on every model field it read, even when another
            binding already watched the same field on the same model. In{' '}
            {benchmarkMachine.newVersion} a shared watch is reused — binding
            1,000 expressions that all read field{' '}
            <span className="codeInline">a</span> on their model results in
            one watcher on <span className="codeInline">a</span>, not 1,000. This reduces
            watchState registration calls, lowers memory from subscription
            objects, and means a field change triggers one notification path
            instead of fanning out through duplicate watchers.
          </li>
          <li>
            <strong>Clone path optimisation.</strong> The{' '}
            <span className="codeInline">AbstractExpression</span> constructor
            was changed from a rest-parameter spread{' '}
            <span className="codeInline">(...children)</span> to accepting a
            direct array, eliminating an intermediate array allocation on every
            node construction. Leaf nodes (identifiers, constants) now share a
            single static empty-children array instead of each allocating their
            own. Together these cut the per-clone allocation cost, which shows
            up in both parse and clone-only timings.
          </li>
          <li>
            <strong>Inline binary expression evaluation.</strong> The update
            hot path for binary expressions (
            <span className="codeInline">a + b</span>,{' '}
            <span className="codeInline">x &gt; y</span>, etc.) previously
            called a generic <span className="codeInline">.map()</span> over
            child values on every single recalculation, allocating a new array
            each time. {benchmarkMachine.newVersion} overrides{' '}
            <span className="codeInline">evaluate()</span> directly on{' '}
            <span className="codeInline">BinaryExpression</span> to read the
            two child values inline with no intermediate allocation. This is
            the primary driver of the ~14–33% bulk update improvement.
          </li>
          <li>
            <strong>Eager initialisation at bind time.</strong> Evaluate-manager
            setup and watcher registration now happen synchronously when an
            expression is bound rather than lazily on first use. Every
            subsequent clone, re-bind, and update finds the expression fully
            ready and skips the lazy-init check entirely. This is what enables
            the large-scale gains but is also the source of the{' '}
            <span className="codeInline">Bind same 1,000</span> small-scale
            regression — the upfront cost is paid once at bind time instead of
            being spread across later operations.
          </li>
        </ul>
      </article>

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
            sub-linearly with expression size — in {benchmarkMachine.newVersion}
            a 63-node expression takes about 45× longer than a 1-node
            expression, not the linear 63× (was 8× in {benchmarkMachine.oldVersion}).
            The ratio increased because the faster parser reduced
            small-expression cost by ~85% while large-expression cost improved
            by only ~18%.
          </p>
          <p className="cardText">
            <strong>Parse cache</strong> measures expression creation cost in a
            real app. The first time a string like{' '}
            <span className="codeInline">a + b</span> is used, rs-x parses it
            and caches a template tree. Every subsequent binding using that same
            string skips parsing and only clones the cached tree — 1.2–1.8×
            faster depending on expression size. The cache advantage is smaller
            in {benchmarkMachine.newVersion} than in earlier versions because
            the new parser is significantly faster, bringing parse cost closer
            to clone cost. In a table with 1,000 rows sharing the same column
            expressions, only the first row parses; the rest clone.
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
          <h2 className="cardTitle">{benchmarkMachine.oldVersion} vs {benchmarkMachine.newVersion} summary</h2>
          <p className="cardText">
            <strong>Top gains</strong>
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                <th style={{ textAlign: 'left' }}>{benchmarkMachine.oldVersion}</th>
                <th style={{ textAlign: 'left' }}>{benchmarkMachine.newVersion}</th>
                <th style={{ textAlign: 'left' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {topGainsForReleaseNotes.map((row) => (
                <tr key={`gain-${row.metric}`}>
                  <td>{row.metric}</td>
                  <td>{row.oldValue.toFixed(3)} {row.unit}</td>
                  <td>{row.newValue.toFixed(3)} {row.unit}</td>
                  <td>{formatPercent(row.gainPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '1.5rem' }}>
            <strong>Regressions</strong>
          </p>
          {topRegressionsForReleaseNotes.length === 0 ? (
            <p className="cardText">No regressions.</p>
          ) : (
            <table className="docsTable">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Metric</th>
                  <th style={{ textAlign: 'left' }}>{benchmarkMachine.oldVersion}</th>
                  <th style={{ textAlign: 'left' }}>{benchmarkMachine.newVersion}</th>
                  <th style={{ textAlign: 'left' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {topRegressionsForReleaseNotes.map((row) => (
                  <tr key={`regression-${row.metric}`}>
                    <td>{row.metric}</td>
                    <td>{row.oldValue.toFixed(3)} {row.unit}</td>
                    <td>{row.newValue.toFixed(3)} {row.unit}</td>
                    <td>{formatPercent(row.gainPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="cardText" style={{ marginTop: '1.5rem' }}>
            <strong>What this regression means and whether it matters</strong>
          </p>
          <p className="cardText">
            <span className="codeInline">Bind same 1,000</span> shows a
            small-scale regression. The latest {benchmarkMachine.newVersion}{' '}
            run measures 33.965 ms vs {benchmarkMachine.oldVersion}{' '}
            <span className="codeInline">25.4 ms</span> — a ~34% slowdown,
            though earlier runs of the same benchmark produced as high as
            49 ms, confirming that 1k binding results are noisy and sensitive
            to GC timing. The{' '}
            {benchmarkMachine.newVersion} binding path does more synchronous
            work per expression upfront — evaluate-manager setup and watcher
            registration that in {benchmarkMachine.oldVersion} happened lazily.
            One sample also spiked to 110 ms due to a GC pause triggered by the
            extra object allocation at this scale.
          </p>
          <p className="cardText">
            <strong>Why the change was made.</strong> In{' '}
            {benchmarkMachine.oldVersion}, evaluate-manager setup and watcher
            registration happened lazily — deferred to the first time an
            expression was actually used after binding. In{' '}
            {benchmarkMachine.newVersion} this work was moved to happen
            synchronously at bind time so that every subsequent operation
            (clone, re-bind, update) finds the expression already fully
            initialised and can skip the lazy-init check entirely. That is the
            source of the 8–34% update and large-scale bind gains: pay once at
            setup, save on every operation after.
          </p>
          <p className="cardText">
            <strong>Impact in practice: low.</strong> Binding 1,000 expressions
            in a single synchronous burst maps to rendering a table with 1,000
            rows all at once — an uncommon pattern in a real SPA where rows are
            typically paginated or virtualised. A typical page component binds
            tens to low hundreds of expressions, where the per-expression
            overhead of the extra upfront work is under 0.05 ms and completely
            imperceptible. The regression fully reverses at 5,000+ bindings
            (+8–34% faster) because the cache benefit and amortised
            initialisation outweigh the startup cost at scale. For any app that
            batch-binds large tables in one pass,{' '}
            {benchmarkMachine.newVersion} is the better choice above ~3,000
            rows; below that the extra ~24 ms is real but not user-visible
            (well under the 100 ms perception threshold for a one-time setup
            cost).
          </p>
          <p className="cardText">
            <span className="codeInline">Bind unique 1,000</span> at −8.2% is
            noise: raw samples span{' '}
            <span className="codeInline">30.9–56.9 ms</span>, making the 3 ms
            median delta meaningless.
          </p>
          <p className="cardText">
            <strong>Selected comparison points</strong>
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th>Metric</th>
                <th>{benchmarkMachine.oldVersion}</th>
                <th>{benchmarkMachine.newVersion}</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={`comparison-${row.metric}`}>
                  <td>{row.metric}</td>
                  <td>{row.oldValue.toFixed(3)} {row.unit}</td>
                  <td>{row.newValue.toFixed(3)} {row.unit}</td>
                  <td>{formatPercent(row.gainPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          xScale="log"
          yScale="log"
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
          xScale="log"
          yScale="log"
        />
        <ParseCachePerformanceTable rows={parseCachePerformanceRows} />
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Binding performance (initial full evaluation)
        </h2>
        <p className="cardText">
          Note: <span className="codeInline">bind unique</span> in this chart is
          a stress case with mostly non-shared identifier paths.
        </p>
        <PerformanceBarChart
          ariaLabel="Binding performance chart comparing unique bind and same-expression bind"
          rows={bindingChartRows}
          series={[
            {
              key: 'bindUniqueMs',
              label: 'Bind unique',
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
          xScale="log"
          yScale="log"
        />
        <BindingPerformanceTable rows={bindingPerformanceRows} />
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Why stress-case binding can look non-linear
        </h2>
        <p className="cardText">
          The <span className="codeInline">bind unique</span> stress scenario is
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
            <span className="codeInline">bind unique</span> stress shape.
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
          xScale="log"
          yScale="log"
        />
        <UpdatePerformanceTable rows={updatePerformanceRows} />
        <p className="cardText">
          What is recalculated here: bound expressions that read changed fields.
          In this benchmark, that means recalculating{' '}
          <span className="codeInline">a + b</span> for the row(s) where{' '}
          <span className="codeInline">a</span> changed.
        </p>
        <p className="cardText">
          <strong>Why single update appears to decline on the chart — and why
          that is a measurement artefact, not a real effect.</strong>
        </p>
        <p className="cardText">
          A dedicated proof script (
          <span className="codeInline">
            tmp-single-update-proof.mjs
          </span>
          ) tested three hypotheses:
        </p>
        <ul className="advancedTopicLinks">
          <li>
            <strong>Test 1 — JIT warmup:</strong> measured 1k single update with
            0, 5, 20, and 50 warmup rounds. Result: 0.0019 ms with 0 warmup,
            stabilising at 0.0009 ms after 5 rounds. JIT is a real but minor
            factor — it does not explain the 0.022 ms value seen in the
            benchmark data.
          </li>
          <li>
            <strong>Test 2 — timer resolution:</strong> ran 1,000 consecutive
            single updates in one timed block at 1k and 10k bindings. Result:
            0.0104 ms/update at 1k, 0.0033 ms/update at 10k. The 10k case is
            faster — the opposite of what scaling with binding count would
            produce. This confirms the individual measurements are dominated by
            timer granularity and scheduling noise, not by actual work.
          </li>
          <li>
            <strong>Test 3 — O(1) proof:</strong> ran 50 measured samples with
            30 warmup rounds at every binding count from 100 to 10,000. Result:
            median 0.0005–0.0006 ms at <em>every</em> size. The time is
            constant.
          </li>
        </ul>
        <p className="cardText">
          The true per-update cost is approximately <strong>0.5 µs</strong> and
          does not scale with binding count. The apparent decline in the chart
          is entirely a measurement artefact:{' '}
          <span className="codeInline">performance.now()</span> is unreliable
          for sub-millisecond single-shot measurements at this scale. Both the
          0.022 ms at 1k and the 0.002 ms at 3k–10k are noise — the actual
          work completes in under 1 µs regardless of how many bindings are
          active.
        </p>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Identifier-only binding (most common real-world pattern)
        </h2>
        <p className="cardText">
          The most common binding in a real SPA is a single identifier —
          binding one component field directly to one model property, for
          example <span className="codeInline">row.status</span> or{' '}
          <span className="codeInline">user.name</span>. Each expression is a
          single-node tree (no operators, no member chains) and each binding
          uses a unique identifier on its own model object. This is the
          simplest and cheapest case for rs-x.
        </p>
        <p className="cardText">
          The benchmark creates{' '}
          <span className="codeInline">field0 … fieldN</span> expressions, each
          bound to its own model{' '}
          <span className="codeInline">{'{ fieldN: value }'}</span>.
        </p>
        <table className="docsTable">
          <thead>
            <tr>
              <th>Bindings</th>
              <th>Bind (ms)</th>
              <th>Bind+initialize (ms)</th>
              <th>Single update (ms)</th>
              <th>Bulk update (ms)</th>
              <th>us / binding</th>
            </tr>
          </thead>
          <tbody>
            {identifierOnlyBindingPerformanceRows.map((row) => (
              <tr key={`id-only-${row.bindings}`}>
                <td>{row.bindings.toLocaleString()}</td>
                <td>{row.bindMs.toFixed(3)}</td>
                <td>{row.bindInitializedMs.toFixed(3)}</td>
                <td>{row.singleUpdateMs.toFixed(3)}</td>
                <td>{row.bulkUpdateMs.toFixed(3)}</td>
                <td>
                  {((row.bindMs / row.bindings) * 1000).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cardText" style={{ marginTop: '0.75rem' }}>
          <strong>Note on 100 and 500 rows:</strong> Bind+initialize appears
          lower than Bind for these counts. This is a JIT warmup artifact — the
          bind+initialize measurement runs after the bind measurement in the
          same process, so V8 has already compiled the hot paths and the second
          test runs faster. The 1,000+ rows are less affected because the longer
          absolute time masks the warmup difference. Use the 1,000+ rows for
          accurate bind vs bind+initialize comparisons.
        </p>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Memory usage</h2>
        <MemoryUsageTabs rows={memoryUsageRows} />
      </article>
    </DocsPageTemplate>
  );
}
