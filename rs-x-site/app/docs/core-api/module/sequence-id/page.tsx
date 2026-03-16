import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('sequence-id')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleSequenceIdPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const sequenceIdUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type ISequenceIdFactory,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const sequenceIdFactory = InjectionContainer.get<ISequenceIdFactory>(
      RsXCoreInjectionTokens.ISequenceIdFactory,
    );

    const context = {};
    const sequence = ['user', 'profile', 'name'];

    const handle = sequenceIdFactory.create(context, sequence);
    console.log(handle.id);

    const sameHandle = sequenceIdFactory.get(context, sequence);
    console.log(sameHandle?.id === handle.id); // true

    // Always release/dispose when finished to avoid retained references.
    handle.dispose();
    // equivalent:
    // sequenceIdFactory.release(context, handle.id);
  `;
  const sequenceIdInjectionCode = dedent`
    import {
      Inject,
      RsXCoreInjectionTokens,
      type ISequenceIdFactory,
    } from '@rs-x/core';

    class SequenceConsumer {
      constructor(
        @Inject(RsXCoreInjectionTokens.ISequenceIdFactory)
        private readonly sequenceIdFactory: ISequenceIdFactory,
      ) {}

      track(context: object, path: unknown[]): string {
        const handle = this.sequenceIdFactory.create(context, path);
        try {
          return handle.id;
        } finally {
          handle.dispose();
        }
      }
    }
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

      <Card header="Current sequence-id implementation">
        <p className="cardText">
          This module returns the same id for matching sequence payloads in a
          specific context object. When the same context and sequence are used
          again, rs-x reuses the same sequence-id handle.
        </p>
        <p className="cardText">
          <span className="codeInline">create(context, sequence)</span> creates
          or reuses a handle.{' '}
          <span className="codeInline">get(context, sequence)</span> only reads
          an existing handle.{' '}
          <span className="codeInline">release(context, id)</span> releases one
          reference for that handle.
        </p>
        <p className="cardText">
          The default singleton service is{' '}
          <span className="codeInline">SequenceIdFactory</span>, resolved
          through{' '}
          <span className="codeInline">
            RsXCoreInjectionTokens.ISequenceIdFactory
          </span>
          . If you call <span className="codeInline">create</span>, call{' '}
          <span className="codeInline">dispose()</span> on the returned handle
          (or call <span className="codeInline">release</span>) when finished to
          prevent memory leaks.
        </p>
      </Card>

      <Card header="Example: use ISequenceIdFactory">
        <SyntaxCodeBlock code={sequenceIdUsageCode} />
      </Card>

      <Card header="Example: inject into constructor">
        <SyntaxCodeBlock code={sequenceIdInjectionCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
