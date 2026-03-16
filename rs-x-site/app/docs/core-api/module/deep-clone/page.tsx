import dedent from 'dedent';
import Link from 'next/link';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('deep-clone')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleDeepClonePage() {
  const hasMultipleEntries = entry.items.length > 1;

  const deepCloneExtensionCode = dedent`
    import {
      InjectionContainer,
      overrideMultiInjectServices,
      RsXCoreInjectionTokens,
      type IMultiInjectService,
      RsXCoreModule,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const customDeepCloneList: IMultiInjectService[] = [
      // your custom strategy first
      { target: MyDomainDeepClone, token: Symbol('MyDomainDeepClone') },
      // keep default fallbacks
      { target: StructuredDeepClone, token: RsXCoreInjectionTokens.IStructuredDeepClone },
      { target: LodashDeepClone, token: RsXCoreInjectionTokens.ILodashDeepClone },
    ];

    overrideMultiInjectServices(
      InjectionContainer,
      RsXCoreInjectionTokens.IDeepCloneList,
      customDeepCloneList,
    );
  `;
  const deepCloneUsageCode = dedent`
    import {
      InjectionContainer,
      type IDeepClone,
      RsXCoreInjectionTokens,
      RsXCoreModule,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const deepClone = InjectionContainer.get(
      RsXCoreInjectionTokens.IDeepClone,
    ) as IDeepClone;

    const source = {
      user: { id: 1, name: 'Ada' },
      tags: ['core', 'docs'],
    };

    const cloned = deepClone.clone(source) as typeof source;

    console.log(cloned.user.name); // Ada
    console.log(cloned === source); // false
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

      <Card header="Current deep-clone implementation">
        <p className="cardText">
          <span className="codeInline">IDeepClone</span> resolves to{' '}
          <span className="codeInline">DefaultDeepClone</span>. It receives{' '}
          <span className="codeInline">IDeepCloneList</span> via multi-inject
          and tries each clone implementation in injected order until one
          succeeds.
        </p>
        <p className="cardText">
          In the default module configuration, list order is:
          <span className="codeInline"> StructuredDeepClone</span> then
          <span className="codeInline"> LodashDeepClone</span>. If one strategy
          throws, the next strategy is attempted.
        </p>
        <p className="cardText">
          <span className="codeInline">LodashDeepClone</span> unwraps
          proxy-wrapped values to their original targets using{' '}
          <Link href="/docs/iproxy-registry">IProxyRegistry</Link>. During clone
          traversal it also calls{' '}
          <span className="codeInline">IDeepCloneExcept</span> (default:
          <span className="codeInline"> DefaultDeepCloneExcept</span>) to
          substitute special values, such as Promise/Observable with their last
          resolved/emitted value.
        </p>
      </Card>

      <Card header="Example: use IDeepClone service">
        <SyntaxCodeBlock code={deepCloneUsageCode} />
      </Card>

      <Card header="How to extend or modify">
        <p className="cardText">
          Register your own <span className="codeInline">IDeepClone</span>{' '}
          implementation and override{' '}
          <span className="codeInline">IDeepCloneList</span> order. Earlier
          entries run first, so put domain-specific strategies before generic
          fallbacks.
        </p>
      </Card>

      <Card header="Override deep-clone strategy order">
        <SyntaxCodeBlock code={deepCloneExtensionCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
