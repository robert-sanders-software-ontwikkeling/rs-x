import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('rs-x-core-module-ts')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleRsXCoreModulePage() {
  const breadcrumb: DocsBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: formatModuleLabel(entry.moduleName) },
  ];

  return (
    <DocsPageTemplate>
      <ApiDocHeader
        eyebrow="API Reference"
        name={formatModuleLabel(entry.moduleName)}
        breadcrumb={breadcrumb}
      />
      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
