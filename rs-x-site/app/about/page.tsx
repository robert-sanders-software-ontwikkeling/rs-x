import Image from 'next/image';
import Link from 'next/link';

import meImage from '../../assets/me.jpg';

const githubSponsorsUrl =
  'https://github.com/sponsors/robert-sanders-software-ontwikkeling';

export const metadata = {
  title: 'About me',
  description:
    'About the maintainer of rs-x: engineering focus, values, and how to support community-first development.',
};

export default function AboutPage() {
  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container docsPage">
          <div className="getStartedHero">
            <div className="getStartedHeroTitleRow">
              <div>
                <p className="docsApiEyebrow">About</p>
                <h1 className="sectionTitle">About me</h1>
              </div>
              <div className="docsApiActions getStartedHeroActions">
                <Link className="btn btnGhost" href="/sponsor">
                  Sponsor page <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btnGhost" href="/roadmap">
                  Roadmap <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <p className="sectionLead">
              I am a passionate software engineer with strong experience in both
              backend and frontend development. I focus on making complex
              problems understandable and practical.
            </p>
          </div>

          <section className="aboutGrid">
            <article className="card docsApiCard aboutImageCard">
              <Image
                className="aboutImage"
                src={meImage}
                alt="Robert Sanders"
                priority
              />
            </article>

            <article className="card docsApiCard aboutStoryCard">
              <h2 className="cardTitle">What I build</h2>
              <p className="cardText">
                I like translating real product challenges into generic,
                reusable solutions. If you need support with framework
                architecture, reusable components, or shared libraries, I can
                help.
              </p>
              <p className="cardText">
                The thing I care most about is building beautiful software that
                adds value and makes people&apos;s lives easier. Then I am
                happy.
              </p>
              <p className="cardText">
                I am also very effective at using AI in day-to-day engineering.
                By asking the right questions and guiding tools with clear
                intent, I can work faster, improve quality, and expand what I
                can deliver. I see this as part of the modern software engineer
                role: an AI conductor who combines strong technical judgment
                with assisted execution.
              </p>
              <p className="cardText">
                I can only fulfill my dream of building beautiful software for
                the community with your support. Every contribution, even a
                small one, is appreciated and helps me continue this work.
              </p>

              <div className="aboutContactLinks">
                <a
                  className="cardLink aboutContactLink"
                  href={githubSponsorsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub Sponsors <span aria-hidden="true">→</span>
                </a>
                <a
                  className="cardLink aboutContactLink"
                  href="mailto:robert.sanders.software@gmail.com"
                >
                  Email <span aria-hidden="true">→</span>
                </a>
                <a
                  className="cardLink aboutContactLink"
                  href="https://www.linkedin.com/in/robert-sanders-352a8726/"
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
