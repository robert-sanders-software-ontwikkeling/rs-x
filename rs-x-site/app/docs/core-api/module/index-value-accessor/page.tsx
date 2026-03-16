import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('index-value-accessor')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleIndexValueAccessorPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const indexValueAccessorUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IIndexValueAccessor,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const accessor = InjectionContainer.get<IIndexValueAccessor>(
      RsXCoreInjectionTokens.IIndexValueAccessor,
    );

    const model = {
      user: { name: 'Ada' },
      list: [10, 20, 30],
      map: new Map([['x', 99]]),
    };

    const name = accessor.getValue(model.user, 'name');
    const second = accessor.getValue(model.list, 1);
    const mapped = accessor.getValue(model.map, 'x');

    console.log(name, second, mapped); // Ada 20 99
  `;
  const indexValueAccessorCustomizationCode = dedent`
    import {
      ArrayIndexAccessor,
      ContainerModule,
      InjectionContainer,
      overrideMultiInjectServices,
      PropertyValueAccessor,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IMultiInjectService,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const customAccessorList: IMultiInjectService[] = [
      { target: PropertyValueAccessor, token: RsXCoreInjectionTokens.IPropertyValueAccessor },
      { target: ArrayIndexAccessor, token: RsXCoreInjectionTokens.IArrayIndexAccessor },
      // add your custom accessor(s) here
    ];

    const module = new ContainerModule((options) => {
      overrideMultiInjectServices(
        options,
        RsXCoreInjectionTokens.IIndexValueAccessorList,
        customAccessorList,
      );
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

      <Card header="Current index-value-accessor implementation">
        <p className="cardText">
          <span className="codeInline">IndexValueAccessor</span> is the default{' '}
          <span className="codeInline">IIndexValueAccessor</span> service. It
          receives all registered accessor strategies from{' '}
          <span className="codeInline">IIndexValueAccessorList</span>, sorts
          them by <span className="codeInline">priority</span> (highest first),
          and delegates each operation to the first strategy whose{' '}
          <span className="codeInline">applies(context, index)</span> returns
          true.
        </p>
        <p className="cardText">
          In <span className="codeInline">RsXCoreModule</span>, the default
          strategy order is:{' '}
          <span className="codeInline">PropertyValueAccessor (7)</span>,{' '}
          <span className="codeInline">MethodAccessor (6)</span>,{' '}
          <span className="codeInline">ArrayIndexAccessor (5)</span>,{' '}
          <span className="codeInline">MapKeyAccessor (4)</span>,{' '}
          <span className="codeInline">SetKeyAccessor (3)</span>,{' '}
          <span className="codeInline">ObservableAccessor (2)</span>,{' '}
          <span className="codeInline">PromiseAccessor (1)</span>,{' '}
          <span className="codeInline">DatePropertyAccessor (0)</span>,{' '}
          <span className="codeInline">GlobalIndexAccessor (-1)</span>.
        </p>
        <p className="cardText">
          For async wrappers, <span className="codeInline">getValue</span>{' '}
          returns the raw Promise/Observable, while{' '}
          <span className="codeInline">getResolvedValue</span> returns the
          latest cached resolved/emitted value when available, otherwise{' '}
          <span className="codeInline">PENDING</span>. If no accessor can handle
          a context/index pair, the service throws{' '}
          <span className="codeInline">NoAccessorFoundExeception</span>.
        </p>
      </Card>

      <Card header="Example: use IIndexValueAccessor">
        <SyntaxCodeBlock code={indexValueAccessorUsageCode} />
      </Card>

      <Card header="How to extend or modify">
        <p className="cardText">
          To customize behavior, override{' '}
          <span className="codeInline">IIndexValueAccessorList</span> with your
          own ordered strategy list. Put special-case accessors near the top and
          generic catch-all accessors near the bottom, because the first
          matching accessor is the one that gets used.
        </p>
      </Card>

      <Card header="Override accessor strategy list">
        <SyntaxCodeBlock code={indexValueAccessorCustomizationCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
