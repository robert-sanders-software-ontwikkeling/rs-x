import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('proxy-registry')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleProxyRegistryPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const proxyRegistryUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IProxyRegistry,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const proxyRegistry = InjectionContainer.get<IProxyRegistry>(
      RsXCoreInjectionTokens.IProxyRegistry,
    );

    const target = { id: 1 };
    const proxy = new Proxy(target, {});

    proxyRegistry.register(target, proxy);

    const resolvedProxy = proxyRegistry.getProxy(target);
    const resolvedTarget = proxyRegistry.getProxyTarget(proxy);

    console.log(resolvedProxy === proxy); // true
    console.log(resolvedTarget === target); // true
    console.log(proxyRegistry.isProxy(proxy)); // true
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

      <Card header="Current proxy-registry implementation">
        <p className="cardText">
          <span className="codeInline">IProxyRegistry</span> resolves to{' '}
          <span className="codeInline">ProxyRegistry</span> as a shared
          singleton service. It stores target/proxy pairs in memory.
        </p>
        <p className="cardText">
          <span className="codeInline">register(target, proxy)</span> adds or
          replaces a mapping.{' '}
          <span className="codeInline">getProxy(target)</span> returns the proxy
          for a target.
        </p>
        <p className="cardText">
          <span className="codeInline">getProxyTarget(proxy)</span> returns the
          original target for a proxy.{' '}
          <span className="codeInline">isProxy(value)</span> checks whether a
          value is currently registered as a proxy.{' '}
          <span className="codeInline">unregister(target)</span> removes a
          mapping.
        </p>
        <p className="cardText">
          This registry is memory-only (not persisted). Core services use it to
          move between wrapped and unwrapped references consistently (for
          example in deep-clone flows).
        </p>
      </Card>

      <Card header="Example: use IProxyRegistry">
        <SyntaxCodeBlock code={proxyRegistryUsageCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
