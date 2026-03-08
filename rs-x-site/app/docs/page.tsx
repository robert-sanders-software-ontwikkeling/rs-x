export const metadata = {
  title: 'Docs',
  description: 'Documentation and concepts for rs-x declarative reactivity.'
};

import { coreApiItems } from './core-api/core-api.data';

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

const coreLinks = Array.from(new Set(coreApiItems.map((item) => item.module)))
  .sort((a, b) => a.localeCompare(b))
  .map((moduleName) => {
    const count = coreApiItems.filter((item) => item.module === moduleName).length;
    return {
    href: `/docs/core-api/module/${slugify(moduleName)}`,
    title: moduleName,
    meta: `${count} symbols`
  };
  });

const apiNamespaces = [
  {
    name: '@rs-x/core',
    href: '/docs/core-api',
    links: coreLinks
  },
  {
    name: '@rs-x/expression-parser',
    links: [
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Change transaction manager',
        meta: 'Suspend/continue/commit'
      },
      { href: '/docs/change-hook', title: 'ChangeHook', meta: 'Custom change callback' },
      { href: '/docs/expression-change-commit-handler', title: 'Commit handler', meta: 'Commit callback contract' },
      { href: '/docs/expression-type', title: 'ExpressionType', meta: 'Node type enum' },
      { href: '/docs/abstract-expression', title: 'AbstractExpression', meta: 'Expression tree base class' },
      { href: '/docs/iexpression', title: 'IExpression', meta: 'Runtime expression object' },
      { href: '/docs/index-watch-rule', title: 'IIndexWatchRule', meta: 'Leaf index watch rule' },
      { href: '/docs/rsx-function', title: 'rsx function', meta: 'Binding entry point' },
      {
        href: '/docs/expression-change-tracker-manager',
        title: 'Tracker manager',
        meta: 'Track history streams'
      }
    ]
  }
];

const advancedLinks = [
  { href: '/advanced', title: 'Expression creation', meta: 'How an expression instance is created' },
  { href: '/advanced/binding', title: 'Binding flow', meta: 'Factory -> manager -> cache -> parser' },
  { href: '/advanced/services', title: 'Service wiring', meta: 'Cross-package dependency graph' },
  { href: '/advanced/observation', title: 'Observation strategy', meta: 'How values are observed by type' },
  { href: '/advanced/commit', title: 'Commit pipeline', meta: 'Batching, commit, and changed emission' }
];

export default function DocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsLandingSection'>
        <div className='container docsPage'>
          <h1 className='sectionTitle'>Documentation</h1>
          <p className='docsPageLead'>
            Start with concepts, then move to API details and practical recipes.
          </p>

          <div className='docsCards'>
            <article className='card'>
              <p className='docsCardEyebrow'>Guide</p>
              <h2 className='cardTitle'>Core concepts</h2>
              <p className='cardText'>The dependency graph and how updates propagate.</p>
              <div className='cardLinks'>
                <a className='cardLink' href='/get-started'>
                  Start here <span aria-hidden='true'>→</span>
                </a>
              </div>
            </article>

            <article className='card'>
              <p className='docsCardEyebrow'>API</p>
              <h2 className='cardTitle'>API reference</h2>
              <p className='cardText'>
                Start with transaction batching and expression change tracking.
              </p>
              <div className='docsApiNamespaceList' aria-label='API docs'>
                {apiNamespaces.map((namespace) => (
                  <section key={namespace.name} className='docsApiNamespace'>
                    <h3 className='docsApiNamespaceTitle'>
                      {namespace.href ? <a href={namespace.href}>{namespace.name}</a> : namespace.name}
                    </h3>
                    <ul className='docsApiLinkGrid'>
                      {namespace.links.map((link) => (
                        <li key={link.href}>
                          <a className='docsApiLinkItem' href={link.href}>
                            <span className='docsApiLinkTitle'>{link.title}</span>
                            <span className='docsApiLinkMeta'>{link.meta}</span>
                            <span className='docsApiLinkArrow' aria-hidden='true'>→</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>

            <article className='card'>
              <p className='docsCardEyebrow'>Patterns</p>
              <h2 className='cardTitle'>Recipes</h2>
              <p className='cardText'>Patterns: async, batching, derived trees, performance.</p>
              <div className='cardLinks'>
                <span className='cardNote'>Recipes section coming soon</span>
              </div>
            </article>

            <article className='card'>
              <p className='docsCardEyebrow'>Architecture</p>
              <h2 className='cardTitle'>Advanced</h2>
              <p className='cardText'>
                Deep technical diagram of parser, state manager, resolver chain, and proxy/observer behavior by data type.
              </p>
              <ul className='docsApiLinkGrid' aria-label='Advanced runtime docs'>
                {advancedLinks.map((link) => (
                  <li key={link.href}>
                    <a className='docsApiLinkItem' href={link.href}>
                      <span className='docsApiLinkTitle'>{link.title}</span>
                      <span className='docsApiLinkMeta'>{link.meta}</span>
                      <span className='docsApiLinkArrow' aria-hidden='true'>→</span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
