import Link from 'next/link';
import type { Metadata } from 'next';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

import {
  angularSignalsComparisonBenchmark,
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
    values: {
      rsxCompiledMs: r.rsxCompiled.bindMs,
      rsxTreeMs: r.rsxTree.bindMs,
      angularMs: r.angular.bindMs,
    },
  }));

const toSingleUpdateChartRows = (rows: typeof syncIdentifierRows) =>
  rows.map((r) => ({
    label: r.bindings.toLocaleString(),
    xValue: r.bindings,
    values: {
      rsxCompiledMs: r.rsxCompiled.singleUpdateMs,
      rsxTreeMs: r.rsxTree.singleUpdateMs,
      angularMs: r.angular.singleUpdateMs,
    },
  }));

const toBulkChartRows = (rows: typeof syncIdentifierRows) =>
  rows.map((r) => ({
    label: r.bindings.toLocaleString(),
    xValue: r.bindings,
    values: {
      rsxCompiledMs: r.rsxCompiled.bulkUpdateMs,
      rsxTreeMs: r.rsxTree.bulkUpdateMs,
      angularMs: r.angular.bulkUpdateMs,
    },
  }));

const syncBindChartRows = toBindChartRows(syncIdentifierRows);
const syncSingleUpdateChartRows = toSingleUpdateChartRows(syncIdentifierRows);
const syncBulkChartRows = toBulkChartRows(syncIdentifierRows);
const asyncBindChartRows = toBindChartRows(asyncIdentifierRows);
const asyncSingleUpdateChartRows = toSingleUpdateChartRows(asyncIdentifierRows);
const asyncBulkChartRows = toBulkChartRows(asyncIdentifierRows);

