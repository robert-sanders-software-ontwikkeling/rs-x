import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SyntaxCodeBlock } from '../../../../../components/SyntaxCodeBlock';
import { coreApiItems } from '../../core-api.data';

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '');
}

const groupedByModule = coreApiItems.reduce<Record<string, typeof coreApiItems>>((acc, item) => {
  if (!acc[item.module]) {
    acc[item.module] = [];
  }
  acc[item.module].push(item);
  return acc;
}, {});

const moduleEntries = Object.keys(groupedByModule)
  .sort((a, b) => a.localeCompare(b))
  .map((moduleName) => ({
    moduleName,
    slug: slugify(moduleName),
    items: [...groupedByModule[moduleName]].sort((a, b) => a.symbol.localeCompare(b.symbol))
  }));

const moduleBySlug = new Map(moduleEntries.map((entry) => [entry.slug, entry]));

export async function generateStaticParams() {
  return moduleEntries.map((entry) => ({ module: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const entry = moduleBySlug.get(module);
  if (!entry) {
    return { title: '@rs-x/core API' };
  }
  return {
    title: `@rs-x/core: ${formatModuleLabel(entry.moduleName)}`,
    description: `API items in ${formatModuleLabel(entry.moduleName)}.`,
  };
}

export default async function CoreApiModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const entry = moduleBySlug.get(module);
  if (!entry) {
    notFound();
  }

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

  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>@rs-x/core/{formatModuleLabel(entry.moduleName)}</h1>
              <p className='sectionLead'>
                Symbols in this module: <span className='codeInline'>{entry.items.length}</span>
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs/core-api'>
                Back to @rs-x/core API <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <article className='card docsApiCard coreModuleCard'>
            {entry.moduleName === 'deep-clone' && (
              <>
                <h2 className='cardTitle'>Current deep-clone implementation</h2>
                <p className='cardText'>
                  <span className='codeInline'>IDeepClone</span> resolves to{' '}
                  <span className='codeInline'>DefaultDeepClone</span>. It
                  receives <span className='codeInline'>IDeepCloneList</span>{' '}
                  via multi-inject and tries each clone implementation in
                  injected order until one succeeds.
                </p>
                <p className='cardText'>
                  In the default module configuration, list order is:
                  <span className='codeInline'> StructuredDeepClone</span> then
                  <span className='codeInline'> LodashDeepClone</span>. If one
                  strategy throws, the next strategy is attempted.
                </p>
                <p className='cardText'>
                  <span className='codeInline'>LodashDeepClone</span> unwraps
                  proxy-wrapped values to their original targets using{' '}
                  <Link href='/docs/iproxy-registry'>IProxyRegistry</Link>.
                  During clone traversal it also calls{' '}
                  <span className='codeInline'>IDeepCloneExcept</span> (default:
                  <span className='codeInline'> DefaultDeepCloneExcept</span>)
                  to substitute special values, such as Promise/Observable with
                  their last resolved/emitted value.
                </p>
                <h3 className='coreInlineCodeTitle'>Example: use IDeepClone service</h3>
                <SyntaxCodeBlock code={deepCloneUsageCode} />

                <h2 className='cardTitle'>How to extend or modify</h2>
                <p className='cardText'>
                  Register your own <span className='codeInline'>IDeepClone</span>{' '}
                  implementation and override{' '}
                  <span className='codeInline'>IDeepCloneList</span> order.
                  Earlier entries run first, so put domain-specific strategies
                  before generic fallbacks.
                </p>

                <h3 className='coreInlineCodeTitle'>Override deep-clone strategy order</h3>
                <SyntaxCodeBlock code={deepCloneExtensionCode} />
              </>
            )}

            {entry.moduleName === 'dependency-injection.ts' && (
              <>
                <h2 className='cardTitle'>Current dependency-injection implementation</h2>
                <p className='cardText'>
                  This module wraps and re-exports the DI runtime used by rs-x.
                  It is based on{' '}
                  <a href='https://inversify.io/' target='_blank' rel='noreferrer'>
                    Inversify
                  </a>{' '}
                  and exposes rs-x-friendly helpers such as{' '}
                  <span className='codeInline'>InjectionContainer</span>,{' '}
                  <span className='codeInline'>ContainerModule</span>, decorator
                  aliases (<span className='codeInline'>Injectable</span>,{' '}
                  <span className='codeInline'>Inject</span>,{' '}
                  <span className='codeInline'>MultiInject</span>), and multi-bind
                  helper functions.
                </p>
                <p className='cardText'>
                  The global <span className='codeInline'>InjectionContainer</span>{' '}
                  is a shared singleton container used across core, state-manager,
                  and expression-parser modules.
                </p>

                <h2 className='cardTitle'>How to extend or modify</h2>
                <p className='cardText'>
                  Use <span className='codeInline'>ContainerModule</span> plus{' '}
                  <span className='codeInline'>registerMultiInjectServices</span>{' '}
                  or <span className='codeInline'>overrideMultiInjectServices</span>{' '}
                  to add or replace implementations for a multi-inject token list.
                </p>
                <h3 className='coreInlineCodeTitle'>Example: register custom DI module</h3>
                <SyntaxCodeBlock code={diUsageCode} />
              </>
            )}

            <div className='coreModuleSymbols'>
              <h2 className='cardTitle'>Module symbols</h2>
              <ul className='docsApiLinkGrid'>
                {entry.items.map((item) => (
                  <li key={item.symbol}>
                    <Link className='docsApiLinkItem' href={`/docs/core-api/${encodeURIComponent(item.symbol)}`}>
                      <span className='docsApiLinkTitle'>{item.symbol}</span>
                      <span className='docsApiLinkMeta'>{item.kind}</span>
                      <span className='docsApiLinkArrow' aria-hidden='true'>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
