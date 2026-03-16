import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import {
  formatModuleLabel,
  moduleBySlug,
  tokenReferenceRows,
} from '../module-page.helpers';

import { TokenReferenceTable } from './token-reference-table.client';

const entry = moduleBySlug.get('rs-x-core-injection-tokens-ts')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleInjectionTokensPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const injectionTokensUsageCode = dedent`
    import {
      Inject,
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IEqualityService,
      type IErrorLog,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    // Resolve by token key from the token object.
    const equality = InjectionContainer.get<IEqualityService>(
      RsXCoreInjectionTokens.IEqualityService,
    );
    const errorLog = InjectionContainer.get<IErrorLog>(
      RsXCoreInjectionTokens.IErrorLog,
    );

    class Consumer {
      constructor(
        @Inject(RsXCoreInjectionTokens.IEqualityService)
        private readonly equalityService: IEqualityService,
        @Inject(RsXCoreInjectionTokens.IErrorLog)
        private readonly logger: IErrorLog,
      ) {}
    }

    console.log(equality, errorLog, Consumer);
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

      <Card header="Current rs-x-core.injection-tokens implementation">
        <p className="cardText">
          <span className="codeInline">RsXCoreInjectionTokens</span> contains
          token keys for core services.
        </p>
        <p className="cardText">
          Tokens such as <span className="codeInline">IEqualityService</span>,{' '}
          <span className="codeInline">IErrorLog</span>,{' '}
          <span className="codeInline">IDeepClone</span> let you resolve a
          service from the container or inject it into a constructor.
        </p>
        <p className="cardText">
          Use <span className="codeInline">InjectionContainer.get(token)</span>{' '}
          to resolve a service, or{' '}
          <span className="codeInline">@Inject(token)</span> to inject it into a
          class constructor.
        </p>
      </Card>

      <Card header="Example: resolve and inject by token keys">
        <SyntaxCodeBlock code={injectionTokensUsageCode} />
      </Card>

      <Card header="Token reference">
        <p className="cardText">
          The table below maps each token key to the service it refers to and
          describes that service&apos;s responsibility.
        </p>
        <TokenReferenceTable rows={tokenReferenceRows} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
