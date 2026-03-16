import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

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
        eyebrow="API Reference"
        name={formatModuleLabel(entry.moduleName)}
        whatItDoes="GUID factory for generating unique identifiers."
        breadcrumb={breadcrumb}
      />
      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
