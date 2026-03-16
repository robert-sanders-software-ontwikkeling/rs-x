import { DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';

import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';
import { ModuleApiEntries } from '../module-api-entries';

const entry = moduleBySlug.get('exceptions')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleExceptionsPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const breadcrumb: DocsBreadcrumbItem[] = [
    { label: 'Docs', href: '/docs' },
    { label: formatModuleLabel(entry.moduleName) },
  ];
  const whatItDoes = hasMultipleEntries
    ? (<>
      API entries in this module:{' '}
      <span className="codeInline">{entry.items.length}</span>

    </>) : ''

  return (
    <DocsPageTemplate>
      <ApiDocHeader
        eyebrow='API Reference'
        name={formatModuleLabel(entry.moduleName)}
        whatItDoes={whatItDoes}
        breadcrumb={breadcrumb}
      />

      <Card header='Current exceptions implementation'>
        <p className="cardText">
          This module contains typed error classes used across rs-x core.
          Most exceptions extend{' '}
          <span className="codeInline">CustomError</span> so error names
          remain stable and easier to handle in logs/tests.
        </p>
        <p className="cardText">
          It also includes the static{' '}
          <span className="codeInline">Assertion</span> helper for common
          guard checks (predicate, function type, null/empty). These guards
          throw specific exception types so failures are explicit.
        </p>
      </Card>

      <ModuleApiEntries items={entry.items} />

    </DocsPageTemplate>
  );
}
