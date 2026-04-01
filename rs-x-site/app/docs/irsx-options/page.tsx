import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'IRsxOptions',
  description: 'Reference for IRsxOptions in @rs-x/expression-parser.',
};

const apiCode = dedent`
  export interface IRsxOptions {
    readonly preparse?: boolean;
    readonly lazy?: boolean;
    readonly compiled?: boolean;
  }
`;

const usageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';

  const model = { a: 1, b: 2 };

  const expr = rsx<number>('a + b', {
    preparse: true,
    lazy: false,
    compiled: true,
  })(model);
`;

export default function IRsxOptionsDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'IRsxOptions' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">IRsxOptions</h1>
          <p className="sectionLead">
            Optional options object passed to{' '}
            <span className="codeInline">rsx(expression, options)</span>.
          </p>
        </div>
        <div className="docsApiActions">
          <Link className="btn btnGhost" href="/docs/rsx-function">
            rsx function <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            <span className="codeInline">preparse</span>,{' '}
            <span className="codeInline">lazy</span>, and{' '}
            <span className="codeInline">compiled</span> are compiler/AOT hints
            on expression declaration sites.
          </p>
          <p className="cardText">
            They are not runtime watcher/binding arguments. Runtime binding
            arguments stay on the returned binder function:
            <span className="codeInline"> (model, leafIndexWatchRule?)</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'preparse?',
                type: 'boolean',
                description:
                  'Enable/disable preparsed AST generation for this expression site.',
              },
              {
                name: 'lazy?',
                type: 'boolean',
                description:
                  'Mark this expression site as lazy for build-time cache generation.',
              },
              {
                name: 'compiled?',
                type: 'boolean',
                description:
                  'Enable/disable compiled-plan generation for this expression site (default true).',
              },
            ]}
          />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Defaults</h2>
          <p className="cardText">
            <span className="codeInline">preparse</span> defaults to{' '}
            <span className="codeInline">true</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">lazy</span> defaults to{' '}
            <span className="codeInline">false</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">compiled</span> defaults to{' '}
            <span className="codeInline">true</span>.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="API and usage">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />

          <div className="qsCodeHeader">
            <div className="qsCodeTitle">Usage example</div>
          </div>
          <SyntaxCodeBlock code={usageCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
