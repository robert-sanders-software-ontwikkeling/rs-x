import Link from 'next/link';
import type { Metadata } from 'next';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { identifierOnlyBindingPerformanceRows } from '../performance-report/performance-report.data';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

const identifierOnlyChartRows = identifierOnlyBindingPerformanceRows.map(
  (row) => ({
    label: row.bindings.toLocaleString(),
    xValue: row.bindings,
    values: {
      bindMs: row.bindMs,
      bulkUpdateMs: row.bulkUpdateMs,
      singleUpdateMs: row.singleUpdateMs,
    },
  }),
);

export const metadata: Metadata = {
  title: 'Performance',
  description:
    'How rs-x stays fast: expression caching, watch sharing, and selective updates.',
};

export default function PerformancePage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Performance</h1>
          <p className="sectionLead">
            rs-x is designed so the most common usage patterns — binding many
            expressions to many models — scale well without any extra work on
            your side.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Parse once, reuse everywhere</h2>
          <p className="cardText">
            Parsing an expression string into a tree is the most CPU-intensive
            step. rs-x does it exactly once per unique expression string. The
            result is stored in a cache, and every subsequent bind receives a
            lightweight clone of that cached tree.
          </p>
          <p className="cardText">
            Consider a table with 10,000 rows and 20 columns where each column
            has its own expression. rs-x parses 20 expressions — one per unique
            column — regardless of how many rows exist. Binding the full table
            is 200,000 clone operations, not 200,000 parse operations.
          </p>
          <p className="cardText">
            The cache key is the expression string itself, so{' '}
            <span className="codeInline">&quot;price * quantity&quot;</span>{' '}
            parses once even if a thousand components all use it.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">One watcher per model field</h2>
          <p className="cardText">
            When an expression binds to a model, rs-x sets up watchers for
            the fields that expression reads. If two expressions both read field{' '}
            <span className="codeInline">price</span> on the same model, they
            share one underlying watcher — rs-x does not create a second one.
          </p>
          <p className="cardText">
            For a model with 100 fields, at most 100 watchers are ever created,
            no matter how many expressions are bound to that model. Each field
            change notifies exactly the expressions that depend on it.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Selective re-evaluation</h2>
          <p className="cardText">
            When a field changes, only the expressions that read that field
            re-evaluate. An update to <span className="codeInline">price</span>{' '}
            does not touch expressions that read{' '}
            <span className="codeInline">quantity</span> or any other unrelated
            field.
          </p>
          <p className="cardText">
            In a 10,000-row table where only one cell changes, a single
            expression re-evaluates. The other 9,999 expressions are untouched.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">
            Identifier-only binding (most common pattern)
          </h2>
          <p className="cardText">
            Most real-world bindings read a single field:{' '}
            <span className="codeInline">name</span>,{' '}
            <span className="codeInline">price</span>,{' '}
            <span className="codeInline">isActive</span>. These identifier-only
            expressions are the fastest case — one node, one watcher, one field.
          </p>
          <p className="cardText">
            The table below shows bind and update performance for identifier-only
            expressions with unique fields across the given number of bindings.
            Measured on Apple M4, Node.js v25.4.0.
          </p>
          <PerformanceBarChart
            ariaLabel="Identifier-only binding performance"
            rows={identifierOnlyChartRows}
            series={[
              { key: 'bindMs', label: 'Bind', barClassName: 'isPrimary' },
              {
                key: 'bulkUpdateMs',
                label: 'Bulk update',
                barClassName: 'isSecondary',
              },
              {
                key: 'singleUpdateMs',
                label: 'Single update',
                barClassName: 'isTertiary',
              },
            ]}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>Bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Single update (ms)</th>
                <th style={{ textAlign: 'left' }}>Bulk update (ms)</th>
                <th style={{ textAlign: 'left' }}>µs / binding</th>
              </tr>
            </thead>
            <tbody>
              {identifierOnlyBindingPerformanceRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.bindMs.toFixed(3)}</td>
                  <td>{row.singleUpdateMs.toFixed(3)}</td>
                  <td>{row.bulkUpdateMs.toFixed(3)}</td>
                  <td>
                    {((row.bindMs / row.bindings) * 1000).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="advancedTopicLinks" style={{ marginTop: '1rem' }}>
            <li>
              <strong>Bind</strong> — time to create all N bindings (clone
              cached tree + attach to model + set up watcher). No initial value
              read.
            </li>
            <li>
              <strong>Single update</strong> — one field changes, one expression
              re-evaluates. Effectively O(1) regardless of how many bindings are
              active.
            </li>
            <li>
              <strong>Bulk update</strong> — every field changes, every
              expression re-evaluates. Scales linearly with binding count.
            </li>
            <li>
              <strong>µs / binding</strong> — bind time normalised per
              expression{' '}
              <span className="codeInline">(Bind ms ÷ N) × 1000</span>. Shows
              the per-unit cost is roughly constant (~30–37 µs) across scales.
            </li>
          </ul>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Related</h2>
          <ul className="docsApiLinkGrid">
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-demo"
              >
                <ItemLinkCardContent
                  title="Live demo"
                  meta="Run a configurable table benchmark in your browser"
                />
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-report"
              >
                <ItemLinkCardContent
                  title="Advanced performance report"
                  meta="Parse, bind, update, and memory benchmarks (v1.0.0 vs v2.0.0)"
                />
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/angular-signals-comparison"
              >
                <ItemLinkCardContent
                  title="Angular Signals comparison"
                  meta="rs-x vs Angular Signals: sync, async, and complex expression benchmarks"
                />
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
