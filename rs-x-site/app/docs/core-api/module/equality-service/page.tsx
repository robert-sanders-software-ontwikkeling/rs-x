import dedent from 'dedent';

import { type DocsBreadcrumbItem } from '../../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { ApiDocHeader } from '../../../components/api-doc-header';
import { Card } from '../../../components/card';
import { ModuleApiEntries } from '../module-api-entries';
import { formatModuleLabel, moduleBySlug } from '../module-page.helpers';

const entry = moduleBySlug.get('equality-service')!;

export function generateMetadata() {
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default function CoreApiModuleEqualityServicePage() {
  const hasMultipleEntries = entry.items.length > 1;

  const equalityUsageCode = dedent`
    import {
      InjectionContainer,
      RsXCoreInjectionTokens,
      RsXCoreModule,
      type IEqualityService,
    } from '@rs-x/core';

    await InjectionContainer.load(RsXCoreModule);

    const equality = InjectionContainer.get<IEqualityService>(
      RsXCoreInjectionTokens.IEqualityService,
    );

    const left = { id: 1, nested: { name: 'Ada' } };
    const right = { id: 1, nested: { name: 'Ada' } };

    console.log(equality.isEqual(left, right)); // true
  `;
  const equalityOverrideCode = dedent`
    import { createCustomEqual } from 'fast-equals';
    import {
      ContainerModule,
      InjectionContainer,
      Injectable,
      RsXCoreInjectionTokens,
      type IEqualityService,
    } from '@rs-x/core';

    @Injectable()
    class StrictReferenceEqualityService implements IEqualityService {
      public isEqual = createCustomEqual({
        createCustomConfig: (base) => ({
          ...base,
          areObjectsEqual: (a, b) => a === b,
        }),
      });
    }

    const module = new ContainerModule((options) => {
      if (options.isBound(RsXCoreInjectionTokens.IEqualityService)) {
        options.unbind(RsXCoreInjectionTokens.IEqualityService);
      }

      options
        .bind<IEqualityService>(RsXCoreInjectionTokens.IEqualityService)
        .to(StrictReferenceEqualityService)
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

      <Card header="Current equality-service implementation">
        <p className="cardText">
          <span className="codeInline">IEqualityService</span> resolves to{' '}
          <span className="codeInline">EqualityService</span> in{' '}
          <span className="codeInline">RsXCoreModule</span> singleton scope.
          Consumers should resolve the service via{' '}
          <span className="codeInline">
            RsXCoreInjectionTokens.IEqualityService
          </span>{' '}
          instead of instantiating the class directly.
        </p>
        <p className="cardText">
          The default implementation uses{' '}
          <a
            className="codeInline"
            href="https://www.npmjs.com/package/fast-equals"
            target="_blank"
            rel="noreferrer"
          >
            fast-equals
          </a>{' '}
          with custom object handling. For most objects it performs deep
          equality. For RxJS Observables, it compares by reference (
          <span className="codeInline">a === b</span>) to avoid treating
          separate stream instances as equal by structure.
        </p>
        <p className="cardText">
          This service is used by runtime change-detection decisions where rs-x
          needs to know whether a value is materially changed before propagating
          updates.
        </p>
      </Card>

      <Card header="Example: use IEqualityService">
        <SyntaxCodeBlock code={equalityUsageCode} />
      </Card>

      <Card header="How to extend or modify">
        <p className="cardText">
          Provide your own <span className="codeInline">IEqualityService</span>{' '}
          implementation and rebind{' '}
          <span className="codeInline">
            RsXCoreInjectionTokens.IEqualityService
          </span>{' '}
          to your custom class. Keep singleton scope so all runtime components
          share the same equality behavior.
        </p>
      </Card>

      <Card header="Override equality service">
        <SyntaxCodeBlock code={equalityOverrideCode} />
      </Card>

      <ModuleApiEntries items={entry.items} />
    </DocsPageTemplate>
  );
}
