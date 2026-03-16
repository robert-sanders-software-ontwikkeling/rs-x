import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('value-metadata')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleValueMetadataPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const valueMetadataUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IValueMetadata,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const valueMetadata = InjectionContainer.get<IValueMetadata>(
      RsXCoreInjectionTokens.IValueMetadata,
    );

    console.log(valueMetadata.isAsync(Promise.resolve(1))); // true
    console.log(valueMetadata.needsProxy(new Map())); // true
    console.log(valueMetadata.needsProxy(42)); // false (DummyMetadata fallback)
  `;
  const valueMetadataCustomizationCode = dedent`
    import {
      ArrayMetadata,
      DateMetadata,
      DummyMetadata,
      InjectionContainer,
      MapMetadata,
      ObservableMetadata,
      overrideMultiInjectServices,
      PromiseMetadata,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      SetMetadata,
      type IMultiInjectService,
      type IValueMetadata,
    } from '@rs-x/core';

    class UrlMetadata implements IValueMetadata {
      public readonly priority = 9;
      public isAsync(): boolean { return false; }
      public needsProxy(): boolean { return false; }
      public applies(value: unknown): boolean { return value instanceof URL; }
    }

    await InjectionContainer.load(RsXCoreModule);

    const customMetadataList: IMultiInjectService[] = [
      { target: UrlMetadata, token: Symbol('UrlMetadata') },
      // keep default handlers after your custom one
      { target: ArrayMetadata, token: RsXCoreInjectionTokens.ArrayMetadata },
      { target: DateMetadata, token: RsXCoreInjectionTokens.DateMetadata },
      { target: DummyMetadata, token: RsXCoreInjectionTokens.DummyMetadata },
      { target: MapMetadata, token: RsXCoreInjectionTokens.MapMetadata },
      { target: ObservableMetadata, token: RsXCoreInjectionTokens.ObservableMetadata },
      { target: PromiseMetadata, token: RsXCoreInjectionTokens.PromiseMetadata },
      { target: SetMetadata, token: RsXCoreInjectionTokens.SetMetadata },
    ];

    overrideMultiInjectServices(
      InjectionContainer,
      RsXCoreInjectionTokens.IValueMetadataList,
      customMetadataList,
    );
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

      <Card header="Current value-metadata implementation">
        <p className="cardText">
          The <span className="codeInline">ValueMetadata</span> service provides
          information about how rs-x should handle a value type at runtime, such
          as whether it should be proxied and whether it is async. It retrieves
          providers from <span className="codeInline">IValueMetadataList</span>,
          sorts them by <span className="codeInline">priority</span> (highest
          first), and selects the first provider for which{' '}
          <span className="codeInline">applies(value)</span> returns true.
        </p>
        <p className="cardText">
          Default providers are:{' '}
          <span className="codeInline">ArrayMetadata (8)</span>,{' '}
          <span className="codeInline">DateMetadata (7)</span>,{' '}
          <span className="codeInline">MapMetadata (6)</span>,{' '}
          <span className="codeInline">ObservableMetadata (5)</span>,{' '}
          <span className="codeInline">PromiseMetadata (4)</span>,{' '}
          <span className="codeInline">SetMetadata (3)</span>, and fallback{' '}
          <span className="codeInline">DummyMetadata (-1000)</span>.
        </p>
        <p className="cardText">
          Rs-x use this metadata to decide whether a value is async (
          <span className="codeInline">isAsync</span>) and whether it should be
          proxied (<span className="codeInline">needsProxy</span>
          ).
        </p>
      </Card>

      <Card header="Example: use IValueMetadata">
        <SyntaxCodeBlock code={valueMetadataUsageCode} />
      </Card>

      <Card header="How to extend or modify">
        <p className="cardText">
          Add your own metadata class and override{' '}
          <span className="codeInline">IValueMetadataList</span> order so your
          custom type is checked before generic handlers.
        </p>
      </Card>

      <Card header="Override metadata strategy list">
        <SyntaxCodeBlock code={valueMetadataCustomizationCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
