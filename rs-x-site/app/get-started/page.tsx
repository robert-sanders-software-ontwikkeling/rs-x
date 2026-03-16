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

const tsConfigCode = dedent`
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "skipLibCheck": true
    }
  }
`;

const bootstrapCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { RsXExpressionParserModule } from '@rs-x/expression-parser';

  // App startup: load once
  await InjectionContainer.load(RsXExpressionParserModule);
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

const nestedExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    price: 100,
    quantity: 3,
    discount: 10,
  };

  // Expression references three model fields.
  const total = rsx<number>('price * quantity - discount')(model);

  total.changed.subscribe(() => {
    console.log('total:', total.value);
  });

  console.log('initial:', total.value); // 290

  model.price = 150;    // → emits 440
  model.quantity = 2;   // → emits 290

  // Clean up when the expression is no longer needed.
  total.dispose();
`;

const nestedPlaygroundScript = dedent`
  const rsx = api.rsx;

  const model = {
    price: 100,
    quantity: 3,
    discount: 10,
  };

  const total = rsx('price * quantity - discount')(model);

  total.changed.subscribe(() => {
    console.log('total:', total.value);
  });

  console.log('initial:', total.value); // 290

  model.price = 150;
  model.quantity = 2;

  return total;
`;

const lifecycleCode = dedent`
  // 1. Create — parse the expression and bind it to the model.
  //    expression.value is available immediately.
  const expression = rsx<number>('a * b')(model);

  // 2. Observe — subscribe to the changed stream.
  //    Fires synchronously for plain-property mutations,
  //    asynchronously for Promises and Observables.
  const subscription = expression.changed.subscribe(() => {
    console.log(expression.value);
  });

  // 3. Clean up — call dispose() to release all watchers.
  //    Always dispose expressions you no longer need to
  //    prevent memory leaks.
  expression.dispose();
