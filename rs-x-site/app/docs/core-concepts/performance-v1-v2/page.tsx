import type { Metadata } from 'next';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import {
  benchmarkMachine,
  bindingPerformanceRows,
  comparisonRows,
  compiledBindingPerformanceRows,
  compiledUpdatePerformanceRows,
  parseCachePerformanceRows,
  parsePerformanceRows,
  updatePerformanceRows,
} from '../performance-report/performance-report.data';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

export const metadata: Metadata = {
  title: 'v1 vs v2 performance comparison',
  description:
    'Every benchmark metric compared between rs-x v1.0.0 and v2.0.0 — parsing, binding, updates, and memory.',
};

const parseChartRows = parsePerformanceRows.map((row, i) => ({
  label: String(row.nodeCount),
  xValue: row.nodeCount,
  values: {
    v2Ms: row.usPerOperation,
    v1Ms: [5.482, 6.993, 10.524, 17.71, 25.173, 44.295][i],
  },
}));

const bindUniqueChartRows = bindingPerformanceRows.map((row, i) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: {
    v2TreeMs: row.bindUniqueMs,
    v2CompiledMs: compiledBindingPerformanceRows[i].bindUniqueMs,
    v1Ms: [35.092, 121.675, 235.588, 521.444][i],
  },
}));

const bulkUpdateChartRows = updatePerformanceRows.map((row, i) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: {
    v2TreeMs: row.bulkUpdateMs,
    v2CompiledMs: compiledUpdatePerformanceRows[i].bulkUpdateMs,
    v1Ms: [7.904, 29.483, 55.091, 146.234][i],
  },
}));

