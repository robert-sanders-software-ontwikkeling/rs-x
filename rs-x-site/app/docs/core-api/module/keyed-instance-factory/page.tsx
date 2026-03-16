import dedent from 'dedent';

import { DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';

import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';
import { ModuleApiEntries } from '../module-api-entries';

const entry = moduleBySlug.get('keyed-instance-factory')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleKeyedInstanceFactoryPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const singletonFactoryUsageCode = dedent`
    import { KeyedInstanceFactory } from '@rs-x/core';

    type UserData = { id: string; name: string };

    class MyKeyedInstanceFactory extends KeyedInstanceFactory<string, UserData, UserData, UserData> {
      public getId(data: UserData): string | undefined {
        return data.id;
      }

      protected createId(data: UserData): string {
        return data.id;
      }

      protected createInstance(data: UserData): UserData {
        return { ...data };
      }
    }

    const factory = new MyKeyedInstanceFactory();

    // create(...) increases reference count
    const first = factory.create({ id: 'u1', name: 'Ada' });
    console.log(first.referenceCount); // 1

    // same id => same instance reused
    const second = factory.create({ id: 'u1', name: 'Ada' });
    console.log(second.referenceCount); // 2

    // Always release to avoid memory leaks
    factory.release('u1');
    factory.release('u1');
  `;

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

      <Card header='keyed-instance-factory overview'>
        <p className="cardText">
          <span className="codeInline">KeyedInstanceFactory</span> is an
          abstract class that lets you manage one singleton instance per
          user-defined id. It keeps a reference count for each id:{' '}
          <span className="codeInline">create(...)</span> increments the
          count by one, and <span className="codeInline">release(...)</span>{' '}
          decrements it by one. When the reference count reaches zero, the
          instance is released.
        </p>
      </Card>

      <Card header='Example: extend KeyedInstanceFactory'>
        <SyntaxCodeBlock code={singletonFactoryUsageCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />

    </DocsPageTemplate>
  );
}