`;

const tryInPlaygroundHref = `/playground?data=${encodeURIComponent(
  `plain:${encodeURIComponent(playgroundExampleScript)}`,
)}`;

const tryNestedInPlaygroundHref = `/playground?data=${encodeURIComponent(
  `plain:${encodeURIComponent(nestedPlaygroundScript)}`,
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
            {/* ── what is rs-x ── */}
            <article className="card docsApiCard">
              <h2 className="cardTitle">What is rs-x?</h2>
              <p className="cardText">
                rs-x is a reactive expression library for TypeScript. You write
                a plain string expression — such as{' '}
                <span className="codeInline">
                  &apos;price * quantity - discount&apos;
                </span>{' '}
                — bind it to a model object, and get back an{' '}
                <span className="codeInline">IExpression&lt;T&gt;</span> that
                always holds the current computed value. Whenever any tracked
                dependency on the model changes, the expression re-evaluates and
                fires a <span className="codeInline">changed</span> event.
              </p>
              <p className="cardText">
                Dependencies are tracked automatically — you do not declare them
                up front. rs-x wraps values in observer proxies and detects
                mutations as they happen, whether those mutations come from a
                direct property assignment, an array push, a resolved Promise,
                or an RxJS Observable emission.
              </p>
              <p className="cardText">
                Expressions are composable: an expression value can itself be a
                model field, a collection item, a function return value, or
                another expression. The whole dependency graph updates
                incrementally — only the nodes affected by a mutation are
                re-evaluated.
              </p>
            </article>

            {/* ── quick flow ── */}
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
                <li>
                  <span className="codeInline">Clean up</span>: call{' '}
                  <span className="codeInline">expression.dispose()</span> when
                  the expression is no longer needed.
                </li>
              </ol>
            </article>

            {/* ── packages ── */}
            <article className="card docsApiCard">
              <h2 className="cardTitle">What each package provides</h2>
              <p className="cardText">
                rs-x is split into three focused packages so you can take only
                what you need:
              </p>
              <ul className="advancedTopicList">
                <li>
                  <strong>@rs-x/core</strong> — foundational contracts, the
                  Inversify-based{' '}
                  <span className="codeInline">InjectionContainer</span>,
                  utility types, and helpers such as{' '}
                  <span className="codeInline">WaitForEvent</span> and{' '}
                  <span className="codeInline">printValue</span>. Every other
                  rs-x package depends on core.
                </li>
                <li>
                  <strong>@rs-x/state-manager</strong> — tracks mutations on
                  plain objects, arrays, Maps, Sets, Dates, Promises, and
                  Observables by wrapping values in transparent observer
                  proxies. The <span className="codeInline">StateManager</span>{' '}
                  service stores the current value for each watched{' '}
                  <span className="codeInline">(context, index)</span> pair and
                  emits <span className="codeInline">IStateChange</span> events.
                  Used internally by the expression parser.
                </li>
                <li>
                  <strong>@rs-x/expression-parser</strong> — parses expression
                  strings into an AST, resolves identifiers against the model
                  via StateManager, and produces live{' '}
                  <span className="codeInline">IExpression&lt;T&gt;</span>{' '}
                  instances. The entrypoint is{' '}
                  <span className="codeInline">rsx()</span>; the module is{' '}
                  <span className="codeInline">RsXExpressionParserModule</span>.
                </li>
                <li>
                  <strong>rxjs</strong> — peer dependency. Observable values in
                  expressions are resolved using RxJS{' '}
                  <span className="codeInline">Observable</span>. The{' '}
                  <span className="codeInline">changed</span> stream on every
                  expression is also an RxJS{' '}
                  <span className="codeInline">Observable</span>.
                </li>
              </ul>
            </article>

            {/* ── install + tsconfig ── */}
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

              <div>
                <article className="qsCodeCard docsApiCode">
                  <div className="qsCodeHeader">
                    <div className="qsCodeTitle">Bootstrap once (startup)</div>
                    <div className="qsCodeSubtitle">
                      Run once before creating expressions
                    </div>
                  </div>
                  <SyntaxCodeBlock code={bootstrapCode} />
                </article>

                <article
                  className="qsCodeCard docsApiCode"
                  style={{ marginTop: '1rem' }}
                >
                  <div className="qsCodeHeader">
                    <div className="qsCodeTitle">
                      tsconfig.json (recommended)
                    </div>
                    <div className="qsCodeSubtitle">
                      ES2022 + NodeNext module resolution
                    </div>
                  </div>
                  <SyntaxCodeBlock code={tsConfigCode} />
                </article>
              </div>
            </div>

            {/* ── expression lifecycle ── */}
            <article className="card docsApiCard">
              <h2 className="cardTitle">Expression lifecycle</h2>
              <p className="cardText">
                Every expression goes through three phases:
              </p>
              <ul className="advancedTopicList">
                <li>
                  <strong>Create</strong> —{' '}
                  <span className="codeInline">
                    rsx&lt;T&gt;(&apos;expr&apos;)(model)
                  </span>{' '}
                  parses the expression string, resolves each identifier against
                  the model, registers watchers with StateManager, and returns
                  an <span className="codeInline">IExpression&lt;T&gt;</span>.
                  The <span className="codeInline">value</span> property is
                  populated immediately — no need to wait for a change event.
                </li>
                <li>
                  <strong>Observe</strong> — subscribe to{' '}
                  <span className="codeInline">expression.changed</span> (an
                  RxJS <span className="codeInline">Observable</span>) to react
                  to re-evaluations. The callback fires synchronously for plain
                  property mutations and asynchronously for Promises and
                  Observables. Always read the latest value from{' '}
                  <span className="codeInline">expression.value</span> inside
                  the handler — the change event itself does not carry the new
                  value.
                </li>
                <li>
                  <strong>Clean up</strong> — call{' '}
                  <span className="codeInline">expression.dispose()</span> when
                  the expression is no longer needed. This releases all
                  StateManager watchers and RxJS subscriptions. Forgetting to
                  dispose is the most common source of memory leaks.
                </li>
              </ul>
              <SyntaxCodeBlock code={lifecycleCode} />
            </article>

            {/* ── first working example ── */}
            <aside
              className="qsCodeCard docsApiCode"
              aria-label="First working example"
            >
              <div className="qsCodeHeader">
                <div className="qsCodeTitle">
                  Example — Observable + sync mutation
                </div>
                <div className="qsCodeSubtitle">
                  Both change sources update the same expression
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

            {/* ── second example: multi-field formula ── */}
            <aside
              className="qsCodeCard docsApiCode"
              aria-label="Multi-field formula example"
            >
              <div className="qsCodeHeader">
                <div className="qsCodeTitle">Example — multi-field formula</div>
                <div className="qsCodeSubtitle">
                  Three dependencies, dispose when done
                </div>
              </div>
              <SyntaxCodeBlock code={nestedExampleCode} />
              <div className="qsCodeFooter">
                <Link
                  className="btn btnGhost qsFooterBtn"
                  href={tryNestedInPlaygroundHref}
                >
                  Try in Playground <span aria-hidden="true">→</span>
                </Link>
              </div>
            </aside>

            {/* ── next steps ── */}
            <article className="card docsApiCard">
              <h2 className="cardTitle">Next steps</h2>
              <p className="cardText">
                Once the basics are working, explore the full feature set:
              </p>
              <ul className="advancedTopicList">
                <li>
                  <Link href="/docs/core-concepts/expression-types">
                    Expression types
                  </Link>{' '}
                  — full list of supported syntax: arithmetic, comparisons,
                  ternary, member access, function calls, and more.
                </li>
                <li>
                  <Link href="/docs/core-concepts/member-expressions">
                    Member expressions
                  </Link>{' '}
                  — nested property access (
                  <span className="codeInline">cart.items[0].qty</span>) and how
                  rs-x tracks each step in the chain.
                </li>
                <li>
                  <Link href="/docs/core-concepts/async-operations">
                    Async operations
                  </Link>{' '}
                  — how Promises and Observables participate in the reactive
                  graph and what the resolved value looks like before and after
                  settlement.
                </li>
                <li>
                  <Link href="/docs/core-concepts/collections">
                    Collections
                  </Link>{' '}
                  — reactive arrays, Maps, and Sets — mutation methods like{' '}
                  <span className="codeInline">push</span>,{' '}
                  <span className="codeInline">set</span>, and{' '}
                  <span className="codeInline">delete</span> all trigger
                  updates.
                </li>
                <li>
                  <Link href="/docs/core-concepts/readonly-properties">
                    Read-only properties
                  </Link>{' '}
                  — expose derived or computed values as observable model fields
                  using{' '}
                  <span className="codeInline">StateManager.setState</span>.
                </li>
                <li>
                  <Link href="/docs/core-concepts/dependency-injection">
                    Dependency injection
                  </Link>{' '}
                  — how rs-x uses Inversify under the hood and how to load
                  custom modules alongside the default ones.
                </li>
                <li>
                  <Link href="/docs/observation">Observation strategy</Link> — a
                  detailed look at how each built-in value type is observed and
                  when the proxy wrapping happens.
                </li>
              </ul>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
