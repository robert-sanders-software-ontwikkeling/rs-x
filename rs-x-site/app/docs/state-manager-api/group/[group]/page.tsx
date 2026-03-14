import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import {
  formatModuleLabel,
  stateManagerApiGroupByKey,
  stateManagerApiGroupEntries,
  type StateManagerApiGroupKey,
} from '../../state-manager-api.helpers';

type StateManagerGroupPageProps = {
  params: Promise<{ group: string }>;
};

export function generateStaticParams() {
  return stateManagerApiGroupEntries.map((entry) => ({ group: entry.key }));
}

export async function generateMetadata({ params }: StateManagerGroupPageProps) {
  const { group } = await params;
  const entry = stateManagerApiGroupByKey.get(group as StateManagerApiGroupKey);
  if (!entry) {
    return { title: '@rs-x/state-manager API' };
  }

  return {
    title: `${entry.title} | @rs-x/state-manager API`,
    description: entry.description,
  };
}

export default async function StateManagerApiGroupPage({
  params,
}: StateManagerGroupPageProps) {
  const { group } = await params;
  const entry = stateManagerApiGroupByKey.get(group as StateManagerApiGroupKey);
  if (!entry) {
    notFound();
  }

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/state-manager API', href: '/docs/state-manager-api' },
              { label: entry.title },
            ]}
          />
          <p className="docsApiEyebrow">State manager group</p>
          <h1 className="sectionTitle">{entry.title}</h1>
          <p className="sectionLead">{entry.description}</p>
        </div>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Modules in this group</h2>
        <p className="cardText">
          <span className="codeInline">{entry.moduleCount}</span> modules ·{' '}
          <span className="codeInline">{entry.apiEntryCount}</span> API entries
        </p>
        <ul className="docsApiLinkGrid">
          {entry.moduleEntries.map((moduleEntry) => (
            <li key={moduleEntry.moduleName}>
              <Link
                className="docsApiLinkItem"
                href={`/docs/${moduleEntry.moduleName}`}
              >
                <ItemLinkCardContent
                  title={formatModuleLabel(moduleEntry.moduleName)}
                  meta={`${moduleEntry.items.length} API entries`}
                />
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </DocsPageTemplate>
  );
}
