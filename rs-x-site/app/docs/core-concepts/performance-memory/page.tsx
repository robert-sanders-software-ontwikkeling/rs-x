import type { Metadata } from 'next';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { MemoryUsageTabs } from '../performance-report/memory-usage-tabs.client';
import {
  benchmarkMachine,
  bindingStressGcEvidenceRows,
  expressionEngineModeMemoryRows,
  memoryUsageRows,
} from '../performance-report/performance-report.data';

export const metadata: Metadata = {
  title: 'Memory and disposal performance',
  description:
    'Heap and RSS usage at scale, compiled vs tree memory comparison, and disposal cost.',
};

export default function PerformanceMemoryPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance', href: '/docs/core-concepts/performance' },
              { label: 'Memory and disposal' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts · Performance</p>
          <h1 className="sectionTitle">Memory and disposal</h1>
          <p className="sectionLead">
            rs-x uses a reference-counted binding graph. Watchers are shared
            across bindings and released when the last consumer disposes. Memory
            grows predictably with binding count and expression complexity — and
            compiled mode significantly reduces memory for expressions that are
            bound many times. Measured on {benchmarkMachine.cpu}, Node.js{' '}
            {benchmarkMachine.node}.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        {/* ── How memory works ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">How rs-x uses memory</h2>
          <p className="cardText">Every binding holds references to:</p>
          <ul className="cardText" style={{ marginLeft: '1.25rem' }}>
            <li>
              The expression instance (AST nodes in tree mode; a compiled plan
              reference in compiled mode)
            </li>
            <li>One watcher entry per unique dependency field</li>
            <li>A subscription to each watcher it depends on</li>
          </ul>
          <p className="cardText">
            In <strong>tree mode</strong>, each binding holds its own copy of
            the full expression tree — cloned from the cached template. Memory
            grows with both binding count and expression complexity.
          </p>
          <p className="cardText">
            In <strong>compiled mode</strong>, all bindings of the same
            expression share a single compiled plan object. The plan is compiled
            once and stored in a plan cache that persists across bindings. Only
            the per-binding watcher entries are duplicated. For workloads where
            many bindings use the same expression string, compiled mode uses
            dramatically less memory.
          </p>
        </article>

        {/* ── Compiled vs tree memory ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Compiled vs tree: memory comparison</h2>
          <p className="cardText">
            The table below compares heap and RSS usage for compiled and tree
            mode across three binding scenarios: sync identifier, async
            identifier (Observable), and same-model generated expressions (1,000
            unique complex expressions bound to the same model).
          </p>
          <p className="cardText">
            For simple identifier bindings, both modes use similar memory — the
            expression tree is a single node, so there is little to share. For
            complex generated expressions, the difference is stark: compiled
            mode uses ~515 MB vs ~1,500 MB in tree mode at 1,000 bindings —
            roughly 3× less.
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Scenario</th>
                <th style={{ textAlign: 'left' }}>Metric</th>
                <th style={{ textAlign: 'left' }}>Compiled heap (MB)</th>
                <th style={{ textAlign: 'left' }}>Tree heap (MB)</th>
                <th style={{ textAlign: 'left' }}>Compiled RSS (MB)</th>
                <th style={{ textAlign: 'left' }}>Tree RSS (MB)</th>
              </tr>
            </thead>
            <tbody>
              {expressionEngineModeMemoryRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.scenario}</td>
                  <td>{row.metric}</td>
                  <td>{row.compiledHeapMedianMb.toFixed(0)}</td>
                  <td>{row.treeHeapMedianMb.toFixed(0)}</td>
                  <td>{row.compiledPeakRssMb.toFixed(0)}</td>
                  <td>{row.treePeakRssMb.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '0.75rem' }}>
            <strong>Conclusion:</strong> for applications binding many different
            complex expressions, compiled mode's plan-sharing makes a
            significant memory difference. For simple identifier-only bindings,
            the difference is negligible and either mode is fine.
          </p>
        </article>

        {/* ── Disposal ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Disposal: O(N) and predictable</h2>
          <p className="cardText">
            Calling <span className="codeInline">.dispose()</span> on a binding
            decrements the reference count for each dependency watcher. When a
            watcher's count reaches zero it is removed. rs-x walks the binding
            graph in one pass — each removal is O(1) because watchers are stored
            in a <span className="codeInline">Map</span>. Total dispose cost for
            N bindings is O(N).
          </p>
          <p className="cardText">
            The table below shows bind time, dispose time, and GC time for
            progressively larger binding sets. Dispose time is 10–15× faster
            than bind time, and GC time after disposal is low — rs-x does not
            accumulate unreachable objects that require multiple GC cycles to
            collect.
          </p>
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Bindings</th>
                <th style={{ textAlign: 'left' }}>Bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Dispose (ms)</th>
                <th style={{ textAlign: 'left' }}>GC after (ms)</th>
                <th style={{ textAlign: 'left' }}>Heap after (MB)</th>
                <th style={{ textAlign: 'left' }}>RSS after (MB)</th>
              </tr>
            </thead>
            <tbody>
              {bindingStressGcEvidenceRows.map((row) => (
                <tr key={row.expressionCount}>
                  <td>{row.expressionCount.toLocaleString()}</td>
                  <td>{row.bindMedianMs.toFixed(0)}</td>
                  <td>{row.disposeMedianMs.toFixed(0)}</td>
                  <td>{row.gcMedianMs.toFixed(0)}</td>
                  <td>{row.heapAfterMedianMb.toFixed(0)}</td>
                  <td>{row.rssAfterMedianMb.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cardText" style={{ marginTop: '0.75rem' }}>
            <strong>Conclusion:</strong> disposal is fast and memory is cleanly
            reclaimed. No manual teardown is needed beyond a single{' '}
            <span className="codeInline">.dispose()</span> call. GC runs quickly
            after disposal because the binding graph is fully disconnected.
          </p>
        </article>

        {/* ── Full memory usage ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Memory usage — full breakdown</h2>
          <p className="cardText">
            The tabs below show median heap and peak RSS across all measured
            scenarios and binding counts.
          </p>
          <MemoryUsageTabs rows={memoryUsageRows} />
        </article>
      </div>
    </DocsPageTemplate>
  );
}
