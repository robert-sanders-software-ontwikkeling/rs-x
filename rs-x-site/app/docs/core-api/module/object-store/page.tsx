import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('object-store')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleObjectStorePage() {
  const hasMultipleEntries = entry.items.length > 1;

  const objectStoreUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IObjectStorage,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const objectStorage = InjectionContainer.get<IObjectStorage>(
      RsXCoreInjectionTokens.IObjectStorage,
    );

    await objectStorage.set('user:1', { id: 1, name: 'Ada' });
    const user = await objectStorage.get<{ id: number; name: string }>('user:1');

    console.log(user?.name); // Ada
    objectStorage.close();
  `;
  const objectStoreOverrideCode = dedent`
    import {
      ContainerModule,
      Injectable,
      InjectionContainer,
      RsXCoreInjectionTokens,
      type IObjectStorage,
    } from '@rs-x/core';

    @Injectable()
    class MemoryObjectStorage implements IObjectStorage {
      private readonly map = new Map<string, unknown>();

      public async get<T>(key: string): Promise<T> {
        return this.map.get(key) as T;
      }

      public async set<T>(key: string, value: T): Promise<void> {
        this.map.set(key, value);
      }

      public close(): void {
        this.map.clear();
      }
    }

    const module = new ContainerModule((options) => {
      if (options.isBound(RsXCoreInjectionTokens.IObjectStorage)) {
        options.unbind(RsXCoreInjectionTokens.IObjectStorage);
      }

      options
        .bind<IObjectStorage>(RsXCoreInjectionTokens.IObjectStorage)
        .to(MemoryObjectStorage)
        .inSingletonScope();
    });

    await InjectionContainer.load(module);
  `;

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

      <Card header="Current object-store implementation">
        <p className="cardText">
          <span className="codeInline">IObjectStorage</span> resolves to{' '}
          <span className="codeInline">ObjectStorage</span> in singleton scope.
          The default implementation uses IndexedDB with one database (
          <span className="codeInline">
            objectStore_6a46e952c07d42629cd8fca03b21ce30
          </span>
          ) and one object store (<span className="codeInline">objects</span>).
        </p>
        <p className="cardText">
          <span className="codeInline">set(key, value)</span> performs a
          read-write transaction and stores/replaces the value by key.{' '}
          <span className="codeInline">get(key)</span> performs a read-only
          transaction and returns the stored value (or{' '}
          <span className="codeInline">undefined</span> when the key does not
          exist).
        </p>
        <p className="cardText">
          <span className="codeInline">close()</span> closes the cached database
          connection. The next call to <span className="codeInline">get</span>{' '}
          or <span className="codeInline">set</span> reopens it automatically.
          Because it depends on <span className="codeInline">IDBFactory</span>,
          this service is browser-only and not available during SSR.
        </p>
        <p className="cardText">
          IndexedDB stores values with the structured-clone algorithm, so stored
          values must be structured-clone compatible. For example, functions,
          DOM nodes, and class instances with non-cloneable state cannot be
          persisted directly.
        </p>
      </Card>

      <Card header="Example: use IObjectStorage">
        <SyntaxCodeBlock code={objectStoreUsageCode} />
      </Card>

      <Card header="How to extend or modify">
        <p className="cardText">
          Rebind <span className="codeInline">IObjectStorage</span> to replace
          IndexedDB storage (for example memory storage in tests, remote
          storage, or encrypted persistence), while keeping the same async API
          contract.
        </p>
      </Card>

      <Card header="Override object storage service">
        <SyntaxCodeBlock code={objectStoreOverrideCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
