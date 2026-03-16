import dedent from 'dedent';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'IProxyRegistry',
  description:
    'Shared in-memory registry that maps targets to proxies and resolves proxies back to targets.',
};

const apiCode = dedent`
  export interface IProxyRegistry {
    getProxyTarget<T>(proxyToFind: unknown): T;
    getProxy<T>(proxyTarget: unknown): T;
    register(proxyTarget: unknown, proxy: unknown): void;
    unregister(proxyTarget: unknown): void;
    isProxy(object: unknown): boolean;
  }
`;

const usageCode = dedent`
  import {
    InjectionContainer,
    type IProxyRegistry,
    RsXCoreInjectionTokens,
    RsXCoreModule,
  } from '@rs-x/core';

  await InjectionContainer.load(RsXCoreModule);

  const proxyRegistry = InjectionContainer.get(
    RsXCoreInjectionTokens.IProxyRegistry,
  ) as IProxyRegistry;

  const target = { id: 1 };
  const proxy = new Proxy(target, {});

  proxyRegistry.register(target, proxy);

  const proxied = proxyRegistry.getProxy<typeof proxy>(target);
  const original = proxyRegistry.getProxyTarget<typeof target>(proxy);
  const isRegisteredProxy = proxyRegistry.isProxy(proxy);

  proxyRegistry.unregister(target);
`;

export default function IProxyRegistryDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/core' },
              { label: 'IProxyRegistry' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">IProxyRegistry</h1>
          <p className="sectionLead">
            Shared in-memory registry that stores target/proxy pairs and lets
            rs-x move between wrapped and unwrapped references.
          </p>
          <p className="docsApiInterface">
            Interface: <span className="codeInline">IProxyRegistry</span>
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            This registry keeps track of original objects and their proxies.
          </p>
          <p className="cardText">
            Core services use it to avoid double-wrapping and to recover the
            original object when needed (for example in deep-clone flows).
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'proxyTarget',
                type: 'unknown',
                description:
                  'Original (non-proxy) object used as registry lookup key.',
              },
              {
                name: 'proxy',
                type: 'unknown',
                description: 'Proxy instance associated with proxyTarget.',
              },
              {
                name: 'object',
                type: 'unknown',
                description:
                  'Value checked by isProxy(...) to determine whether it is a registered proxy.',
              },
            ]}
          />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Return type</h2>
          <p className="cardText">
            <span className="codeInline">getProxy&lt;T&gt;</span> returns the
            registered proxy as <span className="codeInline">T</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">getProxyTarget&lt;T&gt;</span> returns
            the original target as <span className="codeInline">T</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">isProxy</span> returns{' '}
            <span className="codeInline">boolean</span>; register/unregister
            return <span className="codeInline">void</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage notes</h2>
          <p className="cardText">
            Use <span className="codeInline">register(target, proxy)</span> to
            add or replace a mapping. Use{' '}
            <span className="codeInline">getProxy(target)</span> to read the
            proxy and <span className="codeInline">getProxyTarget(proxy)</span>{' '}
            to get the original target back.
          </p>
          <p className="cardText">
            <span className="codeInline">isProxy(value)</span> checks whether a
            value is currently registered as a proxy.{' '}
            <span className="codeInline">unregister(target)</span> removes a
            mapping.
          </p>
          <p className="cardText">
            In the default setup,{' '}
            <span className="codeInline">IProxyRegistry</span> resolves to{' '}
            <span className="codeInline">ProxyRegistry</span> as a singleton
            service in <span className="codeInline">RsXCoreModule</span>. The
            registry is memory-only and is not persisted.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="API and usage">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />

          <div className="qsCodeHeader">
            <div className="qsCodeTitle">Usage example</div>
          </div>
          <SyntaxCodeBlock code={usageCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
