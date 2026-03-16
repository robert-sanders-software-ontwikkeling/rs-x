import dedent from 'dedent';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../../lib/github-source-links';

export const metadata = {
  title: 'GlobalIdentifierOwnerResolver',
  description:
    'IIdentifierOwnerResolver that resolves identifiers that refer to allowed JavaScript globals.',
};

const apiCode = dedent`
  @Injectable()
  export class GlobalIdentifierOwnerResolver implements IIdentifierOwnerResolver {
    public resolve(index: unknown): object | null;
  }
`;

const allowedGlobals = [
  'Math', 'Date', 'Number', 'String', 'Boolean', 'BigInt', 'Symbol',
  'Object', 'Array', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Promise', 'Error', 'TypeError', 'RangeError', 'ReferenceError',
  'SyntaxError', 'URIError', 'AggregateError', 'JSON', 'Intl',
  'Reflect', 'Proxy', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'console',
];

const sourceHref = githubSourceHref(
  '@rs-x/expression-parser',
  'identifier-owner-resolver/global-identifier-owner-resolver.ts',
);

export default function GlobalIdentifierOwnerResolverDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'GlobalIdentifierOwnerResolver' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">GlobalIdentifierOwnerResolver</h1>
          <p className="sectionLead">
            Last resolver in the default list. Returns{' '}
            <span className="codeInline">globalThis</span> when the identifier
            matches an entry in the allowed globals set, enabling{' '}
            <span className="codeInline">Math</span>,{' '}
            <span className="codeInline">Date</span>,{' '}
            <span className="codeInline">console</span>, and other built-ins
            inside expressions.
          </p>
          <div className="docsApiMetaRow">
            <p className="docsApiInterface">
              Source:{' '}
              <a href={sourceHref} target="_blank" rel="noreferrer">
                <span className="codeInline">
                  identifier-owner-resolver/global-identifier-owner-resolver.ts
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
            Checks that the index is a string and that it is present in the
            static allowedGlobals set. On match, returns{' '}
            <span className="codeInline">globalThis</span> cast as an object.
            Returns <span className="codeInline">null</span> for any identifier
            not in the list.
          </p>
          <p className="cardText">
            This resolver sits last in the default{' '}
            <span className="codeInline">IIdentifierOwnerResolverList</span> so
            that model properties always take precedence over globals with the
            same name.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Allowed globals</h2>
          <p className="cardText">
            {allowedGlobals.join(', ')}
          </p>
          <p className="cardText">
            To allow additional globals, replace this resolver via{' '}
            <Link href="/docs/core-api/overrideMultiInjectServices">
              overrideMultiInjectServices
            </Link>{' '}
            with a custom implementation that extends the set.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="GlobalIdentifierOwnerResolver API">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
