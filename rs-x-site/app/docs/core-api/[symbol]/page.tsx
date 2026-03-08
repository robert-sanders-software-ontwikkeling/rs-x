import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { ApiParameterItem } from '../../../../components/ApiParameterList';
import { ApiParameterList } from '../../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import { coreApiBySymbol, coreApiItems } from '../core-api.data';

const MODULE_DETAILS: Record<string, string> = {
  'deep-clone': 'Part of the cloning pipeline used to copy values while preserving rs-x runtime rules.',
  'dependency-injection.ts': 'Provides DI container wiring utilities for registering, overriding, and resolving service lists.',
  'equality-service': 'Used by runtime comparison logic to decide whether a value has materially changed.',
  'error-log': 'Used for logging, diagnostics, and debugging helper output in core services.',
  'exceptions': 'Represents typed error flows for assertions, invalid operations, and unsupported states.',
  'function-call-index': 'Supports function-call identity tracking when expressions depend on call arguments.',
  'function-call-result-cache': 'Caches function-call results to avoid unnecessary recomputation.',
  'guid': 'Provides unique id generation helpers used across runtime services.',
  'index-value-accessor': 'Resolves values by property/index/key/method/global path at runtime.',
  'object-store': 'Stores objects by id/key for reuse and lookup across service boundaries.',
  'proxy-registry': 'Keeps bidirectional mapping between raw targets and proxy wrappers.',
  'rs-x-core.injection-tokens.ts': 'Defines DI tokens for registering and resolving core services.',
  'rs-x-core.module.ts': 'Defines the default @rs-x/core module registrations and singleton bindings.',
  'sequence-id': 'Creates incrementing sequence ids scoped by runtime context.',
  'singleton-factory': 'Reference-counted creation/reuse abstraction for singleton-like instances per id.',
  'types': 'Low-level shared types and utilities used throughout core/state/parser packages.',
  'value-metadata': 'Classifies runtime values and decides metadata-driven behavior (async/proxy/etc.).',
  'wait-for-event.ts': 'Async utility for waiting on observable/event-based completion.',
};

function defaultWhatItDoes(symbol: string, kind: string, fallback: string): string {
  if (kind === 'function') {
    return `${symbol} is a runtime helper function. ${fallback}`;
  }
  if (kind === 'const') {
    return `${symbol} is a shared runtime constant/token. ${fallback}`;
  }
  if (kind === 'interface') {
    return `${symbol} defines the contract implemented by runtime services. ${fallback}`;
  }
  if (kind === 'type') {
    return `${symbol} defines a reusable TypeScript type alias. ${fallback}`;
  }
  if (kind === 'enum') {
    return `${symbol} defines a finite set of named runtime values. ${fallback}`;
  }
  if (kind.includes('class')) {
    return `${symbol} is a runtime class used by core services. ${fallback}`;
  }
  return fallback;
}

type SymbolDocumentation = {
  summary?: string;
  parameters?: ApiParameterItem[];
  returns?: string;
  notes?: string;
  exampleCode?: string;
  fullSignature?: string;
};

