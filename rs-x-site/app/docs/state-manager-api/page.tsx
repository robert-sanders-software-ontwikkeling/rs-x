import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { ApiTabbedBrowser, type ApiTabbedSymbol, type ApiTabbedTab } from '../../../components/ApiTabbedBrowser';

import {
  stateManagerApiGroupEntries,
  stateManagerApiItems,
} from './state-manager-api.helpers';

export const metadata = {
  title: 'State-manager API',
  description:
    'Complete exported API inventory for @rs-x/state-manager grouped by capability.',
};

export default function StateManagerApiDocsPage() {
  const tabs: ApiTabbedTab[] = stateManagerApiGroupEntries.map((group) => ({
    value: group.key,
    label: group.title,
    sections: [
      {
        links: group.moduleEntries.flatMap((mod) =>
          mod.items.map((item) => ({
            href: `/docs/state-manager-api/${item.symbol}`,
            title: item.symbol,
            meta: item.kind,
          })),
        ),
      },
    ],
  }));

  const symbols: ApiTabbedSymbol[] = stateManagerApiItems.map((item) => {
    const matchingGroup = stateManagerApiGroupEntries.find((g) =>
      g.moduleEntries.some((mod) => mod.items.some((i) => i.symbol === item.symbol)),
    );
    return {
      href: `/docs/state-manager-api/${item.symbol}`,
      title: item.symbol,
      description: item.description,
      kind: item.kind,
      tabValue: matchingGroup?.key,
    };
  });

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'State-manager API' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">State-manager API</h1>
          <p className="sectionLead">
            Browse exported API entries from{' '}
            <span className="codeInline">@rs-x/state-manager</span>.
          </p>
        </div>
      </div>

      <article className="card docsApiCard">
        <ApiTabbedBrowser
          tabs={tabs}
          symbols={symbols}
          searchId="state-manager-search"
          searchPlaceholder="Type a symbol, kind, or module..."
          persistKey="state-manager-api.groups"
          ariaLabel="State manager group tabs"
        />
      </article>
    </DocsPageTemplate>
  );
}
