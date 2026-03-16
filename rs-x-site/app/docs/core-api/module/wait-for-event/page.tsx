import dedent from 'dedent';

import { DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';

import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';
import { ModuleApiEntries } from '../module-api-entries';

const entry = moduleBySlug.get('wait-for-event')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleWaitForEventPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const waitForEventUsageCode = dedent`
    import { Subject } from 'rxjs';
    import { WaitForEvent } from '@rs-x/core';

    const target = {
      message$: new Subject<string>(),
    };

    const waiter = new WaitForEvent(target, 'message$', {
      count: 2,
      timeout: 1000,
      ignoreInitialValue: false,
    });

    const result = await waiter.wait(() => {
      target.message$.next('first');
      target.message$.next('second');
    });

    console.log(result); // ['first', 'second']
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

      <Card header='Overview'>
        <p className="cardText">
          <span className="codeInline">WaitForEvent</span> helps you trigger
          an action and then wait for emissions from an Observable event
          property on a target object.
        </p>
        <p className="cardText">
          Configure <span className="codeInline">count</span> to wait for
          one or more emissions, <span className="codeInline">timeout</span>{' '}
          to cap how long it waits, and{' '}
          <span className="codeInline">ignoreInitialValue</span> when the
          first emission should be skipped.
        </p>
        <p className="cardText">
          The <span className="codeInline">wait(trigger)</span> call
          subscribes, runs the trigger (sync/Promise/Observable), collects
          emitted values, and resolves with the value (or values). If
          timeout is reached first, it resolves{' '}
          <span className="codeInline">null</span>.
        </p>
      </Card>

      <Card header='Example: wait for emitted events'>
        <SyntaxCodeBlock code={waitForEventUsageCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />

    </DocsPageTemplate>
  );
}
