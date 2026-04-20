import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata: Metadata = {
  title: 'watchIndexRecursiveRule',
  description:
    'Pre-built IIndexWatchRule that enables full recursive observation of any identifier value.',
};

const implementationCode = dedent`
  // @rs-x/state-manager
  export const watchIndexRecursiveRule: IIndexWatchRule = {
    id: 'b95cf4e7-b6d3-475e-af41-fb78d0d58baa',
    context: undefined,
    dispose: emptyFunction,
    test: truePredicate, // always returns true
  };
`;

const rsxUsageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { watchIndexRecursiveRule } from '@rs-x/state-manager';

  const model = {
    config: {
      theme: { color: 'blue', size: 'medium' },
    },
  };

  // Without the rule: only reference replacement fires.
  const withoutRule = rsx('config.theme')(model);
  withoutRule.changed.subscribe(() => console.log('changed'));

  model.config.theme.color = 'red'; // does NOT fire — sub-property mutation ignored
  model.config.theme = { color: 'green', size: 'large' }; // fires — reference replaced

  // With the rule: sub-property mutations also fire.
  const withRule = rsx('config.theme')(model, watchIndexRecursiveRule);
  withRule.changed.subscribe(() => console.log('changed'));

  model.config.theme.color = 'red'; // fires — recursive observer on color
  model.config.theme.size = 'large'; // fires — recursive observer on size
  model.config.theme = { color: 'green', size: 'large' }; // fires — reference replaced
`;

const stateManagerUsageCode = dedent`
  import { watchIndexRecursiveRule } from '@rs-x/state-manager';
  import type { IStateManager } from '@rs-x/state-manager';

  // Also accepted directly by stateManager.watchState:
  stateManager.watchState(model, 'config', {
    indexWatchRule: watchIndexRecursiveRule,
  });
`;

const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

const playgroundScript = dedent`
  const model = {
    config: {
      theme: { color: 'blue', size: 'medium' },
    },
  };

  // --- Without the rule: only reference replacement fires ---
  const expressionNoRule = rsx('config.theme')(model);
  await new WaitForEvent(expressionNoRule, 'changed').wait(() => {});

  const colorNoRule = await new WaitForEvent(expressionNoRule, 'changed', {
    ignoreInitialValue: true,
    timeout: 50,
  }).wait(() => {
    model.config.theme.color = 'red';
  });
  console.log('(no rule) mutating theme.color emitted change:', colorNoRule !== null);

  const refNoRule = await new WaitForEvent(expressionNoRule, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.config.theme = { color: 'green', size: 'large' };
  });
  console.log('(no rule) replacing config.theme emitted change:', refNoRule !== null);
  expressionNoRule.dispose();

  // Reset model for the second part.
  model.config.theme = { color: 'blue', size: 'medium' };

  // --- With the rule: sub-property mutations also fire ---
  const expression = rsx('config.theme')(model, watchIndexRecursiveRule);
  await new WaitForEvent(expression, 'changed').wait(() => {});

  const colorMutated = await new WaitForEvent(expression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.config.theme.color = 'red';
  });
  console.log('(with rule) mutating theme.color emitted change:', colorMutated !== null);

  const sizeMutated = await new WaitForEvent(expression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.config.theme.size = 'small';
  });
  console.log('(with rule) mutating theme.size emitted change:', sizeMutated !== null);

  const themeReplaced = await new WaitForEvent(expression, 'changed', {
    ignoreInitialValue: true,
  }).wait(() => {
    model.config.theme = { color: 'green', size: 'large' };
  });
  console.log('(with rule) replacing config.theme emitted change:', themeReplaced !== null);

  return expression;
`;

export default function WatchIndexRecursiveRulePage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/state-manager' },
              { label: 'watchIndexRecursiveRule' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">watchIndexRecursiveRule</h1>
          <p className="sectionLead">
            A pre-built{' '}
            <Link href="/docs/index-watch-rule">
              <span className="codeInline">IIndexWatchRule</span>
            </Link>{' '}
            whose <span className="codeInline">test()</span> always returns{' '}
            <span className="codeInline">true</span>. Pass it to{' '}
            <span className="codeInline">
              rsx(&apos;expr&apos;)(model, watchIndexRecursiveRule)
            </span>{' '}
            to make any mutation inside the identifier&apos;s value fire
            reevaluation, not just direct reference replacement.
          </p>
        </div>
        <div className="docsApiActions">
          <Link className="btn btnGhost" href="/docs/index-watch-rule">
            IIndexWatchRule <span aria-hidden="true">→</span>
          </Link>
          <Link
            className="btn btnGhost"
            href="/docs/core-concepts/leaf-identifier"
          >
            Leaf identifier watching <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What it does</h2>
          <p className="cardText">
            By default, rs-x watches only the leaf identifier for direct value
            replacement. For values that are not automatically proxied (plain
            objects), mutations inside the value do not fire reevaluation.
          </p>
          <p className="cardText">
            <span className="codeInline">watchIndexRecursiveRule</span> extends
            observation to all sub-properties of the identifier&apos;s value.
            Because <span className="codeInline">test()</span> always returns{' '}
            <span className="codeInline">true</span>, rs-x installs observers
            for every nested property, recursively.
          </p>
          <p className="cardText">
            Note that <span className="codeInline">Array</span>,{' '}
            <span className="codeInline">Map</span>,{' '}
            <span className="codeInline">Set</span>, and{' '}
            <span className="codeInline">Date</span> values are already proxied
            automatically — this rule is most useful when the identifier&apos;s
            value is a plain object.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Import</h2>
          <SyntaxCodeBlock
            code={`import { watchIndexRecursiveRule } from '@rs-x/state-manager';`}
          />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Implementation</h2>
          <p className="cardText">
            It is a singleton constant — a plain object implementing{' '}
            <Link href="/docs/index-watch-rule">
              <span className="codeInline">IIndexWatchRule</span>
            </Link>{' '}
            with <span className="codeInline">test</span> set to{' '}
            <span className="codeInline">truePredicate</span>.
          </p>
          <SyntaxCodeBlock code={implementationCode} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage with rsx</h2>
          <div className="cardLinks">
            <Link
              className="cardLink"
              href={toPlaygroundHref(playgroundScript)}
            >
              Try in playground <span aria-hidden="true">→</span>
            </Link>
          </div>
          <SyntaxCodeBlock code={rsxUsageCode} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage with stateManager</h2>
          <SyntaxCodeBlock code={stateManagerUsageCode} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">When to use</h2>
          <ul className="advancedTopicList">
            <li>
              The leaf identifier returns a plain object and you want any
              mutation anywhere inside it to fire reevaluation.
            </li>
            <li>
              You are prototyping and want the broadest possible observation
              without writing a custom rule.
            </li>
          </ul>
          <h2 className="cardTitle" style={{ marginTop: '1.5rem' }}>
            When not to use
          </h2>
          <ul className="advancedTopicList">
            <li>
              The identifier&apos;s value is an{' '}
              <span className="codeInline">Array</span>,{' '}
              <span className="codeInline">Map</span>,{' '}
              <span className="codeInline">Set</span>, or{' '}
              <span className="codeInline">Date</span> — these are already
              proxied automatically.
            </li>
            <li>
              You only want to react to specific sub-property changes — write a
              custom{' '}
              <Link href="/docs/index-watch-rule">
                <span className="codeInline">IIndexWatchRule</span>
              </Link>{' '}
              whose <span className="codeInline">test()</span> returns{' '}
              <span className="codeInline">true</span> only for the properties
              you care about.
            </li>
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
