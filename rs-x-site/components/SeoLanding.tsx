import Link from 'next/link';

import type { SeoLandingContent } from './seo-landing-data';

type SeoLandingProps = {
  content: SeoLandingContent;
};

export function SeoLanding({ content }: SeoLandingProps) {
  return (
    <main id="content">
      <section className="toolingSection">
        <div className="container">
          <header className="toolingHeader">
            <h1 className="toolingTitle">{content.title}</h1>
            <p className="toolingLead">{content.lead}</p>
          </header>

          <div className="heroActions">
            <Link className="btn btnPrimary" href={content.primaryCta.href}>
              {content.primaryCta.label}
            </Link>
            {content.secondaryCta ? (
              <Link className="btn btnGhost" href={content.secondaryCta.href}>
                {content.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="toolingSection">
        <div className="container">
          <header className="toolingHeader">
            <h2 className="toolingTitle">Why rs-x</h2>
            <p className="toolingLead">{content.overview}</p>
          </header>

          <div className="toolingCards">
            {content.highlights.map((item) => (
              <article className="toolingCard" key={item}>
                <div className="toolingCardBody">
                  <p className="toolingCardText">{item}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="toolingSection">
        <div className="container">
          <header className="toolingHeader">
            <h2 className="toolingTitle">Common use cases</h2>
            <p className="toolingLead">
              Typical scenarios where fine-grained change detection pays off.
            </p>
          </header>

          <div className="toolingCards">
            {content.useCases.map((item) => (
              <article className="toolingCard" key={item}>
                <div className="toolingCardBody">
                  <p className="toolingCardText">{item}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="toolingSection">
        <div className="container">
          <header className="toolingHeader">
            <h2 className="toolingTitle">Related docs</h2>
            <p className="toolingLead">
              Keep digging with the guides teams use most.
            </p>
          </header>

          <div className="toolingCards">
            {content.relatedLinks.map((link) => (
              <article className="toolingCard" key={link.href}>
                <div className="toolingCardBody">
                  <h3 className="toolingCardTitle">{link.label}</h3>
                  <Link
                    className="btn btnGhost toolingCardCta"
                    href={link.href}
                  >
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
