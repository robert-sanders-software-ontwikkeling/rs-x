import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { MemoryUsageTabs } from './memory-usage-tabs.client';
import {
  benchmarkMachine,
  bindingStressGcEvidenceRows,
  bindingPerformanceRows,
  compiledBindingPerformanceRows,
  compiledUpdatePerformanceRows,
  comparisonRows,
  expressionEngineModeBenchmark,
  expressionEngineModeAsyncRows,
  expressionEngineModeComparisonRows,
  expressionEngineModeMemoryRows,
  expressionEngineModeSameModelRow,
  expressionEngineModeSyncRows,
  identifierOnlyBindingPerformanceRows,
  memoryUsageRows,
  parseCachePerformanceRows,
  parsePerformanceRows,
  sharedIdentifierBindingRows,
  updatePerformanceRows,
} from './performance-report.data';
import { PerformanceBarChart } from './performance-report-charts.client';
import {
  BindingPerformanceTable,
  ParseCachePerformanceTable,
  ParsePerformanceTable,
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

const bindUniqueChartRows = bindingPerformanceRows.map((row, i) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  xValue: row.bindings,
  values: {
    treeMs: row.bindUniqueMs,
    compiledMs: compiledBindingPerformanceRows[i].bindUniqueMs,
  },
}));

const bindSameChartRows = bindingPerformanceRows.map((row, i) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  xValue: row.bindings,
  values: {
    treeMs: row.bindSameExpressionMs,
    compiledMs: compiledBindingPerformanceRows[i].bindSameExpressionMs,
  },
}));

