import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import { PerformanceDemoClient } from './performance-demo.client';

export const metadata = {
  title: 'Performance live demo',
  description:
    'Run a live rs-x table benchmark in your browser with configurable rows and columns.',
};

export default function PerformanceDemoPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader docsApiHeaderTitleAlign">
        <div className="docsApiTitleBlock">
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Performance demo' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Performance live demo</h1>
        </div>
        <div className="docsApiActions docsApiActionsTitle">
          <Link
            className="btn btnGhost"
            href="/docs/core-concepts/performance-report"
          >
            Back to report <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <p className="sectionLead docsApiLead">
        Configure a big-table scenario ({' '}
        <span className="codeInline">rows × columns</span> ) and run a live
        benchmark in your browser.
      </p>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">How this demo works</h2>
          <p className="cardText">
            Each column uses the expression{' '}
            <span className="codeInline">v[i] + v[i+1]</span>: column 0 computes{' '}
            <span className="codeInline">v0 + v1</span>, column 1 computes{' '}
            <span className="codeInline">v1 + v2</span>, and so on. Each row
            model holds numeric fields <span className="codeInline">v0</span>{' '}
            through <span className="codeInline">v[columns]</span>.
          </p>
          <p className="cardText">
            rs-x parses each unique column expression once, caches the tree,
            then clones it for every row binding. So parsing is{' '}
            <span className="codeInline">columns</span> operations regardless of
            row count, and binding is{' '}
            <span className="codeInline">rows × columns</span> operations.
          </p>
          <p className="cardText">
            Rows and columns change in steps ({' '}
            <span className="codeInline">+100</span> rows,{' '}
            <span className="codeInline">+5</span> columns) up to{' '}
            <span className="codeInline">2,000 rows × 20 columns</span>. After
            the run all rows of computed expression values are shown in a
            scrollable table so you can verify the bindings are live.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Run benchmark</h2>
          <PerformanceDemoClient />
        </article>
      </div>
    </DocsPageTemplate>
  );
}
