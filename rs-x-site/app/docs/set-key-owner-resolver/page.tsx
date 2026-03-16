import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'SetKeyOwnerResolver',
  description:
    'IIdentifierOwnerResolver that resolves membership-key identifiers on Set contexts.',
};

const apiCode = dedent`
  @Injectable()
  export class SetKeyOwnerResolver implements IIdentifierOwnerResolver {
    public resolve(index: unknown, set: unknown): object | null;
  }
`;

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/set-key-owner-resolver.ts',
);

export default function SetKeyOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'SetKeyOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">SetKeyOwnerResolver</h1>
          <p className="sectionLead">
            Resolves membership-key identifiers on Set contexts. Returns the Set
            if it contains the given key.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/set-key-owner-resolver.ts
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
            Checks that the context is a{' '}
            <span className="codeInline">Set</span> and that{' '}
            <span className="codeInline">set.has(index)</span> is true. Returns
            the Set on match, or{' '}
            <span className="codeInline">null</span> to pass to the next
            resolver.
          </p>
          <p className="cardText">
            Used for expressions like{' '}
            <span className="codeInline">tasks[trackedTask].done</span> where
            the context is a Set and the index is an object reference that is a
            member of the set.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="SetKeyOwnerResolver API">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
