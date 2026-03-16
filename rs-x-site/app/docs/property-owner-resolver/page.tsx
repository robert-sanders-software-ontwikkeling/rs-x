import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'PropertyOwnerResolver',
  description:
    'IIdentifierOwnerResolver that resolves property and field identifiers on plain objects and Date instances.',
};

const apiCode = dedent`
  @Injectable()
  export class PropertyOwnerResolver implements IIdentifierOwnerResolver {
    public resolve(index: string, context: object): object | null;
  }
`;

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/property-owner-resolver.ts',
);

export default function PropertyOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'PropertyOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">PropertyOwnerResolver</h1>
          <p className="sectionLead">
            Resolves property and field identifiers. Returns the context object
            if it has the given property, or if the context is a{' '}
            <span className="codeInline">Date</span> and the identifier is a
            known date property.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/property-owner-resolver.ts
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
            First resolver in the default{' '}
            <span className="codeInline">IIdentifierOwnerResolverList</span>.
            Uses <span className="codeInline">Type.hasProperty(context, index)</span>{' '}
            to check if the identifier is a property or field of the context
            object. Also handles{' '}
            <span className="codeInline">Date</span> instances by checking
            against the known date-property set (
            <span className="codeInline">dataProperties</span> from{' '}
            <span className="codeInline">@rs-x/core</span>).
          </p>
          <p className="cardText">
            Returns the context object on match, or{' '}
            <span className="codeInline">null</span> to pass to the next
            resolver.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="PropertyOwnerResolver API">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
