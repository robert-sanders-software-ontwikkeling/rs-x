import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import { toPlaygroundHref } from '../_template/core-concept-page';

const firstExpressionCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { interval, map, startWith } from 'rxjs';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: interval(2000).pipe(
      map(() => Math.floor(Math.random() * 100)),
      startWith(20),
    ),
  };
  const sum = rsx<number>('a + b')(model);

  const subscription = sum.changed.subscribe(() => {
    console.log('changed:', sum.value);
  });

  subscription.unsubscribe();
  sum.dispose();
`;

const firstExpressionPlaygroundScript = dedent`
  const model = {
    a: 10,
    b: rxjs.interval(2000).pipe(
      rxjs.map(() => Math.floor(Math.random() * 100)),
      rxjs.startWith(20),
    ),
  };
  const sum = rsx('a + b')(model);

  const subscription = sum.changed.subscribe(() => {
    console.log('changed:', sum.value);
  });

  const originalDispose = sum.dispose.bind(sum);
  sum.dispose = () => {
    subscription.unsubscribe();
    originalDispose();
  };

  return sum;
`;

const optionsUsageCode = dedent`
  // Declaration options (compiler/AOT hints)
  const bindSum = rsx<number>('a + b', {
    preparse: true,
    lazy: false,
    compiled: true,
  });

  // Runtime binding
  const sum = bindSum(model);
`;

export const metadata: Metadata = {
  title: 'Create your first expression',
  description: 'Guide: declare an expression, bind a model, react to changes.',
};

export default function FirstExpressionPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Create your first expression' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Create your first expression</h1>
          <p className="sectionLead">
            RS-X has been designed to make reactivity simple.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Quick intro</h2>
          <p className="cardText">
            RS-X has been designed to make reactivity simple. You define your
            model, bind an expression to it, and subscribe to the changed event
            to react to changes.
          </p>
          <p className="cardText">
            It is nothing more than that. The expression makes only the model
            parts it uses reactive.
          </p>
          <p className="cardText">
            RS-X handles the complexity for you: async operations and different
            data types are handled by the runtime.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Example</h2>
          <p className="cardText">
            Let&apos;s go through the basic steps with a simple example.
          </p>
          <div className="cardLinks">
            <Link
              className="cardLink"
              href={toPlaygroundHref(firstExpressionPlaygroundScript)}
            >
              Try in playground <span aria-hidden="true">→</span>
            </Link>
          </div>
          <SyntaxCodeBlock code={firstExpressionCode} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">What this code does</h2>
          <ul className="advancedTopicList">
            <li>
              Declare the expression:
              <span className="codeInline"> rsx(&apos;a + b&apos;) </span>
            </li>
            <li>
              Bind it to the model:
              <span className="codeInline"> (model) </span>
            </li>
            <li>
              Subscribe to changes:
              <span className="codeInline"> sum.changed.subscribe(...) </span>
            </li>
            <li>
              Observable source emits new values every 2s:
              <span className="codeInline"> interval(...).pipe(...) </span>
            </li>
            <li>
              Read the new expression value in the callback:
              <span className="codeInline"> sum.value </span>
            </li>
            <li>
              Cleanup when done:
              <span className="codeInline">
                {' '}
                subscription.unsubscribe(); sum.dispose();{' '}
              </span>
            </li>
          </ul>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">When to use options</h2>
          <p className="cardText">
            In most cases you keep using:
            <span className="codeInline"> rsx(&apos;a + b&apos;)(model) </span>.
            Add options only when you need build-time optimization behavior.
          </p>
          <div className="tableWrap">
            <table className="docsTable">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Use it when</th>
                  <th>Where it is used</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Link href="/docs/index-watch-rule">
                      <span className="codeInline">leafIndexWatchRule</span>
                    </Link>
                  </td>
                  <td>
                    You need to control which property changes on the
                    expression&apos;s resolved value trigger re-evaluation
                  </td>
                  <td>
                    <span className="codeInline">
                      rsx(&apos;expr&apos;)(model, watchRule)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="codeInline">preparse</span>
                  </td>
                  <td>
                    Parse this expression at compile time so runtime parser work
                    is skipped
                  </td>
                  <td>
                    Second argument of the declaration call:{' '}
                    <span className="codeInline">
                      rsx(expression, {`{ preparse }`})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="codeInline">lazy</span>
                  </td>
                  <td>
                    Load this expression cache entry only when it is first used
                  </td>
                  <td>
                    Second argument of the declaration call:{' '}
                    <span className="codeInline">
                      rsx(expression, {`{ lazy }`})
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span className="codeInline">compiled</span>
                  </td>
                  <td>
                    Enable/disable compiled-plan generation for this expression
                    site (default true)
                  </td>
                  <td>
                    Second argument of the declaration call:{' '}
                    <span className="codeInline">
                      rsx(expression, {`{ compiled }`})
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="cardText">How to use them in code:</p>
          <SyntaxCodeBlock code={optionsUsageCode} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Where to go next</h2>
          <ul className="advancedTopicList">
            <li>
              <Link href="/docs/rsx-function">rsx function API</Link>
            </li>
            <li>
              <Link href="/docs/irsx-options">IRsxOptions</Link>
            </li>
            <li>
              <Link href="/docs/core-concepts/cli">CLI guide</Link>
            </li>
            <li>
              <Link href="/docs/index-watch-rule">Index watch rule</Link>
            </li>
            <li>
              <Link href="/docs/iexpression">IExpression</Link>
            </li>
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
