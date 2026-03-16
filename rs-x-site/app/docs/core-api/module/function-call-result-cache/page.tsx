import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('function-call-result-cache')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleFunctionCallResultCachePage() {
  const hasMultipleEntries = entry.items.length > 1;

  const breadcrumb: DocsBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: formatModuleLabel(entry.moduleName) },
  ];
  const whatItDoes = hasMultipleEntries ? (
    <>
      API entries in this module:{' '}
      <span className="codeInline">{entry.items.length}</span>
    </>
  ) : (
    ''
  );

  return (
    <DocsPageTemplate>
      <ApiDocHeader
        eyebrow="API Reference"
        name={formatModuleLabel(entry.moduleName)}
        whatItDoes={whatItDoes}
        breadcrumb={breadcrumb}
      />

      <Card header="Current function-call-result-cache implementation">
        <p className="cardText">
          This module provides utilities to cache function-call results, so
          repeated evaluation can reuse previous results instead of recomputing
          every call.
        </p>
        <p className="cardText">
          Cache entries are grouped by context object and keyed by function-call
          identity (function name + arguments, represented by function-call
          index). The service supports create, has, and get operations to manage
          and read cached entries.
        </p>
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
