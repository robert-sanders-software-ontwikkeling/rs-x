import dedent from 'dedent';
import Link from 'next/link';

import { HeroGraphic } from '../components/HeroGraphic';
import { SyntaxCodeBlock } from '../components/SyntaxCodeBlock';

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
  const rsx = api.rsx;
  const { interval, map } = api.rxjs;

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
    <main id="content" className="main">
      <section className="hero">
        <div className="container">
          <div className="heroGrid">
            <div className="heroLeft">
              <h1 className="hTitle">rs-x</h1>

              <div className="hSubhead">Reactively Simple</div>
              <div className="hSubhead">TypeScript Reactive Engine</div>

              <p className="hSub">
                Declarative reactivity for runtime-bound expressions. Bind an
                expression to a model and rs-x tracks fine-grained dependencies
                automatically.
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
