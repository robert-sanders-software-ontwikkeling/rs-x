import Link from 'next/link';

import { Card } from '../docs/components/card';

import { GetStartedTracksTabs } from './get-started-tracks-tabs.client';

export const metadata = {
  title: 'Get started',
  description:
    'Choose your framework and follow step-by-step rs-x setup instructions.',
};

export default function GetStartedPage() {
  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container docsPage">
          <div className="getStartedHero">
            <div className="getStartedHeroTitleRow">
              <div>
                <p className="docsApiEyebrow">Guide</p>
                <h1 className="sectionTitle">Get started</h1>
              </div>
            </div>
            <p className="sectionLead">
              Start from the track that matches your stack: React, Angular, Vue,
              Next.js, Node.js, or an existing project.
            </p>
          </div>

          <section className="getStartedLinear">
            <GetStartedTracksTabs />

            <Card header="What you should know first">
              <ul className="advancedTopicList">
                <li>
                  <span className="codeInline">rsx setup</span> auto-detects
                  your framework and applies the right integration flow.
                </li>
                <li>
                  <span className="codeInline">rsx project</span> creates a new
                  starter project from templates:
                  <span className="codeInline">
                    {' '}
                    angular | vuejs | react | nextjs | nodejs
                  </span>
                  .
                </li>
                <li>
                  Always run
                  <span className="codeInline"> rsx typecheck </span>
                  in CI to include rs-x semantic diagnostics.
                </li>
              </ul>
            </Card>

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
