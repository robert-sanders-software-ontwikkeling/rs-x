import type { Metadata } from 'next';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import {
  benchmarkMachine,
  identifierOnlyBindingPerformanceRows,
  identifierOnlyEngineModeRows,
} from '../performance-report/performance-report.data';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

export const metadata: Metadata = {
  title: 'Identifier-only binding performance',
  description:
    'Bind and update performance for single-field expressions — the most common real-world pattern — at scales from 100 to 1,000,000 bindings.',
};

const bindChartRows = identifierOnlyEngineModeRows.map((row) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: { treeMs: row.tree.bindMs, compiledMs: row.compiled.bindMs },
}));

const bulkChartRows = identifierOnlyEngineModeRows.map((row) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: {
    treeMs: row.tree.bulkUpdateMs,
    compiledMs: row.compiled.bulkUpdateMs,
  },
}));

const singleChartRows = identifierOnlyEngineModeRows.map((row) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: {
    treeMs: row.tree.singleUpdateMs,
    compiledMs: row.compiled.singleUpdateMs,
  },
}));

const fmtMs = (ms: number) =>
  ms >= 1 ? `${ms.toFixed(3)} ms` : `${(ms * 1000).toFixed(3)} µs`;

const pct = (a: number, b: number) => `${(((b - a) / b) * 100).toFixed(1)}%`;

