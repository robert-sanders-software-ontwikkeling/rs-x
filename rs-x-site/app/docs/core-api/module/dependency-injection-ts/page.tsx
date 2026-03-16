import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('dependency-injection-ts')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleDependencyInjectionPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const diUsageCode = dedent`
    import {
      ContainerModule,
      Inject,
      Injectable,
      InjectionContainer,
      registerMultiInjectServices,
      RsXCoreInjectionTokens,
      type IIndexValueAccessor,
    } from '@rs-x/core';

    @Injectable()
    class MyAccessor implements IIndexValueAccessor {
      public priority = 999;
      public getValue(context: unknown, index: unknown): unknown {
        return (context as Record<string, unknown>)[String(index)];
      }
    }

    const module = new ContainerModule((options) => {
      registerMultiInjectServices(options, RsXCoreInjectionTokens.IIndexValueAccessorList, [
        { target: MyAccessor, token: Symbol('MyAccessor') },
      ]);
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

      <Card header="Current dependency-injection implementation">
        <p className="cardText">
          This module wraps and re-exports the DI runtime used by rs-x. It is
          based on{' '}
          <a href="https://inversify.io/" target="_blank" rel="noreferrer">
            Inversify
          </a>{' '}
          and exposes rs-x-friendly helpers such as{' '}
          <span className="codeInline">InjectionContainer</span>,{' '}
          <span className="codeInline">ContainerModule</span>, decorator aliases
          (<span className="codeInline">Injectable</span>,{' '}
          <span className="codeInline">Inject</span>,{' '}
          <span className="codeInline">MultiInject</span>), and multi-bind
          helper functions.
        </p>
        <p className="cardText">
          The global <span className="codeInline">InjectionContainer</span> is a
          shared singleton container used across core, state-manager, and
          expression-parser modules.
        </p>
      </Card>

      <Card header="How to extend or modify">
        <p className="cardText">
          Use <span className="codeInline">ContainerModule</span> plus{' '}
          <span className="codeInline">registerMultiInjectServices</span> or{' '}
          <span className="codeInline">overrideMultiInjectServices</span> to add
          or replace implementations for a multi-inject token list.
        </p>
      </Card>

      <Card header="Example: register custom DI module">
        <SyntaxCodeBlock code={diUsageCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
