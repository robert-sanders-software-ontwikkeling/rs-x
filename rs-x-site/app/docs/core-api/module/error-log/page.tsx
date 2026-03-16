import dedent from 'dedent';

import { DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';

import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';
import { ModuleApiEntries } from '../module-api-entries';

const entry = moduleBySlug.get('error-log')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleErrorLogPage() {
  const hasMultipleEntries = entry.items.length > 1;

  const errorLogUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IErrorLog,
      type IError,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const errorLog = InjectionContainer.get<IErrorLog>(
      RsXCoreInjectionTokens.IErrorLog,
    );

    const subscription = errorLog.error.subscribe((entry: IError) => {
      console.log('logged error:', entry.message);
    });

    errorLog.add({
      message: 'Something failed',
      context: 'Expression evaluation',
      fatal: false,
    });

    // clears console output in default implementation
    errorLog.clear();
    subscription.unsubscribe();
  `;
  const errorLogOverrideCode = dedent`
    import {
      ContainerModule,
      Injectable,
      InjectionContainer,
      RsXCoreInjectionTokens,
      type IError,
      type IErrorLog,
    } from '@rs-x/core';
    import { Subject } from 'rxjs';

    @Injectable()
    class MemoryErrorLog implements IErrorLog {
      private readonly stream = new Subject<IError>();
      public readonly error = this.stream.asObservable();
      private readonly history: IError[] = [];

      public add(error: IError): void {
        this.history.push(error);
        this.stream.next(error);
      }

      public clear(): void {
        this.history.length = 0;
      }
    }

    const module = new ContainerModule((options) => {
      if (options.isBound(RsXCoreInjectionTokens.IErrorLog)) {
        options.unbind(RsXCoreInjectionTokens.IErrorLog);
      }

      options
        .bind<IErrorLog>(RsXCoreInjectionTokens.IErrorLog)
        .to(MemoryErrorLog)
        .inSingletonScope();
    });

    await InjectionContainer.load(module);
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

      <Card header='Current error-log implementation'>
        <p className="cardText">
          In the default setup,{' '}
          <span className="codeInline">IErrorLog</span> uses the{' '}
          <span className="codeInline">ErrorLog</span> class as a shared
          singleton service.
        </p>
        <p className="cardText">
          <span className="codeInline">add(error)</span> logs the error to
          the console and also emits it through the observable{' '}
          <span className="codeInline">error</span> stream.{' '}
          <span className="codeInline">clear()</span> clears the console.
        </p>
        <p className="cardText">
          The module also includes{' '}
          <span className="codeInline">PrettyPrinter</span> and{' '}
          <span className="codeInline">printValue</span> to format complex
          values for debugging output.
        </p>
      </Card>

      <Card header='Example: use IErrorLog service'>
        <SyntaxCodeBlock code={errorLogUsageCode} />
      </Card>

      <Card header='How to extend or modify'>
        <p className="cardText">
          Create your own <span className="codeInline">IErrorLog</span>{' '}
          implementation (for example memory/remote logging) and rebind{' '}
          <span className="codeInline">
            RsXCoreInjectionTokens.IErrorLog
          </span>{' '}
          to that class in singleton scope.
        </p>
      </Card>

      <Card header='Override error-log service'>
        <SyntaxCodeBlock code={errorLogOverrideCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />

    </DocsPageTemplate>
  );
}
