import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'DefaultIdentifierOwnerResolver',
  description:
    'Default IIdentifierOwnerResolver implementation that iterates a DI-injected list of resolvers.',
};

const apiCode = dedent`
  @Injectable()
  export class DefaultIdentifierOwnerResolver implements IIdentifierOwnerResolver {
    constructor(
      @MultiInject(RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList)
      private readonly _identifierOwnerResolvers: readonly IIdentifierOwnerResolver[],
    ) {}

    public resolve(index: unknown, context?: unknown): object | null;
  }
`;

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/default-identifier-owner-resolver.ts',
);

export default function DefaultIdentifierOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'DefaultIdentifierOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">DefaultIdentifierOwnerResolver</h1>
          <p className="sectionLead">
            Default implementation of{' '}
            <Link href="/docs/iidentifier-owner-resolver">
              IIdentifierOwnerResolver
            </Link>
            . Iterates an ordered DI-injected list of resolvers and returns the
            first non-null owner.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/default-identifier-owner-resolver.ts
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
            Registered as{' '}
            <span className="codeInline">
              RsXExpressionParserInjectionTokens.IdentifierOwnerResolver
            </span>{' '}
            in the default module. Receives the{' '}
            <span className="codeInline">IIdentifierOwnerResolverList</span>{' '}
            multi-inject list and iterates it in registration order. The first
            resolver that returns a non-null value wins.
          </p>
          <p className="cardText">
            The default list contains (in order):{' '}
            <Link href="/docs/property-owner-resolver">PropertyOwnerResolver</Link>,{' '}
            <Link href="/docs/array-index-owner-resolver">ArrayIndexOwnerResolver</Link>,{' '}
            <Link href="/docs/set-key-owner-resolver">SetKeyOwnerResolver</Link>,{' '}
            <Link href="/docs/map-key-owner-resolver">MapKeyOwnerResolver</Link>,{' '}
            <Link href="/docs/global-identifier-owner-resolver">GlobalIdentifierOwnerResolver</Link>.
          </p>
          <p className="cardText">
            Extend the list with{' '}
            <Link href="/docs/core-api/registerMultiInjectServices">
              registerMultiInjectServices
            </Link>
            , or replace it with{' '}
            <Link href="/docs/core-api/overrideMultiInjectServices">
              overrideMultiInjectServices
            </Link>
            .
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="DefaultIdentifierOwnerResolver API">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
