import Link from 'next/link';
import type { ReactNode } from 'react';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

export type RelatedLink = {
  href: string;
  title: string;
  meta: string;
};

export type CoreConceptExample = {
  title: string;
  description: string;
  code: string;
  playgroundScript?: string;
};

export type CoreConceptDoc = {
  title: string;
  lead: string;
  whatItMeans: ReactNode;
  whyItMatters: ReactNode;
  keyPoints: ReactNode[];
  deepDive?: Array<{
    title: string;
    paragraphs: string[];
  }>;
  exampleCode?: string;
  playgroundScript?: string;
  examples?: CoreConceptExample[];
  related: RelatedLink[];
};

export const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

export function CoreConceptPageLayout({
  doc,
  headerNote,
  examplesSlot,
}: {
  doc: CoreConceptDoc;
  headerNote?: ReactNode;
  examplesSlot?: ReactNode;
}) {
  const tryInPlaygroundHref = doc.playgroundScript
    ? toPlaygroundHref(doc.playgroundScript)
    : null;

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: doc.title },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">{doc.title}</h1>
          <p className="sectionLead">{doc.lead}</p>
          {headerNote}
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What it means</h2>
          <div className="cardText">{doc.whatItMeans}</div>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Practical value</h2>
          <div className="cardText">{doc.whyItMatters}</div>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Key points</h2>
          <ul className="advancedTopicLinks">
            {doc.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </article>

        {doc.deepDive?.map((section) => (
          <article key={section.title} className="card docsApiCard">
            <h2 className="cardTitle">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="cardText">
                {paragraph}
              </p>
            ))}
          </article>
        ))}

        {doc.exampleCode && (
          <article className="card docsApiCard">
            <h2 className="cardTitle">Example</h2>
            {tryInPlaygroundHref ? (
              <div className="cardLinks">
                <Link className="cardLink" href={tryInPlaygroundHref}>
                  Try in playground <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}
            <SyntaxCodeBlock code={doc.exampleCode} />
          </article>
        )}

        {examplesSlot ??
          doc.examples?.map((example) => (
            <article key={example.title} className="card docsApiCard">
              <h2 className="cardTitle">{example.title} example</h2>
              <p className="cardText">{example.description}</p>
              {example.playgroundScript ? (
                <div className="cardLinks">
                  <Link
                    className="cardLink"
                    href={toPlaygroundHref(example.playgroundScript)}
                  >
                    Try in playground <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : null}
              <SyntaxCodeBlock code={example.code} />
            </article>
          ))}

        <article className="card docsApiCard">
          <h2 className="cardTitle">Related docs</h2>
          <ul className="docsApiLinkGrid">
            {doc.related.map((link) => (
              <li key={link.href}>
                <Link className="docsApiLinkItem" href={link.href}>
                  <ItemLinkCardContent title={link.title} meta={link.meta} />
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
