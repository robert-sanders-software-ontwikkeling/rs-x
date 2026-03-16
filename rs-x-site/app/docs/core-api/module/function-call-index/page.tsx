import Link from 'next/link';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('function-call-index')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleFunctionCallIndexPage() {
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

      <Card header="Current function-call-index implementation">
        <p className="cardText">
          This module builds the same identity for each repeated function call
          using
          <span className="codeInline"> context</span>,{' '}
          <span className="codeInline">functionName</span>, and an arguments id.
          rs-x uses this id to recognize "this is the same call as before" and
          to find the correct cached call result.
        </p>
        <p className="cardText">
          <Link href="/docs/core-api/FunctionCallIndexFactory">
            <span className="codeInline">FunctionCallIndexFactory</span>
          </Link>{' '}
          builds or returns the same call-id object for the same call input
          (same context, function name, and arguments).
        </p>
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
