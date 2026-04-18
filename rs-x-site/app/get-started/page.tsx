import Link from 'next/link';

import { Card } from '../docs/components/card';

import { GetStartedTracksTabs } from './get-started-tracks-tabs.client';

export const metadata = {
  title: 'Get started',
  description:
    'Choose your framework and follow step-by-step rs-x integration instructions.',
  alternates: {
    canonical: '/get-started',
  },
};

export default function GetStartedPage() {
  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container docsPage">
          <div className="getStartedHero">
            <div className="getStartedHeroTitleRow">
              <div>
                <h1 className="sectionTitle">Get started</h1>
              </div>
            </div>
            <p className="sectionLead">
              Start from the track that matches your stack: React, Angular, Vue,
              Next.js, or Node.js.
            </p>
          </div>

          <section className="getStartedLinear">
            <GetStartedTracksTabs />

            <Card header="Next steps">
              <ul className="advancedTopicList">
                <li>
                  <Link href="/docs">Docs</Link> — browse all guides, framework
                  pages, and API references.
                </li>
                <li>
                  <Link href="/docs/core-concepts/first-expression">
                    Create your first expression
                  </Link>{' '}
                  — step-by-step binding flow and option explanations.
                </li>
              </ul>
            </Card>
          </section>
        </div>
      </section>
    </main>
  );
}
