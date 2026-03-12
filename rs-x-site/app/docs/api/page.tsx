import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { apiPackages } from '../api-packages';

export const metadata = {
  title: 'API reference by package',
  description: 'Browse rs-x API documentation grouped by package.',
};

export default function ApiPackagesPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'API reference' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">API reference by package</h1>
          <p className="sectionLead">
            Choose a package first, then open its API entries.
          </p>
        </div>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Packages</h2>
        <ul className="docsApiLinkGrid">
          {apiPackages.map((pkg) => (
            <li key={pkg.key}>
              <Link className="docsApiLinkItem" href={pkg.href}>
                <span className="docsApiLinkTitle">{pkg.name}</span>
                <span className="docsApiLinkMeta">
                  {pkg.links.length} entries
                </span>
                <span className="cardText docsApiLinkDescription">
                  {pkg.description}
                </span>
                <span className="docsApiLinkArrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </DocsPageTemplate>
  );
}
