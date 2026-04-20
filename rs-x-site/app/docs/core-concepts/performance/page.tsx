import type { Metadata } from 'next';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { benchmarkMachine } from '../performance-report/performance-report.data';

export const metadata: Metadata = {
  title: 'Performance',
  description:
    'How rs-x stays fast at scale — engine modes, parsing, binding, updates, memory, and what changed in v2.',
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
            rs-x performance is dependent on a few factors:
          </p>
          <ul className="docsBulletList">
            <li>
              Expression complexity: this can affect parsing and evaluation
              times, Although both can be mitigated by preparsing and compiling
              expressions at build time. This is done by default. Most of the
              time expressions are just identifiers, so the complexity is
              minimal. Expression are also cached,so if you parse expression at
              runtime you only pay the cost once per unique expression string.
              So for table with 10,000 rows and 20 unique column expressions,
              rs-x only parses 20 expressions.
            </li>
            <li>
              Number of unique (model, field) pairs you bind to: for every
              unique (model, field) pair RS-X wil create a watch. This process
              is optimized by sharing watchers between expression. But still you
              can have a lot of watchers if you are not careful. For example,
              for a table with 1000 rows and 10 columns, 10000 watchers need to
              be created. Although rs-x can still deal with a large number of
              bindings it can affect the initial loading time. It doesnt affect
              the performance once the initial loading is done.
              <Link href="/docs/core-concepts/performance-demo">
                <span>
                  <strong> See Demo</strong>
                </span>
              </Link>
            </li>
            <li>
              Update frequency: as the number of changes increases, the cost of
              updates typically grows. In RS-X, this is less of a concern.
              Expression evaluation is efficient, and only the expressions that
              depend on the changed data are re-evaluated and emit change
              events. As a result, updates remain localized, even when changes
              occur frequently.
            </li>
          </ul>
          <p className="sectionLead" style={{ marginTop: '0.5rem' }}>
            All benchmarks on this page and its sub-pages were measured on{' '}
            {benchmarkMachine.cpu}, {benchmarkMachine.memory}, Node.js{' '}
            {benchmarkMachine.node}.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        {/* ── v2 changes ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">What changed in v2</h2>
          <p className="cardText">
            RS-X v2 uses a faster parser and the expression engine has been
            optimized. The headline numbers: parsing is up to 87% faster, live
            updates are 60–70% faster for typical expressions, and memory at
            scale is roughly halved. Binding cost appears higher than v1, but
            this is largely a cost shift: v2 resolves all expression
            dependencies and builds the full watch graph once at bind time, so
            every subsequent evaluation is a direct function call — no AST
            traversal. v1 deferred that dependency resolution to each
            evaluation, keeping bind cheap but making every update more
            expensive.
          </p>
          <p className="cardText">
            The full v1 vs v2 comparison — with numbers for every metric — is on
            the{' '}
            <Link href="/docs/core-concepts/performance-v1-v2">
              v1 vs v2 comparison page
            </Link>
            .
          </p>
          <table className="docsTable" style={{ marginTop: '0.75rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Area</th>
                <th style={{ textAlign: 'left' }}>v2 vs v1</th>
                <th style={{ textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Parsing</td>
                <td>Up to 87% faster</td>
                <td>Single-identifier expressions benefit most</td>
              </tr>
              <tr>
                <td>Binding (upfront)</td>
                <td>~10–30% slower</td>
                <td>
                  Full watch graph built once at bind; saves cost on every
                  update
                </td>
              </tr>
              <tr>
                <td>Updates (single field)</td>
                <td>Up to 70% faster</td>
                <td>Calls compiled function instead of walking AST</td>
              </tr>
              <tr>
                <td>Updates (bulk)</td>
                <td>Up to 60% faster</td>
                <td>V8 JIT optimises the compiled function</td>
              </tr>
              <tr>
                <td>Memory</td>
                <td>~50% less</td>
                <td>Compiled plans are shared across all bindings</td>
              </tr>
            </tbody>
          </table>
        </article>

        {/* ── Engine modes ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Two engine modes: compiled and tree</h2>
          <p className="cardText">
            rs-x can evaluate expressions in two modes.{' '}
            <strong>Tree mode</strong> walks the parsed AST on every update —
            straightforward, no upfront compilation cost, but evaluation time
            grows with expression complexity. <strong>Compiled mode</strong>{' '}
            uses the AOT compiler (
            <span className="codeInline">rs-x-compiler</span>) to generate a
            native JavaScript function for each expression at build time. At
            runtime, rs-x looks up the pre-generated function and calls it
            directly — no runtime compilation. V8 JIT-optimises these as regular
            JS function calls.
          </p>
          <p className="cardText">
            You select the mode per call site with the{' '}
            <span className="codeInline">compiled</span> option:
          </p>
          <pre className="codeBlock">{`rsx('price * quantity', { compiled: true })(model)
rsx('price * quantity', { compiled: false })(model)  // tree mode`}</pre>
          <p className="cardText">
            The break-even depends on expression complexity. For simple
            single-identifier expressions both modes are within a few percent of
            each other. For complex expressions with 15+ AST nodes, compiled
            mode is consistently faster for both binding and updates.
          </p>
          <p className="cardText">
            <Link href="/docs/core-concepts/compiled-vs-tree">
              Compiled vs tree: the break-even point →
            </Link>
          </p>
        </article>

        {/* ── Parsing ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Parsing: once per unique expression</h2>
          <p className="cardText">
            Every expression string goes through the parser exactly once. The
            parsed AST is stored in a cache keyed by the expression string.
            Every subsequent binding that uses the same string clones the cached
            AST — a clone is far cheaper than a full parse.
          </p>
          <p className="cardText">
            In a table with 10,000 rows and 20 unique column expressions, rs-x
            parses 20 times and clones 199,980 times. Parse cost is therefore a
            cold-start concern — first load, SSR, initial hydration — not a
            steady-state concern.
          </p>
          <p className="cardText">
            The <span className="codeInline">preparse</span> option lets you
            pre-populate the cache at startup so the first binding is as fast as
            every subsequent one:
          </p>
          <pre className="codeBlock">{`rsx('price * quantity', { preparse: true })  // parses at import time`}</pre>
          <p className="cardText">
            The <span className="codeInline">lazy</span> option defers loading
            the AOT-compiled plan module until the expression is first used.
            Only a lightweight manifest of expression strings is loaded at
            startup; the compiled plan itself is imported on demand. This is
            useful for large applications where many expressions are registered
            but only a subset are needed on any given page:
          </p>
          <pre className="codeBlock">{`rsx('price * quantity', { lazy: true })  // preparse deferred until first bind`}</pre>
          <p className="cardText">
            <Link href="/docs/core-concepts/performance-parse">
              Parse performance data and charts →
            </Link>
          </p>
        </article>

        {/* ── One watcher per field ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">One watcher per model field</h2>
          <p className="cardText">
            When an expression binds to a model, rs-x registers a watcher for
            each field the expression reads. If two expressions both read{' '}
            <span className="codeInline">price</span> on the same model object,
            they share one watcher — rs-x does not create a second one. The
            watcher is reference-counted and released when the last expression
            that uses it is disposed.
          </p>
          <p className="cardText">
            Watcher sharing helps when multiple expressions observe the same
            field on the same model instance — for example, two components both
            showing <span className="codeInline">price</span> from the same
            object create only one watcher between them. In a typical table
            where each row is its own model, sharing does not apply across rows:
            a 1,000-row × 10-column table creates 10,000 watchers (one per
            unique model–field pair). A field change notifies exactly the
            expressions that depend on that field — nothing more.
          </p>
          <p className="cardText">
            Even without sharing, watcher cost scales predictably. The
            identifier-only benchmark shows bind and update performance at scale
            for the common table pattern.
          </p>
          <p className="cardText">
            <Link href="/docs/core-concepts/performance-identifiers">
              Identifier-only binding performance →
            </Link>
          </p>
        </article>

        {/* ── Memory and dispose ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Memory and disposal</h2>
          <p className="cardText">
            rs-x uses a reference-counted binding graph. Every binding holds a
            reference to its expression and its watchers. When you call{' '}
            <span className="codeInline">.dispose()</span>, rs-x walks the graph
            in one pass and decrements all reference counts. Watchers whose
            count reaches zero are released. No manual teardown is needed beyond
            the single dispose call.
          </p>
          <p className="cardText">
            Memory usage scales predictably with binding count. In compiled
            mode, all bindings of the same expression share a single compiled
            plan — so the plan cost is paid once regardless of how many bindings
            exist. In tree mode, each binding holds its own copy of the
            expression tree.
          </p>
          <p className="cardText">
            For generated expressions where each binding has a unique expression
            string, compiled mode uses significantly less memory: at 1,000
            same-model generated expressions, compiled mode uses 515 MB vs 1,500
            MB in tree mode.
          </p>
          <p className="cardText">
            <Link href="/docs/core-concepts/performance-memory">
              Memory usage and disposal benchmarks →
            </Link>
          </p>
        </article>

        {/* ── Sub-page links ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Detailed benchmarks</h2>
          <ul className="docsApiLinkGrid">
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-parse"
              >
                <div className="docsApiLinkItemInner">
                  <strong>Parse performance: </strong>
                  <span>
                    Parse speed by expression size, preparse vs on-demand
                  </span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-identifiers"
              >
                <div className="docsApiLinkItemInner">
                  <strong>Identifier-only bindings: </strong>
                  <span>The most common real-world pattern at scale</span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/compiled-vs-tree"
              >
                <div className="docsApiLinkItemInner">
                  <strong>Compiled vs tree, the break-even point: </strong>
                  <span>At which expression complexity compiled mode wins</span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-memory"
              >
                <div className="docsApiLinkItemInner">
                  <strong>Memory and disposal: </strong>
                  <span>Heap usage, RSS, and disposal cost at scale</span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-v1-v2"
              >
                <div className="docsApiLinkItemInner">
                  <strong>V1 vs V2 comparison: </strong>
                  <span>Every metric compared between v1.0.0 and v2.0.0</span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                className="docsApiLinkItem"
                href="/docs/core-concepts/performance-demo"
              >
                <div className="docsApiLinkItemInner">
                  <strong>Live demo: </strong>
                  <span>
                    Run a configurable table benchmark in your browser
                  </span>
                </div>
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
