import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'IProxyRegistry',
  description:
    'Map proxy targets to proxy instances and resolve back from proxy to target in rs-x core.',
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
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>IProxyRegistry</h1>
              <p className='sectionLead'>
                Registry that maps raw targets to proxies and lets rs-x resolve
                the target from a proxy instance.
              </p>
              <p className='docsApiInterface'>
                Interface: <span className='codeInline'>IProxyRegistry</span>
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Description</h2>
              <p className='cardText'>
                Stores the relationship between original objects and their proxy
                wrappers.
              </p>
              <p className='cardText'>
                This lets rs-x avoid double-wrapping and recover the original
                target when needed by observers and cloning services.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
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

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                <span className='codeInline'>getProxy&lt;T&gt;</span> returns the registered proxy as <span className='codeInline'>T</span>.
              </p>
              <p className='cardText'>
                <span className='codeInline'>getProxyTarget&lt;T&gt;</span> returns the original target as <span className='codeInline'>T</span>.
              </p>
              <p className='cardText'>
                <span className='codeInline'>isProxy</span> returns <span className='codeInline'>boolean</span>; register/unregister return <span className='codeInline'>void</span>.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Usage notes</h2>
              <p className='cardText'>
                Register on proxy creation with{' '}
                <span className='codeInline'>register(target, proxy)</span> and
                remove with <span className='codeInline'>unregister(target)</span>{' '}
                when proxy ownership is released.
              </p>
              <p className='cardText'>
                In default setup, <span className='codeInline'>IProxyRegistry</span>{' '}
                is a singleton in <span className='codeInline'>RsXCoreModule</span>.
              </p>
            </article>

            <aside className='qsCodeCard docsApiCode' aria-label='API and usage'>
              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>API</div>
              </div>
              <SyntaxCodeBlock code={apiCode} />

              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Usage example</div>
              </div>
              <SyntaxCodeBlock code={usageCode} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