const bulkUpdateChartRows = updatePerformanceRows.map((row, i) => ({
  label: `${row.bindings.toLocaleString()} bindings`,
  xValue: row.bindings,
  values: {
    treeMs: row.bulkUpdateMs,
    compiledMs: compiledUpdatePerformanceRows[i].bulkUpdateMs,
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
  return value >= 0
    ? `${value.toFixed(1)}% faster`
    : `${Math.abs(value).toFixed(1)}% slower`;
};

const formatSpeedChange = (gainPercent: number): string =>
  gainPercent >= 0
    ? `${gainPercent.toFixed(1)}% faster`
    : `${Math.abs(gainPercent).toFixed(1)}% slower`;

const compiledVsTreePercent = (compiledMs: number, treeMs: number): number =>
  ((treeMs - compiledMs) / treeMs) * 100;

const expressionEngineModeGroups = expressionEngineModeComparisonRows.reduce<
  Array<{
    scenario: string;
    bindings: number;
    rows: typeof expressionEngineModeComparisonRows;
  }>
>((groups, row) => {
  const key = `${row.scenario}-${row.bindings}`;
  const existing = groups.find(
    (group) => `${group.scenario}-${group.bindings}` === key,
  );
  if (existing) {
    existing.rows.push(row);
    return groups;
  }

  groups.push({
    scenario: row.scenario,
    bindings: row.bindings,
    rows: [row],
  });
  return groups;
}, []);

const expressionEngineModeMemoryGroups = expressionEngineModeMemoryRows.reduce<
  Array<{
    scenario: string;
    bindings: number;
    rows: typeof expressionEngineModeMemoryRows;
  }>
>((groups, row) => {
  const key = `${row.scenario}-${row.bindings}`;
  const existing = groups.find(
    (group) => `${group.scenario}-${group.bindings}` === key,
  );
  if (existing) {
    existing.rows.push(row);
    return groups;
  }

  groups.push({
    scenario: row.scenario,
    bindings: row.bindings,
    rows: [row],
  });
  return groups;
}, []);

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
        {benchmarkMachine.newVersion} rewrites the parser and the expression
        engine. Parsing is up to 87% faster. Live updates are 60–70% faster.
        Memory at scale is roughly halved. One tradeoff: calling{' '}
        <span className="codeInline">rsx(expr)(model)</span> many times in a
        tight loop costs more than it did in v1 — because v2 does more work
        upfront per binding. This page explains why, and shows when it matters.
      </p>

      {/* ── 1. Parsing ─────────────────────────────────── */}
      <article className="card docsApiCard">
        <h2 className="cardTitle">Parsing: up to 87% faster</h2>
        <p className="cardText">
          Every expression string goes through the parser once. The result is
          cached, and every subsequent binding that uses the same string just
          clones the cached AST. So parse speed is mainly a cold-start cost —
          first page load, server-side render, initial hydration.
        </p>
        <p className="cardText">
          In {benchmarkMachine.oldVersion}, parsing a single identifier like{' '}
          <span className="codeInline">count</span> took 5.5 µs. In{' '}
          {benchmarkMachine.newVersion} it takes 0.7 µs. Small expressions gain
          the most because the old parser had a fixed overhead that dominated the
          tiny amount of actual work. Larger expressions still improve: a 63-node
          formula drops from 44 µs to 36 µs, 20% faster. Both engine modes share
          the same parser, so these numbers apply equally to compiled and tree.
        </p>
        <ParsePerformanceTable rows={parsePerformanceRows} />
        <p className="cardText" style={{ marginTop: '0.75rem' }}>
          After the first parse, every binding that uses the same expression
          string clones the cached result. In tree mode, clone cost grows with
          expression size — more nodes to copy. In compiled mode, clone cost is
          nearly flat regardless of size, because the compiled function is shared
          and only lightweight binding metadata gets duplicated.
        </p>
        <ParseCachePerformanceTable rows={parseCachePerformanceRows} />
      </article>

      {/* ── 2. Binding ─────────────────────────────────── */}
      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Binding: more work upfront, faster from that point on
        </h2>
        <p className="cardText">
          Binding connects an expression to a model and starts watching for
          changes. It happens when you call{' '}
          <span className="codeInline">rsx(expression)(model)</span>. This is
          where{' '}
          {benchmarkMachine.newVersion} shows its main tradeoff.
        </p>
        <p className="cardText">
          Take a data table with 1,000 rows, each bound to the same expression{' '}
          <span className="codeInline">a + b</span> on its own row model.{' '}
          {benchmarkMachine.oldVersion} set that up in about 25 ms.{' '}
          {benchmarkMachine.newVersion} takes 43–46 ms. An extra 18 ms.
        </p>
        <p className="cardText">
          The reason: {benchmarkMachine.oldVersion} deferred per-model setup
          work (watcher registration, evaluate-manager initialisation) to the
          first time each binding was read. Binding 1,000 rows was 1,000 cheap
          AST clones and little else. {benchmarkMachine.newVersion} does that
          setup synchronously at bind time — so 1,000 rows means 1,000 full
          setups immediately at bind time. Each binding arrives fully initialised and
          every subsequent update can start immediately without lazy-init checks.
        </p>
        <p className="cardText">
          <strong>The payback is fast.</strong> Bulk update at 1,000 bindings
          drops from 7.9 ms in {benchmarkMachine.oldVersion} to 2.4–2.9 ms —
          saving 5–5.5 ms on every update cycle. The 18 ms extra is recovered
          after 3–4 updates. Any live table that re-renders when
          data changes will cross that threshold within seconds.
        </p>
        <p className="cardText">
          At 10,000 rows, the picture changes further. Compiled mode bind same
          takes 441 ms vs {benchmarkMachine.oldVersion}&apos;s 638 ms — the
          shared compiled plan amortises per-binding setup cost at scale, and
          bind same is now{' '}
          <strong>31% faster than {benchmarkMachine.oldVersion}</strong>. Tree
          mode at 10,000 is still slower to bind, but its bulk-update saving
          (73 ms vs 146 ms) recovers that cost within two update cycles.
        </p>
        <BindingPerformanceTable rows={bindingPerformanceRows} />
        <p className="cardText" style={{ marginTop: '0.5rem' }}>
          These are tree mode numbers. Compiled mode bind same at 1,000 is
          slightly higher (46 ms); at 10,000 it reverses to 441 ms. Full
          compiled vs tree comparison is in the reference section below.
        </p>
      </article>

      {/* ── 3. Updates ─────────────────────────────────── */}
      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Updates: the 60–70% improvement that matters most
        </h2>
        <p className="cardText">
          After binding, updates are where your application spends most of its time. A field
          changes, rs-x notifies only the expressions that read that field, and
          subscribers receive new values. Two scenarios to understand:
        </p>
        <p className="cardText">
          <strong>One field on one row.</strong> The cost is O(1) — it does not
          grow with how many total bindings are active. The true per-update cost
          is around 0.5 µs at every binding count. The numbers in the table
          below vary because{' '}
          <span className="codeInline">performance.now()</span> is unreliable
          for sub-millisecond single-shot measurements at this scale; the actual
          work is constant and near-instantaneous.
        </p>
        <p className="cardText">
          <strong>One field changes on every row (bulk update).</strong> This is
          the core metric for live data tables. At 1,000 bindings,{' '}
          {benchmarkMachine.oldVersion} needed 7.9 ms;{' '}
          {benchmarkMachine.newVersion} needs 2.4–2.9 ms. At 10,000 bindings:
          146 ms down to 61–73 ms. Two changes drive this: shared watchers (one
          watcher per model field instead of one per expression, so a single
          field change propagates through one path instead of fanning out to
          duplicates) and inline binary evaluation (recalculating{' '}
          <span className="codeInline">a + b</span> reads both operands directly
          with no intermediate array allocation per recalculation).
        </p>
        <PerformanceBarChart
          ariaLabel="Bulk update performance chart — tree vs compiled"
          rows={bulkUpdateChartRows}
          series={[
            {
              key: 'treeMs',
              label: 'Tree',
              barClassName: 'isPrimary',
            },
            {
              key: 'compiledMs',
              label: 'Compiled',
              barClassName: 'isSecondary',
            },
          ]}
          valueUnit="ms"
          decimals={3}
          xAxisLabel="Active bindings"
          yAxisLabel="Bulk update time (ms)"
          xScale="log"
          yScale="log"
        />
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Tree bulk update (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled bulk update (ms)</th>
            </tr>
          </thead>
          <tbody>
            {updatePerformanceRows.map((row, i) => (
              <tr key={`upd-${row.bindings}`}>
                <td>{row.bindings.toLocaleString()}</td>
                <td>{row.bulkUpdateMs.toFixed(3)}</td>
                <td>{compiledUpdatePerformanceRows[i].bulkUpdateMs.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      {/* ── 4. Engine mode ─────────────────────────────── */}
      <article className="card docsApiCard">
        <h2 className="cardTitle">Compiled or tree mode — use compiled</h2>
        <p className="cardText">
          rs-x ships two runtime engine modes:{' '}
          <span className="codeInline">compiled</span> (default) and{' '}
          <span className="codeInline">tree</span>. For most applications the
          choice is straightforward: compiled.
        </p>
        <p className="cardText">
          For everyday bindings — a field name, a simple calculation, an async
          value — the two modes are within a few percent of each other.
          Sometimes tree is marginally faster, sometimes compiled is. The real
          difference shows with <em>same-model generated expressions</em>: 1,000
          unique, dynamically built expression strings all bound to the same
          model. Compiled mode is 97% faster to bind (12 ms vs 358 ms) and 91%
          faster on bulk update (35 ms vs 393 ms). Each unique expression is
          compiled once to a native JS function; that function is then shared
          across all bindings of that expression. Tree mode reconstructs a full
          node tree per binding.
        </p>
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Scenario</th>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Metric</th>
              <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
              <th style={{ textAlign: 'left' }}>Tree (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled vs tree</th>
            </tr>
          </thead>
          <tbody>
            {expressionEngineModeGroups.flatMap((group) =>
              group.rows.map((row, index) => (
                <tr key={`mode-${group.scenario}-${group.bindings}-${row.metric}`}>
                  {index === 0 && (
                    <td rowSpan={group.rows.length}>{group.scenario}</td>
                  )}
                  {index === 0 && (
                    <td rowSpan={group.rows.length}>
                      {group.bindings.toLocaleString()}
                    </td>
                  )}
                  <td>{row.metric}</td>
                  <td>{row.compiledMs.toFixed(3)}</td>
                  <td>{row.treeMs.toFixed(3)}</td>
                  <td>{formatPercent(row.improvementPercent)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        <p className="cardText" style={{ marginTop: '0.75rem' }}>
          Memory tells the same story. For simple identifier bindings both modes
          use roughly the same amount of memory — there is no meaningful
          difference. For generated expressions it is a different picture:
          compiled mode uses 515 MB at 1,000 bindings, tree mode uses 1,500 MB.
          Tree mode keeps a full copy of the expression node structure for every
          binding. Compiled mode compiles each unique expression to a JS function
          once and shares that function across all bindings of the same
          expression — so memory does not grow proportionally with binding count.
        </p>
        <p className="cardText">
          For a detailed breakdown of exactly where the two modes cross over as
          expression complexity grows, see{' '}
          <Link href="/docs/core-concepts/compiled-vs-tree">
            Compiled vs tree: the break-even point
          </Link>
          .
        </p>
      </article>

      {/* ── 5. Cleanup ─────────────────────────────────── */}
      <article className="card docsApiCard">
        <h2 className="cardTitle">Cleanup: O(N) and predictable</h2>
        <p className="cardText">
          When you dispose a set of bindings, rs-x walks the binding graph in
          one pass and releases every watcher and subscriber. The underlying
          storage uses a <span className="codeInline">Map</span>, so each
          removal is O(1) and the total cost for N bindings is O(N). No manual
          teardown is needed in application code.
        </p>
        <p className="cardText">
          Per-binding dispose cost holds at 0.03–0.04 ms across all measured
          scales. Disposing 10,000 bindings takes around 300–400 ms in the
          worst case — the worst case being the allocation-heavy
          unique-expression scenario where every binding has its own independent
          watcher. In a real table where many rows watch the same field, the
          shared watcher is released once regardless of how many bindings used
          it, so dispose is cheaper still.
        </p>
        <table className="docsTable">
          <thead>
            <tr>
              <th>Bindings</th>
              <th>Dispose median (ms)</th>
              <th>ms / binding</th>
            </tr>
          </thead>
          <tbody>
            {bindingStressGcEvidenceRows.slice(0, 4).map((row) => (
              <tr key={`dispose-${row.expressionCount}`}>
                <td>{row.expressionCount.toLocaleString()}</td>
                <td>{row.disposeMedianMs.toFixed(2)}</td>
                <td>
                  {(row.disposeMedianMs / row.expressionCount).toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      {/* ── 6. Perspective ─────────────────────────────── */}
      <article className="card docsApiCard">
        <h2 className="cardTitle">Putting the numbers in perspective</h2>
        <p className="cardText">
          The benchmarks deliberately go to extremes — thousands of bindings all
          triggered at once. Real applications look very different. A typical
          form or detail page has 20–100 bindings. A data table with 100 rows
          and 5 bound columns has 500 bindings. At those scales, bind cost is in
          single-digit milliseconds and update cost is sub-millisecond — both
          comfortably inside the 100 ms threshold where users start to notice lag.
        </p>
        <p className="cardText">
          The bind-same regression scales proportionally with row count. The
          extra ~18 ms is for 1,000 rows. For 100 rows it is around 2 ms. For a
          50-row table it is under 1 ms. If your tables are paginated or
          virtualised, you are never binding thousands of rows simultaneously —
          the regression does not apply at all.
        </p>
        <p className="cardText">
          The one scenario where {benchmarkMachine.oldVersion} has an edge: a
          large table that renders once and never receives data updates. There,
          v1&apos;s deferred setup was genuinely cheaper and{' '}
          {benchmarkMachine.newVersion} offers no advantage. Any table whose
          data can change crosses the payback threshold quickly and runs faster
          on every subsequent update.
        </p>
        <p className="cardText">
          rs-x tracks dependencies through plain model assignment:
        </p>
        <pre className="codeBlock">{`model.price = 42;`}</pre>
        <p className="cardText">
          No subscriptions to manage, no lifecycle hooks, no explicit
          invalidation. Async values —{' '}
          <span className="codeInline">Observable</span>,{' '}
          <span className="codeInline">Promise</span>,{' '}
          <span className="codeInline">BehaviorSubject</span> — resolve
          transparently into expression values. The numbers above measure the
          runtime cost of all of that working automatically.
        </p>
      </article>

      {/* ── Reference ──────────────────────────────────── */}
      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Machine and run conditions</h2>
          <p className="cardText">
            Machine:{' '}
            <span className="codeInline">{benchmarkMachine.cpu}</span>,{' '}
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
            Run flags:{' '}
            <span className="codeInline">
              node --expose-gc --max-old-space-size=4096
            </span>
            .{' '}
            <span className="codeInline">--expose-gc</span> lets the benchmark
            force a full GC between samples so heap measurements reflect only
            the scenario under test.
          </p>
          <p className="cardText">
            Compared snapshots:{' '}
            <span className="codeInline">{benchmarkMachine.oldReport}</span> →{' '}
            <span className="codeInline">{benchmarkMachine.newReport}</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">
            {benchmarkMachine.oldVersion} vs {benchmarkMachine.newVersion} —
            all comparison points
          </h2>
          <p className="cardText">
            <strong>Parse</strong>
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                <th style={{ textAlign: 'left' }}>
                  {benchmarkMachine.oldVersion}
                </th>
                <th style={{ textAlign: 'left' }}>
                  {benchmarkMachine.newVersion}
                </th>
                <th style={{ textAlign: 'left' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows
                .filter((row) => row.metric.startsWith('Parse'))
                .map((row) => (
                  <tr key={`ref-parse-${row.metric}`}>
                    <td>{row.metric}</td>
                    <td>
                      {row.oldValue.toFixed(3)} {row.unit}
                    </td>
                    <td>
                      {row.newValue.toFixed(3)} {row.unit}
                    </td>
                    <td>{formatSpeedChange(row.gainPercent)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '1rem' }}>
            <strong>Bind &amp; update</strong>
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                <th style={{ textAlign: 'left' }}>
                  {benchmarkMachine.oldVersion}
                </th>
                <th style={{ textAlign: 'left' }}>
                  {benchmarkMachine.newVersion} (tree)
                </th>
                <th style={{ textAlign: 'left' }}>
                  {benchmarkMachine.newVersion} (compiled)
                </th>
                <th style={{ textAlign: 'left' }}>Change (tree)</th>
                <th style={{ textAlign: 'left' }}>Change (compiled)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows
                .filter((row) => !row.metric.startsWith('Parse'))
                .map((row) => (
                  <tr key={`ref-bind-${row.metric}`}>
                    <td>{row.metric}</td>
                    <td>
                      {row.oldValue.toFixed(3)} {row.unit}
                    </td>
                    <td>
                      {row.newValue.toFixed(3)} {row.unit}
                    </td>
                    <td>
                      {row.compiledNewValue.toFixed(3)} {row.unit}
                    </td>
                    <td>{formatSpeedChange(row.gainPercent)}</td>
                    <td>
                      {formatSpeedChange(
                        ((row.oldValue - row.compiledNewValue) /
                          row.oldValue) *
                          100,
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </article>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Parse performance — full chart</h2>
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
          Parse cache behavior — full chart
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
          Bind unique — tree vs compiled
        </h2>
        <p className="cardText">
          Every binding uses a different expression on its own model — no parse
          cache hits, maximum allocation pressure. The stress case.
        </p>
        <PerformanceBarChart
          ariaLabel="Bind unique performance — tree vs compiled"
          rows={bindUniqueChartRows}
          series={[
            { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
            { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
          ]}
          valueUnit="ms"
          decimals={3}
          xAxisLabel="Active bindings"
          yAxisLabel="Bind time (ms)"
          xScale="log"
          yScale="log"
        />
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Tree (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled vs tree</th>
            </tr>
          </thead>
          <tbody>
            {bindingPerformanceRows.map((row, i) => (
              <tr key={`bu-${row.bindings}`}>
                <td>{row.bindings.toLocaleString()}</td>
                <td>{row.bindUniqueMs.toFixed(3)}</td>
                <td>{compiledBindingPerformanceRows[i].bindUniqueMs.toFixed(3)}</td>
                <td>
                  {formatPercent(
                    compiledVsTreePercent(
                      compiledBindingPerformanceRows[i].bindUniqueMs,
                      row.bindUniqueMs,
                    ),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Bind same — tree vs compiled
        </h2>
        <p className="cardText">
          One expression string bound to N different row models — the realistic
          table scenario. This is where the 10,000-row compiled crossover is
          visible: compiled mode starts faster than v1 while tree mode is still
          slower.
        </p>
        <PerformanceBarChart
          ariaLabel="Bind same performance — tree vs compiled"
          rows={bindSameChartRows}
          series={[
            { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
            { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
          ]}
          valueUnit="ms"
          decimals={3}
          xAxisLabel="Active bindings"
          yAxisLabel="Bind time (ms)"
          xScale="log"
          yScale="log"
        />
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Tree (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled vs tree</th>
            </tr>
          </thead>
          <tbody>
            {bindingPerformanceRows.map((row, i) => (
              <tr key={`bs-${row.bindings}`}>
                <td>{row.bindings.toLocaleString()}</td>
                <td>{row.bindSameExpressionMs.toFixed(3)}</td>
                <td>{compiledBindingPerformanceRows[i].bindSameExpressionMs.toFixed(3)}</td>
                <td>
                  {formatPercent(
                    compiledVsTreePercent(
                      compiledBindingPerformanceRows[i].bindSameExpressionMs,
                      row.bindSameExpressionMs,
                    ),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Bulk update — tree vs compiled</h2>
        <p className="cardText">
          One field changes on every row simultaneously. This is the most
          meaningful update metric for live data tables. Single update cost is
          O(1) and approximately 0.5 µs regardless of binding count — too small
          and too noisy to chart meaningfully.
        </p>
        <PerformanceBarChart
          ariaLabel="Bulk update performance — tree vs compiled"
          rows={bulkUpdateChartRows}
          series={[
            { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
            { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
          ]}
          valueUnit="ms"
          decimals={3}
          xAxisLabel="Active bindings"
          yAxisLabel="Bulk update time (ms)"
          xScale="log"
          yScale="log"
        />
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Tree bulk update (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled bulk update (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled vs tree</th>
            </tr>
          </thead>
          <tbody>
            {updatePerformanceRows.map((row, i) => (
              <tr key={`bulk-${row.bindings}`}>
                <td>{row.bindings.toLocaleString()}</td>
                <td>{row.bulkUpdateMs.toFixed(3)}</td>
                <td>{compiledUpdatePerformanceRows[i].bulkUpdateMs.toFixed(3)}</td>
                <td>
                  {formatPercent(
                    compiledVsTreePercent(
                      compiledUpdatePerformanceRows[i].bulkUpdateMs,
                      row.bulkUpdateMs,
                    ),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Same-model generated expressions (compiled vs tree)
        </h2>
        <p className="cardText">
          This scenario binds 1,000 generated expressions to the same model
          object. Each expression is a long arithmetic chain — roughly 60–120+
          nodes, repeatedly using{' '}
          <span className="codeInline">x</span> and{' '}
          <span className="codeInline">y</span>. Representative shape:{' '}
          <span className="codeInline">
            (((x + y) + ((x + y) + n) - a) * b) / ((x + y) + c)
          </span>{' '}
          repeated many times in one expression string. This is the scenario
          where compiled mode has its largest advantage.
        </p>
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Metric</th>
              <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
              <th style={{ textAlign: 'left' }}>Tree (ms)</th>
              <th style={{ textAlign: 'left' }}>Compiled vs tree</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{expressionEngineModeSameModelRow.bindings.toLocaleString()}</td>
              <td>Bind</td>
              <td>
                {expressionEngineModeSameModelRow.compiled.bindMs.toFixed(3)}
              </td>
              <td>
                {expressionEngineModeSameModelRow.tree.bindMs.toFixed(3)}
              </td>
              <td>
                {formatPercent(
                  compiledVsTreePercent(
                    expressionEngineModeSameModelRow.compiled.bindMs,
                    expressionEngineModeSameModelRow.tree.bindMs,
                  ),
                )}
              </td>
            </tr>
            <tr>
              <td>{expressionEngineModeSameModelRow.bindings.toLocaleString()}</td>
              <td>Dispose</td>
              <td>
                {expressionEngineModeSameModelRow.compiled.disposeMs.toFixed(3)}
              </td>
              <td>
                {expressionEngineModeSameModelRow.tree.disposeMs.toFixed(3)}
              </td>
              <td>
                {formatPercent(
                  compiledVsTreePercent(
                    expressionEngineModeSameModelRow.compiled.disposeMs,
                    expressionEngineModeSameModelRow.tree.disposeMs,
                  ),
                )}
              </td>
            </tr>
            <tr>
              <td>{expressionEngineModeSameModelRow.bindings.toLocaleString()}</td>
              <td>Single update</td>
              <td>
                {expressionEngineModeSameModelRow.compiled.singleUpdateMs.toFixed(
                  3,
                )}
              </td>
              <td>
                {expressionEngineModeSameModelRow.tree.singleUpdateMs.toFixed(3)}
              </td>
              <td>
                {formatPercent(
                  compiledVsTreePercent(
                    expressionEngineModeSameModelRow.compiled.singleUpdateMs,
                    expressionEngineModeSameModelRow.tree.singleUpdateMs,
                  ),
                )}
              </td>
            </tr>
            <tr>
              <td>{expressionEngineModeSameModelRow.bindings.toLocaleString()}</td>
              <td>Bulk update</td>
              <td>
                {expressionEngineModeSameModelRow.compiled.bulkUpdateMs.toFixed(
                  3,
                )}
              </td>
              <td>
                {expressionEngineModeSameModelRow.tree.bulkUpdateMs.toFixed(3)}
              </td>
              <td>
                {formatPercent(
                  compiledVsTreePercent(
                    expressionEngineModeSameModelRow.compiled.bulkUpdateMs,
                    expressionEngineModeSameModelRow.tree.bulkUpdateMs,
                  ),
                )}
              </td>
            </tr>
          </tbody>
        </table>
        <h3 className="cardTitle" style={{ marginTop: '1.25rem' }}>
          Heap usage (compiled vs tree)
        </h3>
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Scenario</th>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Metric</th>
              <th style={{ textAlign: 'left' }}>Compiled (MB)</th>
              <th style={{ textAlign: 'left' }}>Tree (MB)</th>
            </tr>
          </thead>
          <tbody>
            {expressionEngineModeMemoryGroups.flatMap((group) =>
              group.rows.map((row, index) => (
                <tr key={`heap-${group.scenario}-${group.bindings}-${row.metric}`}>
                  {index === 0 && (
                    <td rowSpan={group.rows.length}>{group.scenario}</td>
                  )}
                  {index === 0 && (
                    <td rowSpan={group.rows.length}>
                      {group.bindings.toLocaleString()}
                    </td>
                  )}
                  <td>{row.metric}</td>
                  <td>{row.compiledHeapMedianMb.toFixed(1)}</td>
                  <td>{row.treeHeapMedianMb.toFixed(1)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        <h3 className="cardTitle" style={{ marginTop: '1.25rem' }}>
          Peak RSS (compiled vs tree)
        </h3>
        <table className="docsTable">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Scenario</th>
              <th style={{ textAlign: 'left' }}>Bindings</th>
              <th style={{ textAlign: 'left' }}>Metric</th>
              <th style={{ textAlign: 'left' }}>Compiled (MB)</th>
              <th style={{ textAlign: 'left' }}>Tree (MB)</th>
            </tr>
          </thead>
          <tbody>
            {expressionEngineModeMemoryGroups.flatMap((group) =>
              group.rows.map((row, index) => (
                <tr key={`rss-${group.scenario}-${group.bindings}-${row.metric}`}>
                  {index === 0 && (
                    <td rowSpan={group.rows.length}>{group.scenario}</td>
                  )}
                  {index === 0 && (
                    <td rowSpan={group.rows.length}>
                      {group.bindings.toLocaleString()}
                    </td>
                  )}
                  <td>{row.metric}</td>
                  <td>{row.compiledPeakRssMb.toFixed(1)}</td>
                  <td>{row.treePeakRssMb.toFixed(1)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">
          Identifier-only binding (most common real-world pattern)
        </h2>
        <p className="cardText">
          The most common binding in a real app is a single identifier —{' '}
          <span className="codeInline">row.status</span>,{' '}
          <span className="codeInline">user.name</span> — bound to its own model
          object. Each expression is a single-node tree: no operators, no member
          chains. This is the simplest and cheapest case.
        </p>
        <table className="docsTable">
          <thead>
            <tr>
              <th>Bindings</th>
              <th>Bind (ms)</th>
              <th>Bind+initialize (ms)</th>
              <th>Single update (ms)</th>
              <th>Bulk update (ms)</th>
              <th>µs / binding</th>
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
                <td>{((row.bindMs / row.bindings) * 1000).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Shared-identifier binding scenario</h2>
        <p className="cardText">
          In practice, many expressions across many rows read the same small set
          of model fields. This scenario binds N expressions to one model while
          reusing only 10 identifiers across all bindings. It validates
          shared-watch behaviour: regardless of how many bindings are added,
          only 10 watcher subscriptions are ever created.
        </p>
        {sharedVsUniqueFactor !== undefined ? (
          <p className="cardText">
            At 10,000 bindings this shared scenario is about{' '}
            <span className="codeInline">
              {sharedVsUniqueFactor.toFixed(1)}x
            </span>{' '}
            faster than the unique-identifier stress case.
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
        <h2 className="cardTitle">Memory usage</h2>
        <MemoryUsageTabs rows={memoryUsageRows} />
      </article>
    </DocsPageTemplate>
  );
}
