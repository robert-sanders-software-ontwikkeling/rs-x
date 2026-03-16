import Link from 'next/link';

const githubSponsorsUrl =
  'https://github.com/sponsors/robert-sanders-software-ontwikkeling';

export const metadata = {
  title: 'Sponsor',
  description:
    'Support rs-x maintenance through GitHub Sponsors and help fund ongoing development, docs, and support.',
};

export default function SponsorPage() {
  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container docsPage">
          <div className="getStartedHero">
            <div className="getStartedHeroTitleRow">
              <div>
                <p className="docsApiEyebrow">Support</p>
                <h1 className="sectionTitle">Sponsor rs-x</h1>
              </div>
              <div className="docsApiActions getStartedHeroActions">
                <Link className="btn btnGhost" href="/docs">
                  Read the Docs <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btnGhost" href="/roadmap">
                  Roadmap <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <p className="sectionLead">
              Help keep <span className="codeInline">rs-x</span> maintained,
              documented, and improving. Sponsorship directly supports
              development time, issue triage, and long-term package stability.
            </p>
          </div>

          <section className="getStartedLinear">
            <article className="card docsApiCard">
              <h2 className="cardTitle">Why sponsor</h2>
              <ul className="getStartedFlowList">
                <li>
                  Fund continued work on core runtime features and reliability.
                </li>
                <li>Support faster fixes, releases, and dependency updates.</li>
                <li>Keep docs and examples up to date across the ecosystem.</li>
              </ul>
            </article>

            <article className="card docsApiCard">
              <h2 className="cardTitle">How support is used</h2>
              <p className="cardText">
                Sponsorship is focused on practical project maintenance: feature
                implementation, production bug fixes, API and docs quality,
                CI/build upkeep, and release management.
              </p>
              <p className="cardText">
                If your team relies on rs-x in production, sponsoring is the
                most direct way to help sustain predictable maintenance and
                ongoing improvements.
              </p>
              <p className="cardText">
                Roadmap visibility is public. See current status and upcoming
                work in the <Link href="/roadmap"> roadmap page</Link>.
              </p>
            </article>

            <article
              className="card docsApiCard"
              aria-label="Sponsor call to action"
            >
              <h2 className="cardTitle">Sponsor via GitHub</h2>
              <p className="cardText">
                Choose one-time or recurring support on GitHub Sponsors. You can
                update or cancel at any time.
              </p>
              <div className="sponsorCtaRow">
                <a
                  className="btn btnPrimary"
                  href={githubSponsorsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open GitHub Sponsors <span aria-hidden="true">→</span>
                </a>
                <Link className="btn btnGhost" href="/get-started">
                  Get started with rs-x <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btnGhost" href="/roadmap">
                  View roadmap <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
