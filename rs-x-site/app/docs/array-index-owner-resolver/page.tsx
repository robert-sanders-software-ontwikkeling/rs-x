import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'ArrayIndexOwnerResolver',
  description:
    'IIdentifierOwnerResolver that resolves numeric index identifiers on Array contexts.',
};

const apiCode = dedent`
  @Injectable()
  export class ArrayIndexOwnerResolver implements IIdentifierOwnerResolver {
    public resolve(index: string | number, array: unknown[]): object | null;
  }
`;

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/array-index-owner-resolver.ts',
);

export default function ArrayIndexOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'ArrayIndexOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">ArrayIndexOwnerResolver</h1>
          <p className="sectionLead">
            Resolves numeric index identifiers on Array contexts. Returns the
            array if the index is a valid, in-bounds position.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/array-index-owner-resolver.ts
                </span>
              </a>
            </p>
          </div>
        </div>
        <div className="docsApiActions">
          <Link className="btn btnGhost" href="/docs/iidentifier-owner-resolver">
            IIdentifierOwnerResolver <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            Checks that the context is an{' '}
            <span className="codeInline">Array</span>, converts the index to a
            number, and verifies it is a finite, non-negative index within the
            array bounds. Returns the array on match, or{' '}
            <span className="codeInline">null</span> to pass to the next
            resolver.
          </p>
          <p className="cardText">
            Used for expressions like{' '}
            <span className="codeInline">orders[0]</span> or{' '}
            <span className="codeInline">lines[i]</span> where the context at
            that path segment is an array.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="ArrayIndexOwnerResolver API">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