export default function PerformanceV1V2Page() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance', href: '/docs/core-concepts/performance' },
              { label: 'v1 vs v2 comparison' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts · Performance</p>
          <h1 className="sectionTitle">v1.0.0 vs v2.0.0</h1>
          <p className="sectionLead">
            rs-x v2 rewrites the parser and introduces a compiled expression
            engine. This page shows every benchmark metric side by side between
            v1.0.0 and v2.0.0 (both tree and compiled modes). Measured on{' '}
            {benchmarkMachine.cpu}, Node.js {benchmarkMachine.node}.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        {/* ── Summary ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Summary</h2>
          <p className="cardText">
            v2 ships two fundamental changes: a new recursive-descent parser
            that eliminates overhead from the old parser's fixed startup cost,
            and a compiled expression engine. The AOT compiler generates a
            native JS function for each expression at build time; at runtime
            rs-x looks up and calls the pre-generated function directly. The
            compiled engine is the source of most update improvements.
          </p>
          <p className="cardText">
            The one regression is upfront bind cost: v2 does more work per
            binding than v1 — it compiles the expression, sets up a plan cache
            entry, and registers typed watchers. For applications that are
            update-heavy relative to bind count (the common case), this cost
            pays back quickly.
          </p>
          <table className="docsTable" style={{ marginTop: '0.5rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Metric</th>
                <th style={{ textAlign: 'left' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>v1.0.0</th>
                <th style={{ textAlign: 'right' }}>v2 tree</th>
                <th style={{ textAlign: 'right' }}>v2 compiled</th>
                <th style={{ textAlign: 'right' }}>Tree gain</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => {
                const gainClass =
                  row.gainPercent > 5
                    ? { color: 'var(--color-success, #22863a)' }
                    : row.gainPercent < -5
                      ? { color: 'var(--color-error, #d73a49)' }
                      : undefined;
                return (
                  <tr key={row.metric}>
                    <td>
                      {row.metric}
                      {row.isNoisy && (
                        <span
                          title="High variance — treat as indicative only"
                          style={{
                            marginLeft: '0.35rem',
                            opacity: 0.55,
                            fontSize: '0.8em',
                          }}
                        >
                          ~
                        </span>
                      )}
                    </td>
                    <td>{row.unit}</td>
                    <td style={{ textAlign: 'right' }}>
                      {row.oldValue.toFixed(3)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.newValue.toFixed(3)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.compiledNewValue.toFixed(3)}
                    </td>
                    <td style={{ textAlign: 'right', ...gainClass }}>
                      {row.gainPercent >= 0 ? '+' : ''}
                      {row.gainPercent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p
            className="cardText"
            style={{ marginTop: '0.75rem', opacity: 0.7, fontSize: '0.875em' }}
          >
            ~ = high variance measurement; treat as indicative. Positive gain %
            = v2 faster than v1.
          </p>
        </article>

        {/* ── Parse ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Parsing: up to 87% faster</h2>
          <p className="cardText">
            The v2 parser uses a hand-written recursive-descent approach instead
            of the general-purpose parser used in v1. The most dramatic
            improvement is at the low end: a single-identifier expression
            dropped from 5.5 µs to 0.7 µs — 87% faster. Larger expressions
            improve 20–30% as the fixed overhead becomes a smaller fraction of
            total parse time.
          </p>
          <p className="cardText">
            Both modes use the same parser — the parse performance numbers are
            identical for tree and compiled modes.
          </p>
          <PerformanceBarChart
            ariaLabel="Parse time v1 vs v2 by AST node count"
            rows={parseChartRows}
            series={[
              { key: 'v1Ms', label: 'v1.0.0', barClassName: 'isPrimary' },
              { key: 'v2Ms', label: 'v2.0.0', barClassName: 'isSecondary' },
            ]}
            valueUnit="µs"
            decimals={3}
            xAxisLabel="AST nodes"
            yAxisLabel="Parse time (µs/op)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Nodes</th>
                <th style={{ textAlign: 'left' }}>v1.0.0 (µs)</th>
                <th style={{ textAlign: 'left' }}>v2.0.0 (µs)</th>
                <th style={{ textAlign: 'left' }}>Gain</th>
              </tr>
            </thead>
            <tbody>
              {parsePerformanceRows.map((row, i) => {
                const v1 = [5.482, 6.993, 10.524, 17.71, 25.173, 44.295][i];
                const gain = ((v1 - row.usPerOperation) / v1) * 100;
                return (
                  <tr key={row.nodeCount}>
                    <td>{row.nodeCount}</td>
                    <td>{v1.toFixed(3)}</td>
                    <td>{row.usPerOperation.toFixed(3)}</td>
                    <td
                      style={{
                        color:
                          gain > 0
                            ? 'var(--color-success, #22863a)'
                            : undefined,
                      }}
                    >
                      +{gain.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        {/* ── Binding ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Binding: v2 costs more upfront</h2>
          <p className="cardText">
            Bind cost in v2 is slightly higher than v1, but this is largely a
            cost shift. v2 resolves all expression dependencies and builds the
            full watch graph once at bind time — work that v1 deferred to every
            individual update evaluation. In tree mode, bind cost is within ~10%
            of v1 for unique expressions. Compiled mode has a similar bind
            profile; the savings show up at evaluation time.
          </p>
          <p className="cardText">
            The tradeoff is that subsequent calls to <em>update</em> the same
            binding are significantly faster, and memory usage is lower
            (compiled plans are shared). For most applications that bind once
            and update many times, this is a net positive.
          </p>
          <PerformanceBarChart
            ariaLabel="Bind time v1 vs v2 by binding count"
            rows={bindUniqueChartRows}
            series={[
              { key: 'v1Ms', label: 'v1.0.0', barClassName: 'isPrimary' },
              {
                key: 'v2TreeMs',
                label: 'v2 tree',
                barClassName: 'isSecondary',
              },
              {
                key: 'v2CompiledMs',
                label: 'v2 compiled',
                barClassName: 'isTertiary',
              },
            ]}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Bind time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>v1 bind (ms)</th>
                <th style={{ textAlign: 'left' }}>v2 tree (ms)</th>
                <th style={{ textAlign: 'left' }}>v2 compiled (ms)</th>
              </tr>
            </thead>
            <tbody>
              {bindingPerformanceRows.map((row, i) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{[35.092, 121.675, 235.588, 521.444][i].toFixed(3)}</td>
                  <td>{row.bindUniqueMs.toFixed(3)}</td>
                  <td>
                    {compiledBindingPerformanceRows[i].bindUniqueMs.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        {/* ── Updates ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Updates: 60–70% faster</h2>
          <p className="cardText">
            Updates are where v2 wins clearly. Tree mode is already faster than
            v1 for bulk updates — the new watcher architecture notifies only
            affected expressions more efficiently. Compiled mode is faster
            still: it calls the pre-compiled JS function directly, which V8
            JIT-optimises as a regular function call.
          </p>
          <p className="cardText">
            At 10,000 bindings with a bulk update, v2 compiled mode takes 61 ms
            vs 146 ms in v1 — 58% faster. Single update times are very small in
            all versions and not the meaningful comparison.
          </p>
          <PerformanceBarChart
            ariaLabel="Bulk update time v1 vs v2 by binding count"
            rows={bulkUpdateChartRows}
            series={[
              { key: 'v1Ms', label: 'v1.0.0', barClassName: 'isPrimary' },
              {
                key: 'v2TreeMs',
                label: 'v2 tree',
                barClassName: 'isSecondary',
              },
              {
                key: 'v2CompiledMs',
                label: 'v2 compiled',
                barClassName: 'isTertiary',
              },
            ]}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Bulk update time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>v1 bulk update (ms)</th>
                <th style={{ textAlign: 'left' }}>v2 tree (ms)</th>
                <th style={{ textAlign: 'left' }}>v2 compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>Best gain</th>
              </tr>
            </thead>
            <tbody>
              {updatePerformanceRows.map((row, i) => {
                const v1 = [7.904, 29.483, 55.091, 146.234][i];
                const bestMs = Math.min(
                  row.bulkUpdateMs,
                  compiledUpdatePerformanceRows[i].bulkUpdateMs,
                );
                const gain = ((v1 - bestMs) / v1) * 100;
                return (
                  <tr key={row.bindings}>
                    <td>{row.bindings.toLocaleString()}</td>
                    <td>{v1.toFixed(3)}</td>
                    <td>{row.bulkUpdateMs.toFixed(3)}</td>
                    <td>
                      {compiledUpdatePerformanceRows[i].bulkUpdateMs.toFixed(3)}
                    </td>
                    <td style={{ color: 'var(--color-success, #22863a)' }}>
                      +{gain.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        {/* ── Parse cache ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">
            Parse cache (parse + clone): v2 tree is faster
          </h2>
          <p className="cardText">
            When an expression is already cached and a new binding clones the
            cached AST, v2 tree mode is consistently faster than v1. The v1
            clone included more allocations per node; v2 uses a tighter object
            structure. Compiled mode replaces AST cloning with a plan cache
            lookup, which has different cost characteristics.
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Nodes</th>
                <th style={{ textAlign: 'left' }}>v1 parse+clone (µs)</th>
                <th style={{ textAlign: 'left' }}>v2 parse+clone (µs)</th>
                <th style={{ textAlign: 'left' }}>v2 clone-only (µs)</th>
              </tr>
            </thead>
            <tbody>
              {parseCachePerformanceRows.map((row, i) => {
                const v1 = [5.444, 11.013, 15.638, 23.276, 41.113, 80.986][i];
                return (
                  <tr key={row.nodeCount}>
                    <td>{row.nodeCount}</td>
                    <td>{v1.toFixed(3)}</td>
                    <td>{row.parseAndCloneUsPerOperation.toFixed(3)}</td>
                    <td>{row.cloneOnlyUsPerOperation.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
