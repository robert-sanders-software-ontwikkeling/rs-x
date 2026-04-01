import type { Metadata } from 'next';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { PerformanceBarChart } from '../performance-report/performance-report-charts.client';

import {
  bindCrossoverRows,
  crossoverMachine,
  updateCrossoverRows,
} from './compiled-vs-tree.data';

// ─── Chart data ───────────────────────────────────────────────────────────────

const bindChartRows = bindCrossoverRows.map((row) => ({
  label: String(row.nodeCount),
  xValue: row.nodeCount,
  values: { treeMs: row.tree.bindMs, compiledMs: row.compiled.bindMs },
}));

const bulkUpdateChartRows = updateCrossoverRows.map((row) => ({
  label: String(row.nodeCount),
  xValue: row.nodeCount,
  values: { treeMs: row.tree.bulkUpdateMs, compiledMs: row.compiled.bulkUpdateMs },
}));

const singleUpdateChartRows = updateCrossoverRows.map((row) => ({
  label: String(row.nodeCount),
  xValue: row.nodeCount,
  values: { treeMs: row.tree.singleUpdateMs, compiledMs: row.compiled.singleUpdateMs },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtMs = (ms: number) =>
  ms >= 10 ? `${ms.toFixed(0)} ms` : ms >= 1 ? `${ms.toFixed(1)} ms` : `${ms.toFixed(3)} ms`;

// ─── Page ────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Compiled vs Tree: the break-even point',
  description:
    'At which expression complexity does compiled mode become faster than tree mode for binding and updates?',
};

export default function CompiledVsTreePage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Compiled vs tree: the break-even point' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Compiled vs tree: the break-even point</h1>
          <p className="sectionLead">
            rs-x runs in two modes. Tree mode evaluates expressions by walking
            the parsed AST. Compiled mode compiles each expression to a native
            JavaScript function once, then calls it on every update. Both modes
            are correct, but they have different performance profiles depending
            on how complex your expressions are.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">

        {/* ── Why the modes differ ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Why the costs differ</h2>
          <p className="cardText">
            Every expression is parsed into an AST. The number of nodes in that
            AST grows with expression complexity — a simple{' '}
            <span className="codeInline">price</span> has 1 node;{' '}
            <span className="codeInline">price * quantity * (1 - discount)</span>{' '}
            has 7; a deeply nested arithmetic expression can have hundreds.
          </p>
          <p className="cardText">
            <strong>Tree mode</strong> clones the full AST for each new binding.
            Clone cost is proportional to node count. On every update, it walks
            all nodes again to evaluate the expression — also proportional to
            node count.
          </p>
          <p className="cardText">
            <strong>Compiled mode</strong> compiles the expression to a JS
            function once (at first bind), caches the compiled plan, and shares
            it across all bindings. Each binding just records which model fields
            to watch — the plan stores only the{' '}
            <em>unique dependencies</em>, not the full AST. On every update, it
            calls the compiled function directly, which V8 can JIT optimise as a
            native function.
          </p>
          <p className="cardText">
            The benchmark below uses expressions of the form{' '}
            <span className="codeInline">x + y + x + y + …</span> — always
            exactly 2 unique dependencies (<span className="codeInline">x</span>{' '}
            and <span className="codeInline">y</span>), regardless of how many
            nodes the expression has. This isolates the effect of AST size while
            keeping the dependency count constant.
            {' '}Measured on {crossoverMachine.cpuModel}, Node.js{' '}
            {crossoverMachine.nodeVersion},{' '}
            {crossoverMachine.bindings.toLocaleString()} bindings.
          </p>
        </article>

        {/* ── Bind time crossover ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Bind time vs expression size</h2>
          <p className="cardText">
            Creating a new binding requires setting up one watcher entry per
            unique dependency. In compiled mode, the bind cost scales with the
            number of unique dependencies — not the total node count. Because the
            benchmark expressions always have exactly 2 unique dependencies (
            <span className="codeInline">x</span> and{' '}
            <span className="codeInline">y</span>) regardless of how many nodes
            the expression has, the compiled bind cost stays nearly flat as node
            count grows. In tree mode, the full AST must be cloned — the cost
            grows linearly with node count.
          </p>
          <p className="cardText">
            The lines cross at approximately{' '}
            <strong>~{crossoverMachine.bindCrossoverNodes} nodes</strong>. Above
            that point, compiled mode is consistently faster for binding, and the
            advantage grows rapidly with expression size.
          </p>
          <PerformanceBarChart
            ariaLabel="Bind time vs AST node count — compiled vs tree"
            rows={bindChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
            ]}
            valueUnit="ms"
            decimals={1}
            xAxisLabel="AST nodes"
            yAxisLabel="Bind time (ms, 1000 bindings)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>AST nodes</th>
                <th style={{ textAlign: 'left' }}>Tree bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled bind (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled faster by</th>
              </tr>
            </thead>
            <tbody>
              {bindCrossoverRows.map((row) => {
                const speedup = row.tree.bindMs / row.compiled.bindMs;
                const label =
                  speedup >= 1.05
                    ? `${speedup.toFixed(1)}×`
                    : row.compiled.bindMs / row.tree.bindMs >= 1.05
                      ? `tree ${(row.compiled.bindMs / row.tree.bindMs).toFixed(1)}× faster`
                      : 'equal';
                return (
                  <tr key={row.nodeCount}>
                    <td>{row.nodeCount}</td>
                    <td>{fmtMs(row.tree.bindMs)}</td>
                    <td>{fmtMs(row.compiled.bindMs)}</td>
                    <td>{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        {/* ── Bulk update crossover ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Bulk update time vs expression size</h2>
          <p className="cardText">
            When all 1,000 models change at once, every binding re-evaluates. In
            tree mode, re-evaluation walks the full AST — the cost grows with
            node count. In compiled mode, re-evaluation calls the pre-compiled
            JS function — the cost stays nearly flat because V8 treats it as a
            native function call.
          </p>
          <p className="cardText">
            The lines cross at approximately{' '}
            <strong>~{crossoverMachine.bulkUpdateCrossoverNodes} nodes</strong>.
            At 359 nodes, compiled bulk updates are{' '}
            <strong>7× faster</strong> than tree.
          </p>
          <PerformanceBarChart
            ariaLabel="Bulk update time vs AST node count — compiled vs tree"
            rows={bulkUpdateChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
            ]}
            valueUnit="ms"
            decimals={2}
            xAxisLabel="AST nodes"
            yAxisLabel="Bulk update time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>AST nodes</th>
                <th style={{ textAlign: 'left' }}>Tree update (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled update (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled faster by</th>
              </tr>
            </thead>
            <tbody>
              {updateCrossoverRows.map((row) => {
                const speedup = row.tree.bulkUpdateMs / row.compiled.bulkUpdateMs;
                const label =
                  speedup >= 1.05
                    ? `${speedup.toFixed(1)}×`
                    : row.compiled.bulkUpdateMs / row.tree.bulkUpdateMs >= 1.05
                      ? `tree ${(row.compiled.bulkUpdateMs / row.tree.bulkUpdateMs).toFixed(1)}× faster`
                      : 'equal';
                return (
                  <tr key={row.nodeCount}>
                    <td>{row.nodeCount}</td>
                    <td>{fmtMs(row.tree.bulkUpdateMs)}</td>
                    <td>{fmtMs(row.compiled.bulkUpdateMs)}</td>
                    <td>{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        {/* ── Single update crossover ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Single update time vs expression size</h2>
          <p className="cardText">
            When one model field changes, one binding re-evaluates. The same
            pattern holds: tree mode re-walks the AST (cost grows with size),
            compiled mode calls the pre-compiled function (cost stays flat).
            Because only one binding fires, the absolute times are very small —
            tenths of a millisecond — but the crossover is still visible around{' '}
            <strong>~{crossoverMachine.singleUpdateCrossoverNodes} nodes</strong>.
          </p>
          <PerformanceBarChart
            ariaLabel="Single update time vs AST node count — compiled vs tree"
            rows={singleUpdateChartRows}
            series={[
              { key: 'treeMs', label: 'Tree', barClassName: 'isPrimary' },
              { key: 'compiledMs', label: 'Compiled', barClassName: 'isSecondary' },
            ]}
            valueUnit="ms"
            decimals={3}
            xAxisLabel="AST nodes"
            yAxisLabel="Single update time (ms)"
            xScale="log"
            yScale="log"
          />
          <table className="docsTable">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>AST nodes</th>
                <th style={{ textAlign: 'left' }}>Tree update (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled update (ms)</th>
                <th style={{ textAlign: 'left' }}>Compiled faster by</th>
              </tr>
            </thead>
            <tbody>
              {updateCrossoverRows.map((row) => {
                const speedup = row.tree.singleUpdateMs / row.compiled.singleUpdateMs;
                const label =
                  speedup >= 1.05
                    ? `${speedup.toFixed(1)}×`
                    : row.compiled.singleUpdateMs / row.tree.singleUpdateMs >= 1.05
                      ? `tree ${(row.compiled.singleUpdateMs / row.tree.singleUpdateMs).toFixed(1)}× faster`
                      : 'equal';
                return (
                  <tr key={row.nodeCount}>
                    <td>{row.nodeCount}</td>
                    <td>{fmtMs(row.tree.singleUpdateMs)}</td>
                    <td>{fmtMs(row.compiled.singleUpdateMs)}</td>
                    <td>{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>

        {/* ── Practical guidance ── */}
        <article className="card docsApiCard" style={{ gridColumn: '1 / -1' }}>
          <h2 className="cardTitle">Which mode should you use?</h2>
          <p className="cardText">
            For most real-world expressions — arithmetic, member chains,
            conditionals — the break-even is reached almost immediately. The
            advantage compounds with expression complexity: a deeply nested
            formula with 100+ nodes binds 6–9× faster in compiled mode and
            updates 3–7× faster.
          </p>
          <p className="cardText">
            To opt in to compiled mode, pass{' '}
            <span className="codeInline">{'{ compiled: true }'}</span> as the
            second argument:{' '}
            <span className="codeInline">{'rsx(expression, { compiled: true })(model)'}</span>.
            To use tree mode, omit the option or pass{' '}
            <span className="codeInline">{'{ compiled: false }'}</span>. Tree
            mode may be preferable if you have a large number of very simple
            single-identifier expressions and minimising JIT warm-up time
            matters more than update throughput.
          </p>
          <p className="cardText">
            The benchmark expressions here always have exactly 2 unique
            dependencies. The real crossover in your application depends on your
            specific expression shapes. Expressions with more unique dependencies
            but fewer nodes (e.g. a flat sum of many different fields) will see a
            later crossover for bind time; expressions with many nodes but few
            unique dependencies (e.g. a complex formula reusing the same fields)
            will see a much earlier one.
          </p>
        </article>

      </div>
    </DocsPageTemplate>
  );
}
