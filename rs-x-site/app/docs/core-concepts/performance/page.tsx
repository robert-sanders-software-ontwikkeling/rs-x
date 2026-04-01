import Link from 'next/link';
import type { Metadata } from 'next';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import {
  expressionEngineModeMemoryRows,
  expressionEngineModeAsyncRows,
  expressionEngineModeSameModelRow,
  identifierOnlyEngineModeRows,
} from '../performance-report/performance-report.data';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

const idBindChartRows = identifierOnlyEngineModeRows.map((row) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: { treeMs: row.tree.bindMs, compiledMs: row.compiled.bindMs },
}));

const idBulkChartRows = identifierOnlyEngineModeRows.map((row) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: { treeMs: row.tree.bulkUpdateMs, compiledMs: row.compiled.bulkUpdateMs },
}));

const idSingleChartRows = identifierOnlyEngineModeRows.map((row) => ({
  label: row.bindings.toLocaleString(),
  xValue: row.bindings,
  values: { treeMs: row.tree.singleUpdateMs, compiledMs: row.compiled.singleUpdateMs },
}));

const formatPercent = (value: number): string => {
  return value >= 0
    ? `${value.toFixed(1)}% faster`
    : `${Math.abs(value).toFixed(1)}% slower`;
};

const compiledVsTreePercent = (compiledMs: number, treeMs: number): number =>
  ((treeMs - compiledMs) / treeMs) * 100;

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
            Measured on Apple M4, Node.js v25.4.0. Bulk update is the worst case where every field changes and every expression re-evaluates. 
            Single update is the best case where one field changes and one expression re-evaluates. Where bind is the initial cost to set up the binding, like parsing,creating watchers, and doing the initial value read.
            The most important column is the single update time, which shows that even with 1,000,000 bindings, an update that touches one field and one expression still completes in under 1 ms. 
            This scenario is most common in where only a few fields change at a time, and shows that rs-x can handle large numbers of bindings without slowing down updates. 
            This is where rs-x excels it is able to update bindings locally and because of that it can keep update times low even as the number of bindings grows. 
            You only pay the initial cost of setting up the bindings, and then updates are fast regardless of scale.
          </p>
          <h3 className="cardSubtitle">Bind time</h3>
          <PerformanceBarChart
            ariaLabel="Identifier-only bind time — compiled vs tree"
            rows={idBindChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
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
              </tr>
            </thead>
            <tbody>
              {identifierOnlyEngineModeRows.map((row) => (
                <tr key={`bind-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.tree.bindMs.toFixed(3)}</td>
                  <td>{row.compiled.bindMs.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cardSubtitle" style={{ marginTop: '1.25rem' }}>Bulk update time</h3>
          <PerformanceBarChart
            ariaLabel="Identifier-only bulk update time — compiled vs tree"
            rows={idBulkChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
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
              </tr>
            </thead>
            <tbody>
              {identifierOnlyEngineModeRows.map((row) => (
                <tr key={`bulk-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.tree.bulkUpdateMs.toFixed(3)}</td>
                  <td>{row.compiled.bulkUpdateMs.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cardSubtitle" style={{ marginTop: '1.25rem' }}>Single update time</h3>
          <PerformanceBarChart
            ariaLabel="Identifier-only single update time — compiled vs tree"
            rows={idSingleChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
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
                <tr key={`single-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.tree.singleUpdateMs.toFixed(3)}</td>
                  <td>{row.compiled.singleUpdateMs.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="cardTitle" style={{ marginTop: '1.25rem' }}>
            Compiled vs tree mode (identifier-only)
          </h3>
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
              {identifierOnlyEngineModeRows.flatMap((row) => {
                const bindGain =
                  ((row.tree.bindMs - row.compiled.bindMs) / row.tree.bindMs) *
                  100;
                const singleGain =
                  ((row.tree.singleUpdateMs - row.compiled.singleUpdateMs) /
                    row.tree.singleUpdateMs) *
                  100;
                const bulkGain =
                  ((row.tree.bulkUpdateMs - row.compiled.bulkUpdateMs) /
                    row.tree.bulkUpdateMs) *
                  100;

                return [
                  <tr key={`${row.bindings}-bind`}>
                    <td>{row.bindings.toLocaleString()}</td>
                    <td>Bind</td>
                    <td>{row.compiled.bindMs.toFixed(3)}</td>
                    <td>{row.tree.bindMs.toFixed(3)}</td>
                    <td>{formatPercent(bindGain)}</td>
                  </tr>,
                  <tr key={`${row.bindings}-single`}>
                    <td>{row.bindings.toLocaleString()}</td>
                    <td>Single update</td>
                    <td>{row.compiled.singleUpdateMs.toFixed(3)}</td>
                    <td>{row.tree.singleUpdateMs.toFixed(3)}</td>
                    <td>{formatPercent(singleGain)}</td>
                  </tr>,
                  <tr key={`${row.bindings}-bulk`}>
                    <td>{row.bindings.toLocaleString()}</td>
                    <td>Bulk update</td>
                    <td>{row.compiled.bulkUpdateMs.toFixed(3)}</td>
                    <td>{row.tree.bulkUpdateMs.toFixed(3)}</td>
                    <td>{formatPercent(bulkGain)}</td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
          <h3 className="cardTitle" style={{ marginTop: '1.25rem' }}>
            Compiled vs tree mode (async identifier)
          </h3>
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
              {expressionEngineModeAsyncRows.flatMap((row) => [
                <tr key={`async-${row.bindings}-bind`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>Bind</td>
                  <td>{row.compiled.bindMs.toFixed(3)}</td>
                  <td>{row.tree.bindMs.toFixed(3)}</td>
                  <td>
                    {formatPercent(
                      compiledVsTreePercent(row.compiled.bindMs, row.tree.bindMs),
                    )}
                  </td>
                </tr>,
                <tr key={`async-${row.bindings}-single`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>Single update</td>
                  <td>{row.compiled.singleUpdateMs.toFixed(3)}</td>
                  <td>{row.tree.singleUpdateMs.toFixed(3)}</td>
                  <td>
                    {formatPercent(
                      compiledVsTreePercent(
                        row.compiled.singleUpdateMs,
                        row.tree.singleUpdateMs,
                      ),
                    )}
                  </td>
                </tr>,
                <tr key={`async-${row.bindings}-bulk`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>Bulk update</td>
                  <td>{row.compiled.bulkUpdateMs.toFixed(3)}</td>
                  <td>{row.tree.bulkUpdateMs.toFixed(3)}</td>
                  <td>
                    {formatPercent(
                      compiledVsTreePercent(
                        row.compiled.bulkUpdateMs,
                        row.tree.bulkUpdateMs,
                      ),
                    )}
                  </td>
                </tr>,
              ])}
            </tbody>
          </table>
          <h3 className="cardTitle" style={{ marginTop: '1.25rem' }}>
            Compiled vs tree mode (same-model generated expressions)
          </h3>
          <p className="cardText">
            1,000 unique generated expressions, all bound to the same model{' '}
            <span className="codeInline">{'{ x, y }'}</span>. Every expression
            has the same structure: a deeply nested arithmetic chain with exactly
            203 AST nodes, only the numeric constants differ. For comparison, a
            typical expression like{' '}
            <span className="codeInline">price * quantity</span> has 3 AST
            nodes. These are extreme synthetic expressions designed to stress
            test the evaluator, not representative of real application code.
          </p>
          <p className="cardText">
            Representative shape (one repeated pattern within a larger
            expression):{' '}
            <span className="codeInline">
              (((x + y) + ((x + y) + n) - a) * b) / ((x + y) + c)
            </span>
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
                <td>{expressionEngineModeSameModelRow.compiled.bindMs.toFixed(3)}</td>
                <td>{expressionEngineModeSameModelRow.tree.bindMs.toFixed(3)}</td>
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
                <td>Single update</td>
                <td>
                  {expressionEngineModeSameModelRow.compiled.singleUpdateMs.toFixed(
                    3,
                  )}
                </td>
                <td>{expressionEngineModeSameModelRow.tree.singleUpdateMs.toFixed(3)}</td>
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
                <td>{expressionEngineModeSameModelRow.compiled.bulkUpdateMs.toFixed(3)}</td>
                <td>{expressionEngineModeSameModelRow.tree.bulkUpdateMs.toFixed(3)}</td>
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
