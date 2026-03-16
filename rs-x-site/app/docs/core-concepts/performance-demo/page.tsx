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
          <Link className="btn btnGhost" href="/docs/core-concepts/performance-report">
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
            Each column has one expression string. rs-x parses each unique
            column expression once, then clones it for each row binding.
          </p>
          <p className="cardText">
            Measured phases: parse ({' '}
            <span className="codeInline">y</span> expressions), bind ({' '}
            <span className="codeInline">x * y</span> bindings), single-row
            update, and bulk update.
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

