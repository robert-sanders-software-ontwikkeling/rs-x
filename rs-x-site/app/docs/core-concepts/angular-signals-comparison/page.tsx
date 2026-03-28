import Link from 'next/link';
import type { Metadata } from 'next';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

import {
  asyncIdentifierRows,
  sameModelExpressionsRow,
  syncIdentifierRows,
} from './angular-signals-comparison.data';

export const metadata: Metadata = {
  title: 'Angular Signals comparison',
  description:
    'rs-x vs Angular Signals: sync identifier, async observable, and complex expression binding benchmarks.',
};

// ─── Chart row builders ───────────────────────────────────────────────────────

const toBindChartRows = (rows: typeof syncIdentifierRows) =>
  rows.map((r) => ({
    label: r.bindings.toLocaleString(),
    xValue: r.bindings,
    values: { rsxMs: r.rsx.bindMs, angularMs: r.angular.bindMs },
  }));

const toBulkChartRows = (rows: typeof syncIdentifierRows) =>
  rows.map((r) => ({
    label: r.bindings.toLocaleString(),
    xValue: r.bindings,
    values: { rsxMs: r.rsx.bulkUpdateMs, angularMs: r.angular.bulkUpdateMs },
  }));

const syncBindChartRows = toBindChartRows(syncIdentifierRows);
const syncBulkChartRows = toBulkChartRows(syncIdentifierRows);
const asyncBindChartRows = toBindChartRows(asyncIdentifierRows);
const asyncBulkChartRows = toBulkChartRows(asyncIdentifierRows);

