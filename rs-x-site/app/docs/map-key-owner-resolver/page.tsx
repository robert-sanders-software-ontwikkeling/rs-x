import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'MapKeyOwnerResolver',
  description:
    'IIdentifierOwnerResolver that resolves key identifiers on Map contexts.',
};

const apiCode = dedent`
  @Injectable()
  export class MapKeyOwnerResolver implements IIdentifierOwnerResolver {
    public resolve(index: unknown, map: unknown): object | null;
  }
`;

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/map-key-owner-resolver.ts',
);

export default function MapKeyOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'MapKeyOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">MapKeyOwnerResolver</h1>
          <p className="sectionLead">
            Resolves key identifiers on Map contexts. Returns the Map if it has
            the given key.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/map-key-owner-resolver.ts
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
            <span className="codeInline">Map</span> and that{' '}
            <span className="codeInline">map.has(index)</span> is true. Returns
            the Map on match, or{' '}
            <span className="codeInline">null</span> to pass to the next
            resolver.
          </p>
          <p className="cardText">
            Used for expressions like{' '}
            <span className="codeInline">{'prices["pro"].net'}</span> where the
            context is a Map and the index is a string key.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="MapKeyOwnerResolver API">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
