import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import { HeroGraphic } from '../components/HeroGraphic';
import { SyntaxCodeBlock } from '../components/SyntaxCodeBlock';

export const metadata: Metadata = {
  title: 'rs-x — Fine-grained reactivity for TypeScript & JavaScript',
  description:
    'rs-x brings fine-grained change detection to React, Vue, and Angular, and pairs naturally with RxJS and Node.js. Bind expressions to your model and let updates propagate automatically.',
  keywords: [
    'reactivity',
    'change detection',
    'fine-grained reactivity',
    'react',
    'vue',
    'angular',
    'rxjs',
    'nodejs',
    'spa framework',
    'typescript',
    'javascript',
  ],
  alternates: {
    canonical: '/',
  },
};

const codeExample = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { interval, map } from 'rxjs';

  const model = {
    a: 10,
    // Will emit a changed event every 2 seconds
    b: interval(2000).pipe(
      map(() => 100 * Math.random())
    )
  };

  const expression = rsx('a + b')(model);

  // Will emit a changed event
  model.a = 20;

  expression.changed.subscribe(
    () => console.log(expression.value)
  );
`;

const playgroundExampleScript = dedent`
  const { interval, map } = rxjs;

  const model = {
    a: 10,
    // Will emit a changed event every 2 seconds
    b: interval(2000).pipe(
      map(() => 100 * Math.random())
    )
  };

  const expression = rsx('a + b')(model);

  // Will emit a changed event
  model.a = 20;

  expression.changed.subscribe(
    () => console.log(expression.value)
  );

  return expression;
