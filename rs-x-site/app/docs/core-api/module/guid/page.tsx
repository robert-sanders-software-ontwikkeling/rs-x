import { DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { ApiDocHeader } from '../../../components/api-doc-header';

import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';
import { ModuleApiEntries } from '../module-api-entries';

const entry = moduleBySlug.get('guid')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleGuidPage() {
  const breadcrumb: DocsBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: formatModuleLabel(entry.moduleName) },
  ];

  return (
    <DocsPageTemplate>
      <ApiDocHeader
        eyebrow='API Reference'
        name={formatModuleLabel(entry.moduleName)}
        breadcrumb={breadcrumb}
      />
      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
