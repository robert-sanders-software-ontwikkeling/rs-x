import dedent from 'dedent';
import Link from 'next/link';

import { SyntaxCodeBlock } from '../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'Get started',
  description:
    'Install rs-x and build your first reactive expression in minutes.',
};

const installCommandCode = dedent`
  # npm
  npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser rxjs

  # pnpm
  pnpm add @rs-x/core @rs-x/state-manager @rs-x/expression-parser rxjs

  # yarn
  yarn add @rs-x/core @rs-x/state-manager @rs-x/expression-parser rxjs

  # bun
  bun add @rs-x/core @rs-x/state-manager @rs-x/expression-parser rxjs
`;

const packageJsonCode = dedent`
  {
    "name": "my-rsx-app",
    "private": true,
    "type": "module",
    "dependencies": {
      "@rs-x/core": "latest",
      "@rs-x/state-manager": "latest",
      "@rs-x/expression-parser": "latest",
      "rxjs": "^7.8.2"
    }
  }
`;

const firstWorkingExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { interval, map } from 'rxjs';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    // Change trigger #1: async source (Observable).
    b: interval(2000).pipe(map(() => Math.round(Math.random() * 100)))
  };

  const expression = rsx<number>('a + b')(model);

  expression.changed.subscribe(() => {
    // Runs whenever a tracked dependency changes.
    console.log('value:', expression.value);
  });

  // Change trigger #2: direct sync mutation.
  model.a = 20;
`;

const playgroundExampleScript = dedent`
  const rsx = api.rsx;
  const { interval, map } = api.rxjs;

  const model = {
    a: 10,
    // Change trigger #1: async source (Observable).
    b: interval(2000).pipe(map(() => Math.round(Math.random() * 100)))
  };

  const expression = rsx('a + b')(model);

  expression.changed.subscribe(() => {
    // Runs whenever a tracked dependency changes.
    console.log('value:', expression.value);
  });

  // Change trigger #2: direct sync mutation.
  model.a = 20;

  return expression;
`;

const bootstrapCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { RsXExpressionParserModule } from '@rs-x/expression-parser';

  // App startup: load once
  await InjectionContainer.load(RsXExpressionParserModule);
`;

const tryInPlaygroundHref = `/playground?data=${encodeURIComponent(
  `plain:${encodeURIComponent(playgroundExampleScript)}`,
)}`;

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
              <div className="docsApiActions getStartedHeroActions">
                <Link className="btn btnGhost" href="/docs">
                  Docs <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btnPrimary" href="/playground">
                  Open Playground <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <p className="sectionLead">
              Install dependencies, load{' '}
              <span className="codeInline">RsXExpressionParserModule</span> once
              during startup, then bind with{' '}
              <span className="codeInline">rsx(&apos;...&apos;)(model)</span>{' '}
              and subscribe to <span className="codeInline">changed</span>.
            </p>
          </div>

          <section className="getStartedLinear">
            <article className="card docsApiCard">
              <h2 className="cardTitle">Quick flow</h2>
              <ol className="getStartedFlowList">
                <li>
                  <span className="codeInline">Install</span>: add{' '}
                  <span className="codeInline">@rs-x/core</span>,{' '}
                  <span className="codeInline">@rs-x/state-manager</span>,{' '}
                  <span className="codeInline">@rs-x/expression-parser</span>,
                  and <span className="codeInline">rxjs</span>.
                </li>
                <li>
                  <span className="codeInline">Bootstrap once</span>: load{' '}
                  <span className="codeInline">RsXExpressionParserModule</span>{' '}
                  into <span className="codeInline">InjectionContainer</span> at
                  app startup.
                </li>
                <li>
                  <span className="codeInline">Bind + observe</span>: create
                  with <span className="codeInline">rsx(...)(model)</span>, read{' '}
                  <span className="codeInline">value</span>, subscribe to{' '}
                  <span className="codeInline">changed</span>.
                </li>
              </ol>
            </article>

            <div className="getStartedSplit">
              <article className="qsCodeCard docsApiCode">
                <div className="qsCodeHeader">
                  <div className="qsCodeTitle">Install commands</div>
                  <div className="qsCodeSubtitle">npm / pnpm / yarn / bun</div>
                </div>
                <SyntaxCodeBlock code={installCommandCode} />
                <div className="qsCodeHeader">
                  <div className="qsCodeTitle">package.json (example)</div>
                </div>
                <SyntaxCodeBlock code={packageJsonCode} />
              </article>

              <article className="qsCodeCard docsApiCode">
                <div className="qsCodeHeader">
                  <div className="qsCodeTitle">Bootstrap once (startup)</div>
                  <div className="qsCodeSubtitle">
                    Run once before creating expressions
                  </div>
                </div>
                <SyntaxCodeBlock code={bootstrapCode} />
              </article>
            </div>

            <aside
              className="qsCodeCard docsApiCode"
              aria-label="First working example"
            >
              <div className="qsCodeHeader">
                <div className="qsCodeTitle">First working example</div>
                <div className="qsCodeSubtitle">
                  Observable + sync mutation in one expression
                </div>
              </div>
              <SyntaxCodeBlock code={firstWorkingExampleCode} />
              <div className="qsCodeFooter">
                <Link
                  className="btn btnGhost qsFooterBtn"
                  href={tryInPlaygroundHref}
                >
                  Try in Playground <span aria-hidden="true">→</span>
                </Link>
                <Link className="qsTinyLink" href="/docs/rsx-function">
                  rsx function docs
                </Link>
              </div>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}