`;

const tryInPlaygroundHref = `/playground?data=${encodeURIComponent(
  `plain:${encodeURIComponent(playgroundExampleScript)}`,
)}`;

export default function HomePage() {
  return (
    <main id="content" className="main homePage">
      <section className="hero">
        <div className="container">
          <div className="heroGrid">
            <div className="heroLeft">
              <h1 className="hTitle">rs-x</h1>

              <div className="hSubhead">Reactively Simple</div>
              <div className="hSubhead">TypeScript Reactive Engine</div>

              <p className="hSub">
                Strongly typed, declarative reactivity for runtime-bound
                expressions. Bind an expression to a model, and RS-X
                automatically tracks fine-grained dependencies.
              </p>
              <p className="hSub">
                Works with modern SPA frameworks: React, Vue, and Angular. Pairs
                naturally with RxJS for streams and reactive state. Ideal for
                apps that need fast change detection and predictable reactive
                updates in TypeScript and JavaScript. Also works great in
                Node.js services.
              </p>

              <div className="heroActions">
                <Link className="btn btnPrimary" href="/get-started">
                  Get Started
                </Link>
              </div>
            </div>

            <div className="heroRight" aria-hidden="true">
              <div className="heroGraphicWrap">
                <HeroGraphic />
              </div>
            </div>

            <div className="heroCardsRow">
              <div className="heroCards" aria-label="Key sections">
                <article className="card">
                  <h2 className="cardTitle">How it works</h2>
                  <p className="cardText">
                    Bind an expression to your model. rs-x builds dependencies
                    and re-evaluates on identifier changes.
                  </p>
                  <a className="btn btnGhost cardCta" href="#quickstart">
                    See how it works <span aria-hidden="true">→</span>
                  </a>
                </article>

                <article className="card">
                  <h2 className="cardTitle">Documentation</h2>
                  <p className="cardText">
                    Learn the engine, binding, change propagation, and debugging
                    tools.
                  </p>
                  <Link className="btn btnGhost cardCta" href="/docs">
                    Read the Docs <span aria-hidden="true">→</span>
                  </Link>
                </article>

                <article className="card">
                  <h2 className="cardTitle">Playground</h2>
                  <p className="cardText">
                    Try expressions live and see updates as your model changes,
                    with expression tree visualization.
                  </p>
                  <Link className="btn btnGhost cardCta" href="/playground">
                    Open Playground <span aria-hidden="true">→</span>
                  </Link>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="toolingSection" aria-labelledby="tooling-title">
        <div className="container">
          <div className="toolingShell">
            <header className="toolingHeader">
              <h2 id="tooling-title" className="toolingTitle">
                Built for production
              </h2>
              <p className="toolingLead">
                rs-x expressions are not just runtime strings. The VS Code
                extension gives you IDE support directly in expression strings,
                and the compiler validates and optimizes them at build time.
              </p>
            </header>

            <div className="toolingCards">
              <article className="toolingCard">
                <div className="toolingCardIcon" aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="24"
                      height="24"
                      rx="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M8 10l4 4-4 4M14 18h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="toolingCardBody">
                  <h3 className="toolingCardTitle">
                    Strongly typed in VS Code
                  </h3>
                  <p className="toolingCardText">
                    The rs-x VS Code extension brings full IntelliSense to your
                    expression strings. Identifiers are resolved against your
                    model type, and invalid expressions are underlined in the
                    editor — no runtime surprises.
                  </p>
                  <Link
                    className="btn btnGhost toolingCardCta"
                    href="/docs/core-concepts/cli"
                  >
                    VS Code extension <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>

              <article className="toolingCard">
                <div className="toolingCardIcon" aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 22l4-8 4 4 4-10 4 14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="2"
                      y="2"
                      width="24"
                      height="24"
                      rx="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className="toolingCardBody">
                  <h3 className="toolingCardTitle">
                    Compiler: optimise &amp; validate at build time
                  </h3>
                  <p className="toolingCardText">
                    The rs-x compiler pre-compiles expressions into optimised
                    JavaScript, eliminating parse overhead at runtime. It also
                    catches type errors and invalid identifiers during your
                    build — before they reach users.
                  </p>
                  <Link
                    className="btn btnGhost toolingCardCta"
                    href="/docs/core-concepts/compiler"
                  >
                    Learn about the compiler <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="frameworksSection" aria-labelledby="frameworks-title">
        <div className="container">
          <header className="toolingHeader">
            <h2 id="frameworks-title" className="toolingTitle">
              Framework-ready reactivity
            </h2>
            <p className="toolingLead">
              rs-x delivers fine-grained change detection across React, Vue, and
              Angular, while pairing naturally with RxJS and Node.js — ideal for
              SPA frameworks and backend services that need precise, type-safe
              updates.
            </p>
          </header>

          <div className="toolingCards">
            <article className="toolingCard">
              <div className="toolingCardBody">
                <h3 className="toolingCardTitle">React</h3>
                <p className="toolingCardText">
                  Use RS-X hooks to bind expressions directly in React
                  components with minimal boilerplate.
                </p>
                <Link
                  className="btn btnGhost toolingCardCta"
                  href="/docs/frameworks/react"
                >
                  React integration <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className="toolingCard">
              <div className="toolingCardBody">
                <h3 className="toolingCardTitle">Vue</h3>
                <p className="toolingCardText">
                  Leverage the @rs-x/vue composable for reactive expressions and
                  clean change detection in Vue apps.
                </p>
                <Link
                  className="btn btnGhost toolingCardCta"
                  href="/docs/frameworks/vue"
                >
                  Vue integration <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className="toolingCard">
              <div className="toolingCardBody">
                <h3 className="toolingCardTitle">Angular</h3>
                <p className="toolingCardText">
                  Bind expressions with the rsx pipe and keep Angular templates
                  reactive and predictable.
                </p>
                <Link
                  className="btn btnGhost toolingCardCta"
                  href="/docs/frameworks/angular"
                >
                  Angular integration <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className="toolingCard">
              <div className="toolingCardBody">
                <h3 className="toolingCardTitle">RxJS</h3>
                <p className="toolingCardText">
                  Combine rxjs streams with rs-x expressions for reactive data
                  flows and efficient updates.
                </p>
                <Link
                  className="btn btnGhost toolingCardCta"
                  href="/docs/frameworks/rxjs"
                >
                  RxJS integration <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <article className="toolingCard">
              <div className="toolingCardBody">
                <h3 className="toolingCardTitle">Node.js</h3>
                <p className="toolingCardText">
                  Use rs-x in Node.js services for reactive data pipelines,
                  model binding, and predictable change propagation.
                </p>
                <Link
                  className="btn btnGhost toolingCardCta"
                  href="/get-started"
                >
                  Node.js setup <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        id="quickstart"
        className="quickstartSection homeQuickstartSection"
        aria-labelledby="quickstart-title"
      >
        <div className="container">
          <div className="quickstartShell">
            <header className="quickstartHeader">
              <div className="quickstartHeaderText">
                <h2 id="quickstart-title" className="quickstartTitle">
                  How it works
                </h2>

                <p className="quickstartLead">
                  Bind expressions to a model and rs-x builds a fine-grained
                  dependency graph. Only identifiers read by the expression
                  become reactive.
                </p>
              </div>

              <div className="quickstartHeaderActions">
                <Link className="btn btnGhost" href="/docs">
                  Concepts <span aria-hidden="true">→</span>
                </Link>
              </div>
            </header>

            <div className="quickstartGrid">
              <div className="qsSteps" aria-label="Quickstart steps">
                <article className="qsStepCard">
                  <div className="qsStepTop">
                    <span className="qsBadge" aria-hidden="true">
                      1
                    </span>
                    <h3 className="qsStepTitle">Define a model</h3>
                  </div>

                  <p className="qsStepText">
                    Your model is just normal JavaScript.
                  </p>

                  <div className="qsInlineRow">
                    <span className="qsChip">model</span>
                    <code className="qsInlineCode">{`{ price: 100, quantity: 2 }`}</code>
                  </div>
                </article>

                <article className="qsStepCard">
                  <div className="qsStepTop">
                    <span className="qsBadge" aria-hidden="true">
                      2
                    </span>
                    <h3 className="qsStepTitle">Bind an expression</h3>
                  </div>

                  <p className="qsStepText">
                    Expressions are declarative strings. Binding registers
                    dependencies for what the expression reads.
                  </p>

                  <div className="qsInlineRow">
                    <span className="qsChip">bind</span>
                    <code className="qsInlineCode">{`rsx('price * quantity')(model)`}</code>
                  </div>
                </article>

                <article className="qsStepCard">
                  <div className="qsStepTop">
                    <span className="qsBadge" aria-hidden="true">
                      3
                    </span>
                    <h3 className="qsStepTitle">React to changes</h3>
                  </div>

                  <p className="qsStepText">
                    When the model changes, the expression updates and emits
                    changes.
                  </p>

                  <div className="qsInlineRow">
                    <span className="qsChip">listen</span>
                    <code className="qsInlineCode">{`expression.changed.subscribe(() => { /* … */ })`}</code>
                  </div>
                </article>

                <div className="qsNote" role="note">
                  <strong>Key idea:</strong> model change → expression change.
                  Minimal ceremony, predictable updates.
                </div>
              </div>

              <aside className="qsCodeCard" aria-label="Quickstart example">
                <div className="qsCodeHeader">
                  <div className="qsCodeTitle">Example</div>
                  <div className="qsCodeSubtitle">
                    Declarative expression binding
                  </div>
                </div>

                <SyntaxCodeBlock code={codeExample} />

                <div className="qsCodeFooter">
                  <Link
                    className="btn btnGhost qsFooterBtn"
                    href={tryInPlaygroundHref}
                  >
                    Try in Playground <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
