import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import {
  type ApiPackageKey,
  apiPackages,
  apiPackagesByKey,
} from '../../api-packages';

type PackagePageProps = {
  params: Promise<{ pkg: string }>;
};

export function generateStaticParams() {
  return apiPackages.map((entry) => ({ pkg: entry.key }));
}

export async function generateMetadata({ params }: PackagePageProps) {
  const { pkg } = await params;
  const entry = apiPackagesByKey[pkg as ApiPackageKey];
  if (!entry) {
    return { title: 'API reference' };
  }
  return {
    title: `${entry.name} API`,
    description: entry.description,
  };
}

export default async function PackageApiPage({ params }: PackagePageProps) {
  const { pkg } = await params;
  const entry = apiPackagesByKey[pkg as ApiPackageKey];
  if (!entry) {
    notFound();
  }

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'API reference', href: '/docs/api' },
              { label: `${entry.name} API` },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">{entry.name} API</h1>
          <p className="sectionLead">{entry.description}</p>
        </div>
        <div className="docsApiActions">
          {apiPackages
            .filter((pkgEntry) => pkgEntry.key !== entry.key)
            .map((pkgEntry) => (
              <Link
                key={pkgEntry.key}
                className="btn btnGhost"
                href={pkgEntry.href}
              >
                {pkgEntry.name} <span aria-hidden="true">→</span>
              </Link>
            ))}
        </div>
      </div>

      <article className="card docsApiCard">
        <h2 className="cardTitle">Package index</h2>
        <p className="cardText">
          API entries in <span className="codeInline">{entry.name}</span>:{' '}
          <span className="codeInline">{entry.links.length}</span>.
        </p>
        <ul className="docsApiLinkGrid">
          {entry.links.map((item) => (
            <li key={item.href}>
              <Link className="docsApiLinkItem" href={item.href}>
                <ItemLinkCardContent title={item.title} meta={item.meta} />
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </DocsPageTemplate>
  );
}
