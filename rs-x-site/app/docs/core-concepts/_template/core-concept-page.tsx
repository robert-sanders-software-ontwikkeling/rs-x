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
  description: ReactNode;
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
    paragraphs: ReactNode[];
    code?: string;
    codeLanguage?: string;
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
  examplesPrefix,
  examplesSlot,
}: {
  doc: CoreConceptDoc;
  headerNote?: ReactNode;
  examplesPrefix?: ReactNode;
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
            {section.paragraphs.map((paragraph, index) =>
              typeof paragraph === 'string' ? (
                <p key={index} className="cardText">
                  {paragraph}
                </p>
              ) : (
                <div key={index} className="cardText">
                  {paragraph}
                </div>
              ),
            )}
            {section.code && <SyntaxCodeBlock code={section.code} />}
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
          (examplesPrefix ? examplesPrefix : null) ??
          doc.examples?.map((example) => (
            <article key={example.title} className="card docsApiCard">
              <h2 className="cardTitle">{example.title} example</h2>
              <div className="cardText">{example.description}</div>
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

        {!examplesSlot && examplesPrefix
          ? doc.examples?.map((example) => (
              <article key={example.title} className="card docsApiCard">
                <h2 className="cardTitle">{example.title} example</h2>
                <div className="cardText">{example.description}</div>
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
            ))
          : null}

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
