import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const exampleCode = dedent`
  import {
    ContainerModule,
    Injectable,
    InjectionContainer,
    registerMultiInjectServices,
  } from '@rs-x/core';
  import {
    type IIdentifierOwnerResolver,
    rsx,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  // A shared constants store — values are accessible from any expression
  // without having to include them in every model object.
  const constants: Record<string, unknown> = {
    TAX_RATE: 0.21,
    SHIPPING_FLAT: 5,
  };

  @Injectable()
  class ConstantsOwnerResolver implements IIdentifierOwnerResolver {
    public resolve(index: unknown): object | null {
      if (
        typeof index === 'string' &&
        Object.prototype.hasOwnProperty.call(constants, index)
      ) {
        return constants;
      }
      return null;
    }
  }

  const ConstantsModule = new ContainerModule((options) => {
    registerMultiInjectServices(
      options,
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
      [{ target: ConstantsOwnerResolver, token: Symbol('ConstantsOwnerResolver') }],
    );
  });

  await InjectionContainer.load(RsXExpressionParserModule);
  await InjectionContainer.load(ConstantsModule);

  const model = { price: 100 };

  // TAX_RATE and SHIPPING_FLAT are resolved from constants,
  // price is resolved from model via PropertyOwnerResolver.
  const totalExpression = rsx<number>(
    'price + price * TAX_RATE + SHIPPING_FLAT',
  )(model);

  totalExpression.changed.subscribe(() => {
    console.log('total:', totalExpression.value);
  });

  console.log('initial total:', totalExpression.value); // 126

  model.price = 200;
  // After change: 200 + 200 * 0.21 + 5 = 247
`;

const doc: CoreConceptDoc = {
  title: 'Identifier owner resolver',
  lead: 'Determines which object in the expression context owns a given identifier. RS-X iterates a pluggable resolver list and returns the first non-null owner.',
  whatItMeans: (
    <>
      <p>
        When an expression like <code>a + b</code> is evaluated, each identifier
        (<code>a</code>, <code>b</code>) must be resolved to an owner — the
        object that contains it.{' '}
        <Link href="/docs/iidentifier-owner-resolver">
          IIdentifierOwnerResolver
        </Link>{' '}
        defines this contract: <code>resolve(index, context)</code> returns the
        owning object or <code>null</code> to pass to the next resolver in the
        list.
      </p>
      <p>
        <Link href="/docs/default-identifier-owner-resolver">
          DefaultIdentifierOwnerResolver
        </Link>{' '}
        is the default implementation. It holds an ordered resolver list via DI
        (<code>IIdentifierOwnerResolverList</code>) and iterates until one
        returns a non-null owner.
      </p>
      <p>The default list, in priority order:</p>
      <ul>
        <li>
          <Link href="/docs/property-owner-resolver">
            PropertyOwnerResolver
          </Link>{' '}
          — returns the context if it has the given property or field (including
          Date properties).
        </li>
        <li>
          <Link href="/docs/array-index-owner-resolver">
            ArrayIndexOwnerResolver
          </Link>{' '}
          — returns the array if the index is a valid numeric position within
          it.
        </li>
        <li>
          <Link href="/docs/set-key-owner-resolver">SetKeyOwnerResolver</Link> —
          returns the Set if it contains the given key.
        </li>
        <li>
          <Link href="/docs/map-key-owner-resolver">MapKeyOwnerResolver</Link> —
          returns the Map if it has the given key.
        </li>
        <li>
          <Link href="/docs/global-identifier-owner-resolver">
            GlobalIdentifierOwnerResolver
          </Link>{' '}
          — returns <code>globalThis</code> if the identifier is in the allowed
          globals list (<code>Math</code>, <code>Date</code>,{' '}
          <code>console</code>, and others).
        </li>
      </ul>
    </>
  ),
  whyItMatters:
    'RS-X is environment-agnostic. Adding a custom resolver lets you introduce new owner-lookup rules — for example, walking a component tree in a web-component framework — without changing core expression logic. Replace or reorder the default list with overrideMultiInjectServices.',
  keyPoints: [
    <>
      <Link href="/docs/iidentifier-owner-resolver">
        IIdentifierOwnerResolver
      </Link>
      : <code>resolve(index, context)</code> returns the owning{' '}
      <code>object</code> or <code>null</code> to skip to the next resolver.
    </>,
    'DefaultIdentifierOwnerResolver iterates the list in registration order; the first non-null result wins.',
    <>
      <Link href="/docs/global-identifier-owner-resolver">
        GlobalIdentifierOwnerResolver
      </Link>{' '}
      enables built-in globals like <code>Math</code>, <code>Date</code>, and{' '}
      <code>console</code> inside expressions.
    </>,
    <>
      Extend the list with{' '}
      <Link href="/docs/core-api/registerMultiInjectServices">
        registerMultiInjectServices
      </Link>
      ; replace or reorder it with{' '}
      <Link href="/docs/core-api/overrideMultiInjectServices">
        overrideMultiInjectServices
      </Link>
      .
    </>,
  ],
  exampleCode,
  deepDive: [
    {
      title: 'Resolution order and the first-non-null rule',
      paragraphs: [
        'DefaultIdentifierOwnerResolver iterates IIdentifierOwnerResolverList in registration order. The first resolver that returns a non-null value wins. This means you can prepend a high-priority resolver to intercept identifiers before the standard property lookup.',
        'If no resolver claims the identifier, resolve() returns null. RS-X then falls back to the next context in the expression binding chain.',
      ],
    },
    {
      title: 'Adding a custom resolver',
      paragraphs: [
        'Implement IIdentifierOwnerResolver and register it with registerMultiInjectServices(options, RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList, [...]). The new resolver is appended after the built-in defaults.',
        'To replace the full list or change priority order, call overrideMultiInjectServices with the complete desired list, including any built-in resolvers you want to keep.',
      ],
    },
  ],
  related: [
    {
      href: '/docs/iidentifier-owner-resolver',
      title: 'IIdentifierOwnerResolver',
      meta: 'Resolver contract: resolve(index, context)',
    },
    {
      href: '/docs/default-identifier-owner-resolver',
      title: 'DefaultIdentifierOwnerResolver',
      meta: 'Default list-iterating implementation',
    },
    {
      href: '/docs/property-owner-resolver',
      title: 'PropertyOwnerResolver',
      meta: 'Property / field owner lookup',
    },
    {
      href: '/docs/array-index-owner-resolver',
      title: 'ArrayIndexOwnerResolver',
      meta: 'Array index owner lookup',
    },
    {
      href: '/docs/set-key-owner-resolver',
      title: 'SetKeyOwnerResolver',
      meta: 'Set membership owner lookup',
    },
    {
      href: '/docs/map-key-owner-resolver',
      title: 'MapKeyOwnerResolver',
      meta: 'Map key owner lookup',
    },
    {
      href: '/docs/global-identifier-owner-resolver',
      title: 'GlobalIdentifierOwnerResolver',
      meta: 'Built-in globals (Math, Date, console…)',
    },
    {
      href: '/docs/core-api/overrideMultiInjectServices',
      title: 'overrideMultiInjectServices',
      meta: 'Replace or reorder the resolver list',
    },
    {
      href: '/docs/core-api/registerMultiInjectServices',
      title: 'registerMultiInjectServices',
      meta: 'Extend the resolver list',
    },
    {
      href: '/docs/core-concepts/dependency-injection',
      title: 'Dependency injection',
      meta: 'Container modules and DI patterns',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