const SYMBOL_DOCS: Record<string, SymbolDocumentation> = {
  overrideMultiInjectServices: {
    summary:
      'Replaces the registered implementation list for a multi-inject token. Use it when you want to change default strategy order at runtime.',
    parameters: [
      {
        name: 'container',
        type: 'Container | ContainerModuleLoadOptions',
        description:
          'DI container (or module load context) where multi-inject bindings should be replaced.',
      },
      {
        name: 'multiInjectToken',
        type: 'symbol',
        description: 'Multi-inject list token whose current bindings should be overridden.',
      },
      {
        name: 'services',
        type: 'readonly IMultiInjectService[]',
        description: 'New ordered service list. Earlier items are resolved first.',
      },
    ],
    returns: 'void',
    notes:
      'Use during module/bootstrap setup when you need to replace the default strategy list (for example deep-clone or accessor order) with your own ordered implementation set.',
    fullSignature: dedent`
      export function overrideMultiInjectServices(
        container: Container | ContainerModuleLoadOptions,
        multiInjectToken: symbol,
        services: readonly IMultiInjectService[],
      ): void;
    `,
    exampleCode: dedent`
      import {
        InjectionContainer,
        overrideMultiInjectServices,
        RsXCoreInjectionTokens,
        type IMultiInjectService,
      } from '@rs-x/core';

      const customList: IMultiInjectService[] = [
        { target: MyStrategy, token: Symbol('MyStrategy') },
      ];

      overrideMultiInjectServices(
        InjectionContainer,
        RsXCoreInjectionTokens.IDeepCloneList,
        customList,
      );
    `,
  },
  registerMultiInjectService: {
    summary:
      'Registers one target class as singleton and optionally aliases it via service token + multi-inject token.',
    fullSignature: dedent`
      export function registerMultiInjectService(
        container: Container | ContainerModuleLoadOptions,
        target: Newable<unknown>,
        options: IMultiInjectTokens,
      ): void;
    `,
    parameters: [
      {
        name: 'container',
        type: 'Container | ContainerModuleLoadOptions',
        description: 'DI container (or module load context) where the service should be registered.',
      },
      {
        name: 'target',
        type: 'Newable<unknown>',
        description: 'Concrete class constructor to bind in singleton scope.',
      },
      {
        name: 'options',
        type: 'IMultiInjectTokens',
        description:
          'Token configuration containing required multiInjectToken and optional serviceToken alias.',
      },
    ],
    returns: 'void',
    exampleCode: dedent`
      import {
        InjectionContainer,
        registerMultiInjectService,
        type IMultiInjectTokens,
      } from '@rs-x/core';

      const options: IMultiInjectTokens = {
        multiInjectToken: Symbol.for('IHandlerList'),
        serviceToken: Symbol.for('IHandler'),
      };

      registerMultiInjectService(InjectionContainer, MyHandler, options);
    `,
  },
  registerMultiInjectServices: {
    summary: 'Registers multiple implementations into a multi-inject token list in one call.',
    fullSignature: dedent`
      export function registerMultiInjectServices(
        container: Container | ContainerModuleLoadOptions,
        multiInjectToken: symbol,
        services: readonly IMultiInjectService[],
      ): void;
    `,
    parameters: [
      {
        name: 'container',
        type: 'Container | ContainerModuleLoadOptions',
        description: 'DI container (or module load context) where services should be registered.',
      },
      {
        name: 'multiInjectToken',
        type: 'symbol',
        description: 'Multi-inject list token that receives the services.',
      },
      {
        name: 'services',
        type: 'readonly IMultiInjectService[]',
        description: 'Ordered service descriptors to register.',
      },
    ],
    returns: 'void',
  },
  IMultiInjectService: {
    summary:
      'Descriptor for one class entry in a multi-inject registration list. It pairs a concrete target class with its service token alias.',
    fullSignature: dedent`
      export interface IMultiInjectService {
        target: Newable<unknown>;
        token: symbol;
      }
    `,
    parameters: [
      {
        name: 'target',
        type: 'Newable<unknown>',
        description: 'Concrete class constructor to bind in the container.',
      },
      {
        name: 'token',
        type: 'symbol',
        description: 'Service token alias resolved via toService(target).',
      },
    ],
    returns: 'Type contract only.',
    exampleCode: dedent`
      import type { IMultiInjectService } from '@rs-x/core';

      const service: IMultiInjectService = {
        target: MyHandler,
        token: Symbol.for('IHandler'),
      };
    `,
  },
  IMultiInjectTokens: {
    summary:
      'Token config used by registerMultiInjectService. It defines required list token and optional service alias token.',
    fullSignature: dedent`
      export interface IMultiInjectTokens {
        serviceToken?: symbol;
        multiInjectToken: symbol;
      }
    `,
    parameters: [
      {
        name: 'multiInjectToken',
        type: 'symbol',
        description: 'Required token representing the multi-inject list binding.',
      },
      {
        name: 'serviceToken?',
        type: 'symbol',
        description: 'Optional alias token pointing to the same target class.',
      },
    ],
    returns: 'Type contract only.',
    exampleCode: dedent`
      import type { IMultiInjectTokens } from '@rs-x/core';

      const tokens: IMultiInjectTokens = {
        multiInjectToken: Symbol.for('IHandlerList'),
        serviceToken: Symbol.for('IHandler'),
      };
    `,
  },
  InjectionContainer: {
    summary: 'Global shared Inversify container used by rs-x packages.',
    returns: 'Container singleton instance.',
    notes: 'Load required modules before resolving services.',
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import { RsXExpressionParserModule } from '@rs-x/expression-parser';

      await InjectionContainer.load(RsXExpressionParserModule);
    `,
  },
};

function isCallableTypeSignature(signature: string): boolean {
  return /^export type\s+\w+\s*=/.test(signature) && signature.includes('=>');
}

function defaultParameters(kind: string, signature: string): ApiParameterItem[] {
  if (kind === 'function' || isCallableTypeSignature(signature)) {
    return [
      {
        name: 'See declaration',
        type: 'Signature-defined',
        description:
          'Parameter names and types are defined in the API declaration block below.',
      },
    ];
  }
  return [];
}

function defaultReturnType(kind: string, signature: string): string {
  if (kind === 'function') {
    const match = signature.match(/\)\s*:\s*([^;{]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (isCallableTypeSignature(signature)) {
    const match = signature.match(/=>\s*([^;]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (kind === 'const') {
    return 'Constant value (see declaration).';
  }
  if (kind.includes('class')) {
    return 'Class instance when constructed.';
  }
  if (kind === 'interface' || kind === 'type' || kind === 'enum') {
    return 'Type-level contract (no direct runtime return value).';
  }
  return 'See declaration';
}

function defaultExample(symbol: string, kind: string): string {
  if (kind === 'function') {
    return `import { ${symbol} } from '@rs-x/core';\n\n${symbol}(/* arguments */);`;
  }
  if (kind.includes('class')) {
    return `import { ${symbol} } from '@rs-x/core';\n\nconst instance = new ${symbol}(...args);`;
  }
  if (kind === 'interface') {
    return `import type { ${symbol} } from '@rs-x/core';\n\nconst value: ${symbol} = {\n  // implement required members\n};`;
  }
  if (kind === 'type') {
    return `import type { ${symbol} } from '@rs-x/core';\n\ntype Local${symbol} = ${symbol};`;
  }
  if (kind === 'enum') {
    return `import { ${symbol} } from '@rs-x/core';\n\nconst current = ${symbol}[Object.keys(${symbol})[0] as keyof typeof ${symbol}];`;
  }
  if (kind === 'const') {
    return `import { ${symbol} } from '@rs-x/core';\n\nconsole.log(${symbol});`;
  }
  return `import { ${symbol} } from '@rs-x/core';`;
}

function relatedDocs(symbol: string): Array<{ href: string; label: string }> {
  if (symbol === 'IProxyRegistry' || symbol === 'ProxyRegistry') {
    return [{ href: '/docs/iproxy-registry', label: 'IProxyRegistry docs' }];
  }
  if (
    symbol === 'SingletonFactory' ||
    symbol === 'ISingletonFactory' ||
    symbol === 'SingletonFactoryWithIdGeneration' ||
    symbol === 'SingletonFactoryWithGuid' ||
    symbol === 'ISingletonFactoryWithIdGeneration'
  ) {
    return [{ href: '/docs/singleton-factory', label: 'SingletonFactory docs' }];
  }
  return [];
}

export async function generateStaticParams() {
  return coreApiItems.map((item) => ({ symbol: item.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const entry = coreApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    return { title: '@rs-x/core API' };
  }
  return {
    title: `@rs-x/core: ${entry.symbol}`,
    description: entry.description,
  };
}

export default async function CoreApiSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const entry = coreApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    notFound();
  }

  const usageSnippet = `import { ${entry.symbol} } from '@rs-x/core';`;
  const related = relatedDocs(entry.symbol);
  const moduleDetail = MODULE_DETAILS[entry.module] ?? 'Core runtime export used by @rs-x internals.';
  const override = SYMBOL_DOCS[entry.symbol];
  const parameterDocs = override?.parameters ?? defaultParameters(entry.kind, entry.signature);
  const returnTypeDoc = override?.returns ?? defaultReturnType(entry.kind, entry.signature);
  const usageNotes = override?.notes;
  const usageExample = override?.exampleCode ?? defaultExample(entry.symbol, entry.kind);
  const apiSignature = override?.fullSignature ?? entry.signature;
  const whatItDoes = override?.summary ?? defaultWhatItDoes(entry.symbol, entry.kind, entry.description);

  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>{entry.symbol}</h1>
              <p className='sectionLead'>{whatItDoes}</p>
              <p className='docsApiInterface'>
                Package: <span className='codeInline'>@rs-x/core</span>
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

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>What it does</h2>
              <p className='cardText'>
                {whatItDoes}
              </p>
              <p className='cardText'>
                Declaration kind: <span className='codeInline'>{entry.kind}</span>
              </p>
              <p className='cardText'>{moduleDetail}</p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList items={parameterDocs} />
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                {returnTypeDoc}
              </p>
            </article>

            {(usageNotes || related.length > 0) && (
              <article className='card docsApiCard'>
                <h2 className='cardTitle'>When to use</h2>
                {usageNotes && <p className='cardText'>{usageNotes}</p>}
                {related.length > 0 && (
                  <p className='cardText'>
                    Related:{' '}
                    {related.map((item, index) => (
                      <span key={item.href}>
                        {index > 0 ? ', ' : ''}
                        <Link href={item.href}>{item.label}</Link>
                      </span>
                    ))}
                  </p>
                )}
              </article>
            )}

            <aside className='qsCodeCard docsApiCode' aria-label='API and usage'>
              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Declaration</div>
              </div>
              <SyntaxCodeBlock code={apiSignature} />

              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Import</div>
              </div>
              <SyntaxCodeBlock code={usageSnippet} />

              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Example</div>
              </div>
              <SyntaxCodeBlock code={usageExample} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
