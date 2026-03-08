import Link from 'next/link';

import { coreApiItems } from './core-api.data';

export const metadata = {
  title: '@rs-x/core API',
  description: 'Complete public API inventory for @rs-x/core sorted alphabetically.',
};

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '');
}

export default function CoreApiDocsPage() {
  const groupedByModule = coreApiItems.reduce<Record<string, typeof coreApiItems>>((acc, item) => {
    if (!acc[item.module]) {
      acc[item.module] = [];
    }
    acc[item.module].push(item);
    return acc;
  }, {});
  const sortedModules = Object.keys(groupedByModule).sort((a, b) => a.localeCompare(b));

  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>@rs-x/core API</h1>
              <p className='sectionLead'>
                Browse all exported symbols from <span className='codeInline'>@rs-x/core</span>. Each item opens its own
                API documentation page in the same style as the other docs.
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs/iproxy-registry'>
                IProxyRegistry <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs/singleton-factory'>
                SingletonFactory <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <article className='card docsApiCard'>
            <h2 className='cardTitle'>Package index</h2>
            <p className='cardText'>
              Total symbols: <span className='codeInline'>{coreApiItems.length}</span>. Items are grouped by module and
              sorted alphabetically.
            </p>
            <div className='docsApiNamespaceList'>
              {sortedModules.map((moduleName) => (
                <section
                  key={moduleName}
                  id={`group-${moduleName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                  className='docsApiNamespace'
                >
                  <h3 className='docsApiNamespaceTitle'>{formatModuleLabel(moduleName)}</h3>
                  <ul className='docsApiLinkGrid'>
                    {groupedByModule[moduleName].map((item) => (
                      <li key={item.symbol}>
                        <Link className='docsApiLinkItem' href={`/docs/core-api/${encodeURIComponent(item.symbol)}`}>
                          <span className='docsApiLinkTitle'>{item.symbol}</span>
                          <span className='docsApiLinkMeta'>{item.kind}</span>
                          <span className='docsApiLinkArrow' aria-hidden='true'>→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
