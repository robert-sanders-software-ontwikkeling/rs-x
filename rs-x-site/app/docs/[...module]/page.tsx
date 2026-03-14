import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import {
  formatModuleLabel,
  stateManagerApiGroupByModulePath,
  stateManagerApiModuleByPath,
  stateManagerApiModuleEntries,
} from '../state-manager-api/state-manager-api.helpers';

type StateManagerModulePageProps = {
  params: Promise<{ module: string[] }>;
};

export function generateStaticParams() {
  return stateManagerApiModuleEntries.map((entry) => ({
    module: entry.moduleName.split('/'),
  }));
}

export async function generateMetadata({
  params,
}: StateManagerModulePageProps) {
  const { module } = await params;
  const modulePath = module.join('/');
  const entry = stateManagerApiModuleByPath.get(modulePath);
  if (!entry) {
    return { title: 'Docs' };
  }

  return {
    title: `@rs-x/state-manager: ${formatModuleLabel(entry.moduleName)}`,
    description: `API entries in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default async function StateManagerApiModulePage({
  params,
}: StateManagerModulePageProps) {
  const { module } = await params;
  const modulePath = module.join('/');
  const entry = stateManagerApiModuleByPath.get(modulePath);
  if (!entry) {
    notFound();
  }
  const groupEntry = stateManagerApiGroupByModulePath.get(entry.moduleName);

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/state-manager API', href: '/docs/state-manager-api' },
              ...(groupEntry
                ? [{ label: groupEntry.title, href: groupEntry.href }]
                : []),
              { label: formatModuleLabel(entry.moduleName) },
            ]}
          />
          <p className="docsApiEyebrow">State manager module</p>
          <h1 className="sectionTitle">{formatModuleLabel(entry.moduleName)}</h1>
          <p className="sectionLead">
            API entries in this module:{' '}
            <span className="codeInline">{entry.items.length}</span>.
          </p>
        </div>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Module entries</h2>
        <ul className="docsApiLinkGrid">
          {entry.items.map((item) => (
            <li key={item.symbol}>
              <Link
                className="docsApiLinkItem"
                href={`/docs/state-manager-api/${encodeURIComponent(item.symbol)}`}
              >
                <ItemLinkCardContent
                  title={item.symbol}
                  meta={item.kind}
                  description={item.description}
                />
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </DocsPageTemplate>
  );
}
