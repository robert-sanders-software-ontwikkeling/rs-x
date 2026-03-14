import Link from 'next/link';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';

import {
  stateManagerApiGroupEntries,
  stateManagerApiItems,
  stateManagerApiModuleEntries,
} from './state-manager-api.helpers';

export const metadata = {
  title: '@rs-x/state-manager API',
  description:
    'Complete exported API inventory for @rs-x/state-manager grouped by capability.',
};

export default function StateManagerApiDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'API reference', href: '/docs/api' },
              { label: '@rs-x/state-manager API' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">@rs-x/state-manager API</h1>
          <p className="sectionLead">
            Browse exported API entries from{' '}
            <span className="codeInline">@rs-x/state-manager</span>, grouped by
            capability area.
          </p>
        </div>
        <div className="docsApiActions">
          <Link className="btn btnGhost" href="/docs/core-api">
            @rs-x/core <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btnGhost" href="/docs/api/expression-parser">
            @rs-x/expression-parser <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btnGhost" href="/docs/index-watch-rule">
            IndexWatchRule docs <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Module groups</h2>
        <p className="cardText">
          Total API entries: <span className="codeInline">{stateManagerApiItems.length}</span>. Modules:{' '}
          <span className="codeInline">{stateManagerApiModuleEntries.length}</span>. Groups:{' '}
          <span className="codeInline">{stateManagerApiGroupEntries.length}</span>.
        </p>
        <ul className="docsApiLinkGrid">
          {stateManagerApiGroupEntries.map((entry) => (
            <li key={entry.key}>
              <Link
                className="docsApiLinkItem"
                href={entry.href}
              >
                <ItemLinkCardContent
                  title={entry.title}
                  meta={`${entry.moduleCount} modules · ${entry.apiEntryCount} API entries`}
                  description={entry.description}
                />
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </DocsPageTemplate>
  );
}