const threeSeriesMs = [
  {
    key: 'rsxCompiledMs',
    label: 'rs-x compiled',
    barClassName: 'isPrimary',
  },
  {
    key: 'rsxTreeMs',
    label: 'rs-x tree',
    barClassName: 'isSecondary',
  },
  {
    key: 'angularMs',
    label: 'Angular Signals',
    barClassName: 'isTertiary',
  },
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
            bind it to any plain object; Angular Signals require you to express
            the same computation as a JavaScript arrow function inside{' '}
            <span className="codeInline">computed()</span>. rs-x pays a parsing
            cost once at bind time and then evaluates an AST on each change;
            Angular Signals run native compiled JavaScript.
          </p>
          <p className="cardText">
            rs-x is completely independent of Angular — it has no framework
            dependency and works with any plain JavaScript object.
          </p>
          <p className="cardText">
            Benchmarks were run with{' '}
            <span className="codeInline">
              node --expose-gc --max-old-space-size=4096
            </span>{' '}
            on Apple M4, Node.js v25.4.0. Times are medians of multiple runs
            with forced GC between sizes.
          </p>
          <p className="cardText">
            Snapshot date:{' '}
            <span className="codeInline">
              {angularSignalsComparisonBenchmark.date}
            </span>
            . rs-x source reports:{' '}
            <span className="codeInline">
              {angularSignalsComparisonBenchmark.compiledReport}
            </span>{' '}
            and{' '}
            <span className="codeInline">
              {angularSignalsComparisonBenchmark.treeReport}
            </span>
            .
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
            series={threeSeriesMs}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>rs-x compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular (ms)</th>
              </tr>
            </thead>
            <tbody>
              {syncIdentifierRows.map((row) => (
                <tr key={`sync-bind-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsxCompiled.bindMs.toFixed(2)}</td>
                  <td>{row.rsxTree.bindMs.toFixed(2)}</td>
                  <td>{row.angular.bindMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cardSubtitle" style={{ marginTop: '1.25rem' }}>Single update time</h3>
          <p className="cardText">
            One field changes on one model; only that expression re-evaluates.
            Both systems are effectively O(1) — cost does not grow with total
            binding count. rs-x is ~0.07–0.10 ms because it schedules a
            microtask before re-evaluating. Angular is ~0.009–0.012 ms because
            it re-evaluates synchronously on the next read.
          </p>
          <PerformanceBarChart
            ariaLabel="Sync identifier single update time: rs-x vs Angular Signals"
            rows={syncSingleUpdateChartRows}
            series={threeSeriesMs}
            valueUnit="ms"
            decimals={4}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>rs-x compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular (ms)</th>
              </tr>
            </thead>
            <tbody>
              {syncIdentifierRows.map((row) => (
                <tr key={`sync-single-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsxCompiled.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.rsxTree.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.angular.singleUpdateMs.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cardSubtitle" style={{ marginTop: '1.25rem' }}>Bulk update time</h3>
          <p className="cardText">
            All N fields change; all N expressions re-evaluate. Both are O(N).
            Angular is faster because it skips the microtask scheduler and
            evaluates native compiled JavaScript directly.
          </p>
          <PerformanceBarChart
            ariaLabel="Sync identifier bulk update time: rs-x vs Angular Signals"
            rows={syncBulkChartRows}
            series={threeSeriesMs}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>rs-x compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular (ms)</th>
              </tr>
            </thead>
            <tbody>
              {syncIdentifierRows.map((row) => (
                <tr key={`sync-bulk-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsxCompiled.bulkUpdateMs.toFixed(2)}</td>
                  <td>{row.rsxTree.bulkUpdateMs.toFixed(2)}</td>
                  <td>{row.angular.bulkUpdateMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
            series={threeSeriesMs}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>rs-x compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular (ms)</th>
              </tr>
            </thead>
            <tbody>
              {asyncIdentifierRows.map((row) => (
                <tr key={`async-bind-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsxCompiled.bindMs.toFixed(2)}</td>
                  <td>{row.rsxTree.bindMs.toFixed(2)}</td>
                  <td>{row.angular.bindMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cardSubtitle" style={{ marginTop: '1.25rem' }}>Single update time</h3>
          <p className="cardText">
            One subject emits; one expression updates. O(1) for both — cost
            does not grow with binding count. rs-x ~0.05 ms (microtask
            overhead); Angular ~0.011–0.017 ms (synchronous read).
          </p>
          <PerformanceBarChart
            ariaLabel="Async identifier single update time: rs-x vs Angular Signals"
            rows={asyncSingleUpdateChartRows}
            series={threeSeriesMs}
            valueUnit="ms"
            decimals={4}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>rs-x compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular (ms)</th>
              </tr>
            </thead>
            <tbody>
              {asyncIdentifierRows.map((row) => (
                <tr key={`async-single-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsxCompiled.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.rsxTree.singleUpdateMs.toFixed(4)}</td>
                  <td>{row.angular.singleUpdateMs.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="cardSubtitle" style={{ marginTop: '1.25rem' }}>Bulk update time</h3>
          <p className="cardText">
            All N subjects emit; all N expressions update. O(N) for both.
            Angular stays faster due to synchronous propagation; rs-x adds a
            per-emission microtask cost.
          </p>
          <PerformanceBarChart
            ariaLabel="Async identifier bulk update time: rs-x vs Angular Signals"
            rows={asyncBulkChartRows}
            series={threeSeriesMs}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="Bindings"
            yAxisLabel="Time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>rs-x compiled (ms)</th>
                <th style={{ textAlign: 'left' }}>rs-x tree (ms)</th>
                <th style={{ textAlign: 'left' }}>Angular (ms)</th>
              </tr>
            </thead>
            <tbody>
              {asyncIdentifierRows.map((row) => (
                <tr key={`async-bulk-${row.bindings}`}>
                  <td>{row.bindings.toLocaleString()}</td>
                  <td>{row.rsxCompiled.bulkUpdateMs.toFixed(2)}</td>
                  <td>{row.rsxTree.bulkUpdateMs.toFixed(2)}</td>
                  <td>{row.angular.bulkUpdateMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <td>rs-x compiled</td>
                <td>{sameModelExpressionsRow.rsxCompiled.bindMs.toFixed(3)}</td>
                <td>{sameModelExpressionsRow.rsxCompiled.disposeMs.toFixed(3)}</td>
                <td>{sameModelExpressionsRow.rsxCompiled.singleUpdateMs.toFixed(3)}</td>
                <td>{sameModelExpressionsRow.rsxCompiled.bulkUpdateMs.toFixed(3)}</td>
              </tr>
              <tr>
                <td>rs-x tree</td>
                <td>{sameModelExpressionsRow.rsxTree.bindMs.toFixed(3)}</td>
                <td>{sameModelExpressionsRow.rsxTree.disposeMs.toFixed(3)}</td>
                <td>{sameModelExpressionsRow.rsxTree.singleUpdateMs.toFixed(3)}</td>
                <td>{sameModelExpressionsRow.rsxTree.bulkUpdateMs.toFixed(3)}</td>
              </tr>
              <tr>
                <td>Angular Signals</td>
                <td>{sameModelExpressionsRow.angular.bindMs.toFixed(3)}</td>
                <td>GC</td>
                <td>
                  {sameModelExpressionsRow.angular.singleUpdateMs.toFixed(3)}
                </td>
                <td>
                  {sameModelExpressionsRow.angular.bulkUpdateMs.toFixed(3)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="cardText" style={{ marginTop: '1rem' }}>
            <strong>Bind cost (create+init):</strong> compiled mode avoids AST
            walking at update time and reduces this shape to{' '}
            {sameModelExpressionsRow.rsxCompiled.bindMs.toFixed(3)} ms vs tree
            mode at {sameModelExpressionsRow.rsxTree.bindMs.toFixed(3)} ms.
            Angular still leads because it runs native computed functions
            directly ({sameModelExpressionsRow.angular.bindMs.toFixed(3)} ms).
          </p>
          <p className="cardText">
            <strong>Dispose cost:</strong> compiled mode is{' '}
            {sameModelExpressionsRow.rsxCompiled.disposeMs.toFixed(3)} ms and
            tree mode is {sameModelExpressionsRow.rsxTree.disposeMs.toFixed(3)} ms
            for 1,000 shared-model expressions. Angular signals are
            garbage-collected — no explicit teardown cost.
          </p>
          <p className="cardText">
            <strong>Why update is still slower than Angular:</strong> even in
            compiled mode, rs-x still pays ownership/watch bookkeeping and
            scheduling overhead around expression invalidation. Angular calls
            native functions from{' '}
            <span className="codeInline">new Function()</span> 1,000 times
            and reads each <span className="codeInline">computed()</span>. Real-world
            expressions (
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
            Angular Signals are faster in these benchmarks. The practical
            question is not raw speed in isolation, but whether users can
            perceive the difference in real screens and interactions.
          </p>
          <p className="cardText">
            With compiled expressions enabled, rs-x remains very fast for
            typical app workloads, while giving you capabilities that are hard
            to match with purely code-defined reactivity.
          </p>
          <p className="cardText">
            rs-x is designed to make reactivity <em>transparent</em>. You
            define a model as a plain JavaScript object — no signals, no
            decorators, no reactive wrappers. You write an expression string.
            rs-x handles the rest: it detects which fields the expression reads,
            watches them for changes, recomputes automatically, propagates the
            result, and cleans up when the binding is released. Change detection
            is not something you configure — it is solved for you.
          </p>
          <p className="cardText">
            Observable and Promise fields are handled the same way. A field that
            holds a <span className="codeInline">BehaviorSubject</span> or a{' '}
            <span className="codeInline">Promise</span> is not a special case —
            rs-x subscribes transparently and the expression evaluates to the
            resolved value. No extra API, no{' '}
            <span className="codeInline">toSignal()</span>, no unwrapping in the
            expression.
          </p>
          <p className="cardText">
            With Angular Signals, you are responsible for every part of the
            reactive graph: declaring each field as a signal, deriving each
            computed value explicitly, handling async separately with{' '}
            <span className="codeInline">toSignal()</span>, and cleaning up with{' '}
            <span className="codeInline">DestroyRef</span> or{' '}
            <span className="codeInline">takeUntilDestroyed</span>. For
            deeply-nested arithmetic evaluated at high frequency, that control
            is worth it — native compiled functions are dramatically faster than
            AST evaluation. For typical SPA bindings (identifiers, member
            access, simple arithmetic), compiled rs-x is generally within
            response-time limits users can feel, and rs-x can compensate with flexibility:
            runtime expression strings, automatic dependency wiring, transparent
            async handling, and framework-agnostic usage.
          </p>
          <p className="cardText">
            Speed matters most when users notice latency. If a workload is
            truly compute-bound and evaluated at very high frequency, Angular
            Signals is the stronger raw-performance choice. If your priority is
            expressive runtime behavior with minimal reactive boilerplate,
            compiled rs-x gives strong performance with a broader feature set.
          </p>
          <p className="cardText">
            <strong>String expressions do not mean losing type safety.</strong>{' '}
            rs-x ships a <strong>VS Code extension</strong> and a{' '}
            <strong>build-time compiler plugin</strong> that read your model
            types and provide full IntelliSense, autocomplete, and compile-time
            errors inside expression strings. Invalid expressions are caught
            before they ship.
          </p>
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