export default function PerformanceIdentifiersPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance', href: '/docs/core-concepts/performance' },
              { label: 'Identifier-only bindings' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts · Performance</p>
          <h1 className="sectionTitle">Identifier-only binding performance</h1>
          <p className="sectionLead">
            The most common real-world pattern: one expression reads one field.{' '}
            <span className="codeInline">name</span>,{' '}
            <span className="codeInline">price</span>,{' '}
            <span className="codeInline">isActive</span>. Each binding is one
            AST node, one watcher, one field. This page benchmarks that pattern
            across binding counts from 1,000 to 10,000, for both engine modes.
            Measured on {benchmarkMachine.cpu}, Node.js {benchmarkMachine.node}.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        {/* ── What we're measuring ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">What these benchmarks measure</h2>
          <p className="cardText">
            Each binding uses a unique field name (
            <span className="codeInline">f0</span>,{' '}
            <span className="codeInline">f1</span>, …) and a unique model
            object. This ensures watchers are not shared across bindings — each
            binding creates its own watcher. This is the realistic worst case
            for identifier-only bindings: no sharing, maximum isolation.
          </p>
          <p className="cardText">Three metrics are measured:</p>
          <ul className="cardText" style={{ marginLeft: '1.25rem' }}>
            <li>
              <strong>Bind time</strong> — create the binding, register the
              watcher, do the initial read. Includes AOT plan lookup (compiled
              mode) or AST clone (tree mode).
            </li>
            <li>
              <strong>Bulk update time</strong> — change every model field;
              every binding re-evaluates. Worst case: N updates, N
              re-evaluations.
            </li>
            <li>
              <strong>Single update time</strong> — change one model field; one
              binding re-evaluates. Best case: O(1) regardless of total binding
              count.
            </li>
          </ul>
        </article>

        {/* ── Bind time ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Bind time</h2>
          <p className="cardText">
            Bind time scales linearly with binding count. For identifier-only
            expressions, compiled and tree mode are within a few percent of each
            other — the expression is so simple that the compilation overhead in
            compiled mode roughly equals the AST clone overhead in tree mode.
            There is no clear winner here; both modes are fast.
          </p>
          <PerformanceBarChart
            ariaLabel="Identifier-only bind time — compiled vs tree"
            rows={bindChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              {
                key: 'compiledMs',
                label: 'Compiled',
                barClassName: 'isSecondary',
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
                <th style={{ textAlign: 'left' }}>Tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {identifierOnlyEngineModeRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.tree.bindMs.toFixed(3)}</td>
                  <td>{row.compiled.bindMs.toFixed(3)}</td>
                  <td>
                    {row.compiled.bindMs < row.tree.bindMs
                      ? `compiled ${pct(row.compiled.bindMs, row.tree.bindMs)} faster`
                      : `tree ${pct(row.tree.bindMs, row.compiled.bindMs)} faster`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        {/* ── Bulk update ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Bulk update time</h2>
          <p className="cardText">
            When every model field changes at once, every binding re-evaluates.
            For identifier-only expressions with unique fields this is the O(N)
            worst case. Even so, 10,000 bindings complete their bulk
            re-evaluation in under 50 ms in both modes.
          </p>
          <p className="cardText">
            At this expression complexity, compiled mode offers a modest
            improvement — roughly 10–15% faster at 10,000 bindings. The
            advantage grows significantly for more complex expressions.
          </p>
          <PerformanceBarChart
            ariaLabel="Identifier-only bulk update time — compiled vs tree"
            rows={bulkChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              {
                key: 'compiledMs',
                label: 'Compiled',
                barClassName: 'isSecondary',
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
                <th style={{ textAlign: 'left' }}>Tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {identifierOnlyEngineModeRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.tree.bulkUpdateMs.toFixed(3)}</td>
                  <td>{row.compiled.bulkUpdateMs.toFixed(3)}</td>
                  <td>
                    {row.compiled.bulkUpdateMs < row.tree.bulkUpdateMs
                      ? `compiled ${pct(row.compiled.bulkUpdateMs, row.tree.bulkUpdateMs)} faster`
                      : `tree ${pct(row.tree.bulkUpdateMs, row.compiled.bulkUpdateMs)} faster`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        {/* ── Single update ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Single update time</h2>
          <p className="cardText">
            When one field changes, exactly one binding re-evaluates. Because
            rs-x uses per-field watchers, updating one field does not touch any
            other binding regardless of how many bindings exist. This is the key
            property that makes rs-x scale: update cost is O(1) with respect to
            total binding count.
          </p>
          <p className="cardText">
            The single update time stays below 0.1 ms across all measured
            binding counts — and is essentially the same at 1,000 as at 10,000
            bindings. This is the most important number for applications where
            only a few fields change at a time (which is almost all real
            applications).
          </p>
          <PerformanceBarChart
            ariaLabel="Identifier-only single update time — compiled vs tree"
            rows={singleChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              {
                key: 'compiledMs',
                label: 'Compiled',
                barClassName: 'isSecondary',
              },
            ]}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Single update time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>Tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled (ms)</th>
              </tr>
            </thead>
            <tbody>
              {identifierOnlyEngineModeRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.tree.singleUpdateMs.toFixed(3)}</td>
                  <td>{row.compiled.singleUpdateMs.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '0.75rem' }}>
            <strong>Conclusion:</strong> single update time does not grow with
            binding count. This is the defining property of rs-x's reactive
            architecture. You only pay the O(N) cost when N fields all change
            simultaneously — the typical case of one or a few fields changing at
            a time stays O(1) no matter how large your binding graph is.
          </p>
        </article>

        {/* ── Raw identifier binding scale ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">
            Scale reference: bind and update at larger counts
          </h2>
          <p className="cardText">
            The following table extends to larger binding counts using the tree
            engine mode. It shows raw bind time and update performance as a
            reference for capacity planning.
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>Bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Bind + init (ms)</th>
                <th style={{ textAlign: 'left' }}>Single update (ms)</th>
                <th style={{ textAlign: 'left' }}>Bulk update (ms)</th>
              </tr>
            </thead>
            <tbody>
              {identifierOnlyBindingPerformanceRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{fmtMs(row.bindMs)}</td>
                  <td>{fmtMs(row.bindInitializedMs)}</td>
                  <td>{fmtMs(row.singleUpdateMs)}</td>
                  <td>{fmtMs(row.bulkUpdateMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '0.75rem' }}>
            <strong>Bind + init</strong> includes the time to complete the
            initial reactive evaluation cycle after binding — i.e. until every
            expression has its first value. This is typically higher than raw
            bind time because it waits for the reactive scheduler to settle.
          </p>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
