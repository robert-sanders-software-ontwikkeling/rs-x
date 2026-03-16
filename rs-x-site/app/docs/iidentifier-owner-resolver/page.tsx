import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'IIdentifierOwnerResolver',
  description:
    'Contract for resolving the owning object of an identifier in @rs-x/expression-parser.',
};

const apiCode = dedent`
  export interface IIdentifierOwnerResolver {
    resolve(index: unknown, context?: unknown): object | null;
  }
`;

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/identifier-owner-resolver.interface.ts',
);

export default function IIdentifierOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'IIdentifierOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">IIdentifierOwnerResolver</h1>
          <p className="sectionLead">
            Contract for resolving which object in the current context owns a
            given identifier. Implement this interface to add a custom
            owner-lookup strategy.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/identifier-owner-resolver.interface.ts
                </span>
              </a>
            </p>
          </div>
        </div>
        <div className="docsApiActions">
          <Link
            className="btn btnGhost"
            href="/docs/default-identifier-owner-resolver"
          >
            DefaultIdentifierOwnerResolver <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            Each identifier in an expression (e.g.{' '}
            <span className="codeInline">a</span> in{' '}
            <span className="codeInline">a + b</span>) must be resolved to an
            owner — the object that holds it.{' '}
            <span className="codeInline">resolve(index, context)</span> returns
            that owner object, or <span className="codeInline">null</span> to
            skip to the next resolver in the list.
          </p>
          <p className="cardText">
            The default implementation{' '}
            <Link href="/docs/default-identifier-owner-resolver">
              DefaultIdentifierOwnerResolver
            </Link>{' '}
            iterates an ordered list of{' '}
            <span className="codeInline">IIdentifierOwnerResolver</span>{' '}
            instances and returns the first non-null result.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Method</h2>
          <p className="cardText">
            <span className="codeInline">resolve(index, context)</span>
          </p>
          <p className="cardText">
            <strong>index</strong> — The identifier being resolved (typically a
            property name, numeric index, or map/set key).
          </p>
          <p className="cardText">
            <strong>context</strong> — The object in which the identifier is
            being looked up. May be{' '}
            <span className="codeInline">undefined</span> when resolving
            root-level globals.
          </p>
          <p className="cardText">
            Returns the owning <span className="codeInline">object</span> if
            this resolver claims the identifier, or{' '}
            <span className="codeInline">null</span> to defer to the next
            resolver.
          </p>
        </article>

        <aside
          className="qsCodeCard docsApiCode"
          aria-label="IIdentifierOwnerResolver API"
        >
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
