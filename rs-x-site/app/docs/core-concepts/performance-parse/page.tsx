import type { Metadata } from 'next';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import {
  benchmarkMachine,
  parseCachePerformanceRows,
  parsePerformanceRows,
} from '../performance-report/performance-report.data';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

export const metadata: Metadata = {
  title: 'Parse performance',
  description:
    'How fast rs-x parses expressions, what preparse and lazy do, and how the parse cache eliminates repeat work.',
};

const parseChartRows = parsePerformanceRows.map((row) => ({
  label: String(row.nodeCount),
  xValue: row.nodeCount,
  values: { usPerOp: row.usPerOperation },
}));

const parseCacheChartRows = parseCachePerformanceRows.map((row) => ({
  label: String(row.nodeCount),
  xValue: row.nodeCount,
  values: {
    parseAndClone: row.parseAndCloneUsPerOperation,
    cloneOnly: row.cloneOnlyUsPerOperation,
  },
}));

const fmtUs = (us: number) =>
  us >= 10 ? `${us.toFixed(1)} µs` : `${us.toFixed(3)} µs`;

export default function PerformanceParsePage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance', href: '/docs/core-concepts/performance' },
              { label: 'Parse performance' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts · Performance</p>
          <h1 className="sectionTitle">Parse performance</h1>
          <p className="sectionLead">
            Parsing turns an expression string into an AST. rs-x does this
            exactly once per unique expression string then caches the result.
            Every subsequent binding clones the cached AST — a clone costs a
            fraction of a full parse. Measured on {benchmarkMachine.cpu},
            Node.js {benchmarkMachine.node},{' '}
            {benchmarkMachine.parseOperationsPerSample.toLocaleString()}{' '}
            operations per sample.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        {/* ── Raw parse speed ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Raw parse speed</h2>
          <p className="cardText">
            Parse time grows roughly linearly with expression size — each
            additional node costs a fixed amount of work. A single-identifier
            expression like <span className="codeInline">price</span> parses in
            under 1 µs. A 63-node arithmetic expression takes about 36 µs.
            Because parsing happens once per unique string, this cost is paid at
            cold-start only.
          </p>
          <PerformanceBarChart
            ariaLabel="Parse time by AST node count"
            rows={parseChartRows}
            series={[
              {
                key: 'usPerOp',
                label: 'Parse time',
                barClassName: 'isPrimary',
              },
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
                <th style={{ textAlign: 'left' }}>Expression shape</th>
                <th style={{ textAlign: 'left' }}>µs / op</th>
                <th style={{ textAlign: 'left' }}>ops / sec</th>
              </tr>
            </thead>
            <tbody>
              {parsePerformanceRows.map((row) => (
                <tr key={row.nodeCount}>
                  <td>{row.nodeCount}</td>
                  <td>
                    <span className="codeInline">{row.expressionShape}</span>
                  </td>
                  <td>{row.usPerOperation.toFixed(3)}</td>
                  <td>{row.opsPerSecond.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '0.75rem' }}>
            <strong>Conclusion:</strong> parsing is fast and predictable. For
            typical application expressions (3–15 nodes), parse time is 1–9 µs.
            The parse cache means this cost is only paid once — not once per
            binding.
          </p>
        </article>

        {/* ── Cache behaviour ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">
            Parse cache: parse-and-clone vs clone-only
          </h2>
          <p className="cardText">
            The first time an expression is bound, rs-x parses the string and
            stores the resulting AST in an in-memory cache. Every subsequent
            binding clones the cached AST. The chart below compares the cost of
            those two paths.
          </p>
          <p className="cardText">
            <strong>Parse-and-clone</strong> — the cold path: parse the
            expression string, store in cache, return a clone.
            <br />
            <strong>Clone-only</strong> — the warm path: retrieve from cache,
            return a clone. No parsing.
          </p>
          <p className="cardText">
            Clone-only cost is typically 60–85% of the parse-and-clone cost —
            faster, but still not free because cloning a deep tree requires
            allocating and copying every node. For compiled mode the clone is
            replaced by a lightweight plan lookup, which is much cheaper.
          </p>
          <PerformanceBarChart
            ariaLabel="Parse cache: parse-and-clone vs clone-only"
            rows={parseCacheChartRows}
            series={[
              {
                key: 'parseAndClone',
                label: 'Parse + clone',
                barClassName: 'isPrimary',
              },
              {
                key: 'cloneOnly',
                label: 'Clone only',
                barClassName: 'isSecondary',
              },
            ]}
            valueUnit="µs"
            decimals={3}
            xAxisLabel="AST nodes"
            yAxisLabel="Cost (µs/op)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Nodes</th>
                <th style={{ textAlign: 'left' }}>Parse + clone (µs)</th>
                <th style={{ textAlign: 'left' }}>Clone only (µs)</th>
                <th style={{ textAlign: 'left' }}>Clone saving</th>
              </tr>
            </thead>
            <tbody>
              {parseCachePerformanceRows.map((row) => {
                const saving =
                  ((row.parseAndCloneUsPerOperation -
                    row.cloneOnlyUsPerOperation) /
                    row.parseAndCloneUsPerOperation) *
                  100;
                return (
                  <tr key={row.nodeCount}>
                    <td>{row.nodeCount}</td>
                    <td>{fmtUs(row.parseAndCloneUsPerOperation)}</td>
                    <td>{fmtUs(row.cloneOnlyUsPerOperation)}</td>
                    <td>{saving.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '0.75rem' }}>
            <strong>Conclusion:</strong> the cache eliminates repeat parse work.
            After the first binding, every subsequent binding with the same
            expression string pays only the clone cost. For large-scale
            applications with many bindings per unique expression, the cache is
            critical to keeping bind time low.
          </p>
        </article>

        {/* ── Preparse and lazy ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Controlling when parsing happens</h2>
          <p className="cardText">
            By default, an expression is parsed the first time it is bound. Two
            options let you control this timing:
          </p>
          <p className="cardText">
            <strong>preparse: true</strong> — parse and cache the expression at
            module load time, before any binding is created. The first binding
            pays only the clone cost, not the parse cost. Use this for
            expressions that are always used on page load and where you want
            predictable, consistently fast first-bind latency.
          </p>
          <pre className="codeBlock">{`rsx('price * quantity', { preparse: true })(model)`}</pre>
          <p className="cardText">
            <strong>lazy: true</strong> — defer even the preparse until the
            expression is first accessed. Useful in large applications where
            many expressions are registered at startup but only a fraction are
            used on any given page. The lazy preload happens asynchronously on
            first access, spreading parse work over time rather than
            front-loading it.
          </p>
          <pre className="codeBlock">{`rsx('price * quantity', { lazy: true })(model)`}</pre>
          <p className="cardText">
            The AOT compiler (run at build time) can pre-generate parse caches
            and compiled plans for all expressions it detects in your source, so
            the first binding on the client pays neither parse nor compile cost.
          </p>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