const twoSeriesMs = [
  { key: 'rsxMs',     label: 'rs-x',             barClassName: 'isPrimary'   },
  { key: 'angularMs', label: 'Angular Signals',   barClassName: 'isSecondary' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AngularSignalsComparisonPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Angular Signals comparison' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Angular Signals comparison</h1>
          <p className="sectionLead">
            rs-x and Angular Signals are two different reactive systems. This
            page measures them side-by-side across three scenarios so you can
            understand where each system excels and why.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">

        {/* ── How each system works ─────────────────────────────────────────── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">How each system works</h2>

          <h3 className="cardSubtitle">rs-x</h3>
          <p className="cardText">
            rs-x binds a <em>string expression</em> to a plain JavaScript
            object. The expression is parsed once and cached; subsequent bindings
            clone the cached tree. rs-x attaches a JavaScript{' '}
            <span className="codeInline">Proxy</span> to the model so it can
            detect property mutations automatically — you change{' '}
            <span className="codeInline">model.price = 42</span> and rs-x sees
            it. Re-evaluation is scheduled as a microtask, so it is{' '}
            <strong>asynchronous</strong>.
          </p>
          <p className="cardText">
            Native Observable and Promise values in model fields are handled
            transparently: rs-x subscribes to them and propagates emitted values
            without any extra configuration.
          </p>

          <h3 className="cardSubtitle">Angular Signals</h3>
          <p className="cardText">
            Angular Signals are an <em>explicit reactive primitive</em>. You
            create a <span className="codeInline">signal(initialValue)</span>{' '}
            and read it inside a{' '}
            <span className="codeInline">computed(() =&gt; expression)</span>.
            Angular tracks which signals each computed reads, and marks that
            computed stale when any of those signals change. Re-evaluation
            happens <strong>synchronously</strong> the next time the computed is
            read.
          </p>
          <p className="cardText">
            For Observable values, Angular provides{' '}
            <span className="codeInline">
              toSignal(observable$, &#123; injector &#125;)
            </span>{' '}
            which subscribes internally and updates the signal synchronously on
            each emission.
          </p>

          <h3 className="cardSubtitle">What is different</h3>
          <p className="cardText">
            The key structural difference is{' '}
            <strong>string expressions vs compiled TypeScript</strong>. rs-x
            lets you write{' '}
            <span className="codeInline">&quot;price * quantity&quot;</span> and
            bind it to any object; Angular Signals require you to express the
            same computation as a JavaScript arrow function inside{' '}
            <span className="codeInline">computed()</span>. rs-x pays a parsing
            cost once and then evaluates an AST on each change; Angular Signals
            run native compiled JavaScript.
          </p>
          <p className="cardText">
            Benchmarks were run with{' '}
            <span className="codeInline">node --expose-gc</span> on Apple M4,
            Node.js v25.4.0. Times are medians of multiple runs with forced GC
            between sizes.
          </p>
        </article>

        {/* ── Scenario 1: Sync identifier ───────────────────────────────────── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Scenario 1 — Sync identifier</h2>
          <p className="cardText">
            N bindings, each watching a unique field (
            <span className="codeInline">field0</span>,{' '}
            <span className="codeInline">field1</span>, …) on its own separate
            model.
          </p>
          <ul className="advancedTopicLinks">
            <li>
              <strong>rs-x:</strong>{' '}
              <span className="codeInline">rsx(&apos;fieldN&apos;)(model)</span>{' '}
              — Proxy intercepts writes to{' '}
              <span className="codeInline">model.fieldN</span>, schedules a
              microtask, re-evaluates.
            </li>
            <li>
              <strong>Angular:</strong>{' '}
              <span className="codeInline">signal(v)</span> +{' '}
              <span className="codeInline">computed(() =&gt; s())</span> — plain
              JS objects, no Proxy, no parsing. Update with{' '}
              <span className="codeInline">s.set(v)</span>, read computed to
              force re-evaluation.
            </li>
          </ul>

          <h3 className="cardSubtitle">Bind time</h3>
          <p className="cardText">
            Angular creates bare JS objects — no parsing, no Proxy, no watcher
            registration. rs-x has a fixed per-binding cost: clone cached tree,
            wrap model in Proxy, register watchers. The gap is constant per
            binding (~30 µs/binding for rs-x vs ~0.5 µs for Angular).
          </p>
          <PerformanceBarChart
            ariaLabel="Sync identifier bind time: rs-x vs Angular Signals"
            rows={syncBindChartRows}
            series={twoSeriesMs}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />

          <h3 className="cardSubtitle">Bulk update time</h3>
          <p className="cardText">
            Each field changes on each of the N separate models. Angular calls{' '}
            <span className="codeInline">s.set()</span> and then reads the
            computed — fully synchronous. rs-x detects the Proxy mutation,
            flushes a microtask queue, and re-evaluates the expression tree. Both
            scale linearly; Angular is faster because it skips the scheduler and
            AST evaluation.
          </p>
          <PerformanceBarChart
            ariaLabel="Sync identifier bulk update time: rs-x vs Angular Signals"
            rows={syncBulkChartRows}
            series={twoSeriesMs}
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
                <th style={{ textAlign: 'left' }}>rs-x bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular bind (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x single update (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular single update (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x bulk update (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular bulk update (ms)</th>
              </tr>
            </thead>
            <tbody>
              {syncIdentifierRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsx.bindMs.toFixed(2)}</td>
                  <td>{row.angular.bindMs.toFixed(2)}</td>
                  <td>{row.rsx.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.angular.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.rsx.bulkUpdateMs.toFixed(2)}</td>
                  <td>{row.angular.bulkUpdateMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="advancedTopicLinks" style={{ marginTop: '1rem' }}>
            <li>
              <strong>Single update</strong> — one field changes on one model;
              only that expression re-evaluates. Both systems are effectively
              O(1). rs-x is ~0.07–0.10 ms (microtask scheduling overhead);
              Angular is ~0.009–0.012 ms (synchronous read).
            </li>
            <li>
              <strong>Bulk update</strong> — all N fields change; all N
              expressions re-evaluate. Both are O(N).
            </li>
          </ul>
        </article>

        {/* ── Scenario 2: Async identifier ──────────────────────────────────── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Scenario 2 — Async identifier (Observable)</h2>
          <p className="cardText">
            Each model field holds a{' '}
            <span className="codeInline">BehaviorSubject</span>. The binding
            tracks emitted values.
          </p>
          <ul className="advancedTopicLinks">
            <li>
              <strong>rs-x:</strong>{' '}
              <span className="codeInline">rsx(&apos;stream&apos;)(model)</span>{' '}
              where <span className="codeInline">model.stream</span> is a{' '}
              <span className="codeInline">BehaviorSubject</span>. rs-x detects
              the Observable via duck-typing and subscribes automatically. The
              initial value is delivered asynchronously.
            </li>
            <li>
              <strong>Angular:</strong>{' '}
              <span className="codeInline">
                toSignal(behaviorSubject, &#123; injector &#125;)
              </span>{' '}
              — Angular subscribes internally and calls{' '}
              <span className="codeInline">signal.set()</span> synchronously on
              each emission.
            </li>
          </ul>

          <h3 className="cardSubtitle">Bind time</h3>
          <p className="cardText">
            Bind time includes the first emission arriving. Angular&apos;s
            toSignal is fast because the BehaviorSubject emits synchronously on
            subscribe. rs-x needs a microtask round-trip to deliver the first
            value. Both scale linearly with binding count.
          </p>
          <PerformanceBarChart
            ariaLabel="Async identifier bind time: rs-x vs Angular Signals"
            rows={asyncBindChartRows}
            series={twoSeriesMs}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />

          <h3 className="cardSubtitle">Bulk update time</h3>
          <p className="cardText">
            All N subjects emit a new value. Angular updates synchronously;
            rs-x flushes microtasks. Note that at 10,000 bindings, Angular
            begins to show overhead from managing many subscriptions (15 ms
            bind), while rs-x also grows predictably. Both scale linearly.
          </p>
          <PerformanceBarChart
            ariaLabel="Async identifier bulk update time: rs-x vs Angular Signals"
            rows={asyncBulkChartRows}
            series={twoSeriesMs}
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
                <th style={{ textAlign: 'left' }}>rs-x bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular bind (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x single update (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular single update (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x bulk update (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular bulk update (ms)</th>
              </tr>
            </thead>
            <tbody>
              {asyncIdentifierRows.map((row) => (
                <tr key={row.bindings}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsx.bindMs.toFixed(2)}</td>
                  <td>{row.angular.bindMs.toFixed(2)}</td>
                  <td>{row.rsx.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.angular.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.rsx.bulkUpdateMs.toFixed(2)}</td>
                  <td>{row.angular.bulkUpdateMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="advancedTopicLinks" style={{ marginTop: '1rem' }}>
            <li>
              <strong>Single update</strong> — one subject emits; one expression
              updates. O(1) for both. rs-x ~0.05 ms; Angular ~0.011–0.017 ms.
            </li>
            <li>
              <strong>Bulk update</strong> — all subjects emit; all expressions
              update. O(N) for both. Angular stays faster due to synchronous
              propagation; rs-x adds per-emission microtask cost.
            </li>
          </ul>
        </article>

        {/* ── Scenario 3: Same-model expressions ───────────────────────────── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">
            Scenario 3 — Same-model: all 1,000 generated expressions
          </h2>
          <p className="cardText">
            All 1,000 expressions from{' '}
            <span className="codeInline">
              generated-benchmark-expression-strings.ts
            </span>{' '}
            are bound to a single shared model{' '}
            <span className="codeInline">&#123; x, y &#125;</span>. Each
            expression is unique and deeply nested — the simplest has ~60 AST
            nodes; the most complex has over 120.
          </p>
          <ul className="advancedTopicLinks">
            <li>
              <strong>rs-x:</strong>{' '}
              <span className="codeInline">
                rsx(generatedExpr[i])(&#123; x, y &#125;)
              </span>{' '}
              — each string is parsed into an AST (1,000 unique parses, each
              tree has 60–120+ nodes). Re-evaluation walks the tree
              interpreting each node. When <span className="codeInline">x</span>{' '}
              changes, all 1,000 expressions must re-evaluate because they all
              depend on <span className="codeInline">x</span>.
            </li>
            <li>
              <strong>Angular:</strong>{' '}
              <span className="codeInline">
                computed(() =&gt; fn(xSig(), ySig()))
              </span>{' '}
              where{' '}
              <span className="codeInline">
                fn = new Function(&apos;x&apos;, &apos;y&apos;, expr)
              </span>{' '}
              — each expression string is compiled once to a native JavaScript
              function (V8 JIT-compiled). Re-evaluation calls the native
              function directly at full CPU speed.
            </li>
          </ul>
          <p className="cardText">
            This scenario reveals the fundamental difference in evaluation
            strategy. The single-update measurement triggers all 1,000
            dependents (fan-out). The bulk-update measurement does 10 sequential
            x-changes, each triggering all 1,000.
          </p>

          <table className="docsTable" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>System</th>
                <th style={{ textAlign: 'left' }}>Bind — create+init (ms)</th>
                <th style={{ textAlign: 'left' }}>Dispose 1,000 (ms)</th>
                <th style={{ textAlign: 'left' }}>Single x-change (ms)</th>
                <th style={{ textAlign: 'left' }}>
                  Bulk — {sameModelExpressionsRow.bulkRounds}× x-change (ms)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>rs-x</td>
                <td>{sameModelExpressionsRow.rsx.bindMs.toFixed(0)}</td>
                <td>{sameModelExpressionsRow.rsx.disposeMs.toFixed(0)}</td>
                <td>{sameModelExpressionsRow.rsx.singleUpdateMs.toFixed(0)}</td>
                <td>{sameModelExpressionsRow.rsx.bulkUpdateMs.toFixed(0)}</td>
              </tr>
              <tr>
                <td>Angular Signals</td>
                <td>{sameModelExpressionsRow.angular.bindMs.toFixed(2)}</td>
                <td>GC</td>
                <td>
                  {sameModelExpressionsRow.angular.singleUpdateMs.toFixed(1)}
                </td>
                <td>
                  {sameModelExpressionsRow.angular.bulkUpdateMs.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="cardText" style={{ marginTop: '1rem' }}>
            <strong>Bind cost (create+init):</strong> rs-x parses 1,000 unique
            complex expression strings into AST trees and evaluates each for the
            first time — ~{sameModelExpressionsRow.rsx.bindMs.toFixed(0)} ms.
            Angular calls{' '}
            <span className="codeInline">new Function()</span> 1,000 times
            (pre-compiled to native JS) and reads each{' '}
            <span className="codeInline">computed()</span> once — under 1 ms.
          </p>
          <p className="cardText">
            <strong>Dispose cost:</strong> disposing N expressions that all
            share the same model is O(N²) in rs-x. Each{' '}
            <span className="codeInline">dispose()</span> removes a subscriber
            from a watcher list that still has N−i entries. For 1,000
            expressions this is ~{sameModelExpressionsRow.rsx.disposeMs.toFixed(0)} ms.
            Angular signals are garbage-collected — no explicit teardown cost.
          </p>
          <p className="cardText">
            <strong>Why update is slow:</strong> when{' '}
            <span className="codeInline">x</span> changes, all 1,000 expressions
            re-evaluate. Each walks a 60–120 node AST. Angular calls 1,000
            pre-compiled native functions. Real-world expressions (
            <span className="codeInline">price * quantity</span>,{' '}
            <span className="codeInline">isActive &amp;&amp; !isHidden</span>)
            have far fewer nodes and are much closer to the identifier-only
            benchmarks in scenarios 1 and 2.
          </p>
        </article>

        {/* ── Summary ───────────────────────────────────────────────────────── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Summary</h2>
          <p className="cardText">
            The right tool depends on what you are building:
          </p>
          <ul className="advancedTopicLinks">
            <li>
              <strong>Angular Signals</strong> are faster in every scenario. If
              you are writing TypeScript and can express your reactive logic as
              arrow functions in <span className="codeInline">computed()</span>,
              signals have lower binding cost and synchronous update propagation.
            </li>
            <li>
              <strong>rs-x</strong> is designed for string-expression binding —
              scenarios where expressions come from configuration, a server,
              user input, or a formula language. You bind a plain JavaScript
              object and write{' '}
              <span className="codeInline">model.price = 42</span> without any
              reactive boilerplate. rs-x also handles Observable and Promise
              fields transparently.
            </li>
            <li>
              For <strong>complex computed expressions</strong>, Angular&apos;s
              compiled functions are dramatically faster. rs-x&apos;s AST
              evaluator is designed for correctness and flexibility, not for
              competing with native function calls on deeply-nested arithmetic.
              Typical real-world expressions (identifiers, member access, simple
              arithmetic) are far cheaper and close the gap considerably.
            </li>
          </ul>
        </article>

        {/* ── Related ───────────────────────────────────────────────────────── */}
        <article className="card docsApiCard">
          <h2 className="cardTitle">Related</h2>
          <ul className="docsApiLinkGrid">
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance"
              >
                <ItemLinkCardContent
                  title="Performance"
                  meta="rs-x caching, watch sharing, and selective update internals"
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
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
