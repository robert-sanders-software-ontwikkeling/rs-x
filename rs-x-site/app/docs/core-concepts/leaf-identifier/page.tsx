import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

// ─── code examples ───────────────────────────────────────────────────────────

const defaultBehaviorCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    user: {
      profile: {
        name: 'Alice',
        role: 'engineer',
      },
    },
  };

  // 'name' is the leaf identifier — the direct read on user.profile.
  // rs-x watches user.profile['name'] for direct assignment.
  // user.profile.name is a member expression. The segments user and user.profile
  // are also watched; replacing either re-attaches the watch and emits a change
  // if name's value changes.
  const expression = rsx<string>('user.profile.name')(model);

  expression.changed.subscribe(() => {
    console.log('value:', expression.value);
  });

  // Fires — 'name' was directly assigned a new value.
  setTimeout(() => {
    console.log('--- changing name ---');
    model.user.profile.name = 'Bob';
  }, 1000);

  // Does NOT fire — 'role' is a different property; the watch is for 'name' only.
  setTimeout(() => {
    console.log('--- changing role (does not fire) ---');
    model.user.profile.role = 'architect';
  }, 2000);

  // Fires — replacing user.profile re-attaches the chain; name changed as a result.
  setTimeout(() => {
    console.log('--- replacing user.profile (fires, name changed) ---');
    model.user.profile = { name: 'Carol', role: 'PM' };
  }, 3000);
`;

const defaultBehaviorPlaygroundScript = dedent`
  const model = {
    user: {
      profile: {
        name: 'Alice',
        role: 'engineer',
      },
    },
  };

  const expression = rsx('user.profile.name')(model);

  expression.changed.subscribe(() => {
    console.log('value:', expression.value);
  });

  setTimeout(() => {
    console.log('--- changing name (fires) ---');
    model.user.profile.name = 'Bob';
  }, 1000);

  setTimeout(() => {
    console.log('--- changing role (silent) ---');
    model.user.profile.role = 'architect';
  }, 2000);

  setTimeout(() => {
    console.log('--- replacing user.profile (fires, name changed) ---');
    model.user.profile = { name: 'Carol', role: 'PM' };
  }, 3000);

  return expression;
`;

const arrayProxyCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    items: [1, 2, 3],
  };

  // 'items' is the leaf identifier. Its value is an Array, so rs-x
  // automatically wraps it in a Proxy — no watch rule required.
  const expression = rsx<number[]>('items')(model);

  expression.changed.subscribe(() => {
    console.log('items:', expression.value);
  });

  // Fires — push mutates the array; the Proxy intercepts this.
  setTimeout(() => {
    console.log('--- push ---');
    (model.items as number[]).push(4);
  }, 1000);

  // Fires — direct index write is also intercepted.
  setTimeout(() => {
    console.log('--- index write ---');
    (model.items as number[])[0] = 99;
  }, 2000);
`;

const arrayProxyPlaygroundScript = dedent`
  const model = {
    items: [1, 2, 3],
  };

  // Array values are automatically proxied — mutations fire without a rule.
  const expression = rsx('items')(model);

  expression.changed.subscribe(() => {
    console.log('items:', JSON.stringify(expression.value));
  });

  setTimeout(() => {
    console.log('--- push ---');
    model.items.push(4);
  }, 1000);

  setTimeout(() => {
    console.log('--- index write ---');
    model.items[0] = 99;
  }, 2000);

  return expression;
`;

const recursiveRuleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { watchIndexRecursiveRule } from '@rs-x/state-manager';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    config: {
      theme: {
        color: 'blue',
        size: 'medium',
      },
    },
  };

  // Without a rule, only replacing config.theme itself fires the expression.
  // watchIndexRecursiveRule widens observation: mutations anywhere inside the
  // identifier's value (config.theme) also fire it.
  const expression = rsx<object>('config.theme')(model, watchIndexRecursiveRule);

  expression.changed.subscribe(() => {
    console.log('theme:', expression.value);
  });

  // Fires — color is a sub-property of the identifier's value (config.theme).
  setTimeout(() => {
    console.log('--- changing theme.color ---');
    model.config.theme.color = 'red';
  }, 1000);

  // Also fires — size is another sub-property.
  setTimeout(() => {
    console.log('--- changing theme.size ---');
    model.config.theme.size = 'large';
  }, 2000);
`;

const recursiveRulePlaygroundScript = dedent`
  const { watchIndexRecursiveRule } = stateManager;

  const model = {
    config: {
      theme: {
        color: 'blue',
        size: 'medium',
      },
    },
  };

  const expression = rsx('config.theme')(model, watchIndexRecursiveRule);

  expression.changed.subscribe(() => {
    console.log('theme:', JSON.stringify(expression.value));
  });

  setTimeout(() => {
    console.log('--- changing theme.color ---');
    model.config.theme.color = 'red';
  }, 1000);

  setTimeout(() => {
    console.log('--- changing theme.size ---');
    model.config.theme.size = 'large';
  }, 2000);

  return expression;
`;

const allowListRuleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    user: {
      profile: {
        name: 'Alice',
        role: 'engineer',
      },
    },
  };

  // Expression returns the whole profile object.
  // Without a rule, only replacing user.profile itself fires.
  // With a custom rule where test() returns true only for 'name',
  // mutations to 'name' inside the value also fire, but 'role' does not.
  const watchRule: IIndexWatchRule = {
    id: 'profile-name-only',
    context: { tracked: new Set(['name']) },
    test(index) {
      return this.context.tracked.has(String(index));
    },
    dispose() {},
  };

  const expression = rsx<object>('user.profile')(model, watchRule);

  expression.changed.subscribe(() => {
    console.log('profile:', expression.value);
  });

  // Fires — test() returned true for 'name', so an observer was installed.
  setTimeout(() => {
    console.log('--- changing name (tracked) ---');
    model.user.profile.name = 'Bob';
  }, 1000);

  // Does NOT fire — test() returned false for 'role', no observer installed.
  setTimeout(() => {
    console.log('--- changing role (not tracked) ---');
    model.user.profile.role = 'architect';
  }, 2000);
`;

const allowListRulePlaygroundScript = dedent`
  const model = {
    user: {
      profile: {
        name: 'Alice',
        role: 'engineer',
      },
    },
  };

  const watchRule = {
    id: 'profile-name-only',
    context: { tracked: new Set(['name']) },
    test(index) {
      return this.context.tracked.has(String(index));
    },
    dispose() {},
  };

  // Returns the whole profile object; rule controls which sub-properties fire.
  const expression = rsx('user.profile')(model, watchRule);

  expression.changed.subscribe(() => {
    console.log('profile:', JSON.stringify(expression.value));
  });

  setTimeout(() => {
    console.log('--- changing name (tracked, fires) ---');
    model.user.profile.name = 'Bob';
  }, 1000);

  setTimeout(() => {
    console.log('--- changing role (not tracked, silent) ---');
    model.user.profile.role = 'architect';
  }, 2000);

  return expression;
`;

// ─── doc ─────────────────────────────────────────────────────────────────────

const doc: CoreConceptDoc = {
  title: 'Leaf identifier watching',
  lead: 'Understand what leaf identifiers are, how rs-x watches their values by default, and how to extend that observation with an IIndexWatchRule.',

  whatItMeans: (
    <>
      <p>
        A <strong>leaf identifier</strong> is the identifier node in an
        expression that directly reads a value. It is the immediate property
        access — the first (and direct) read on whatever context it finds itself
        on. In <code>a + b</code>, both <code>a</code> and <code>b</code> are
        leaf identifiers: each is read directly from the model. In{' '}
        <code>user.profile.name</code>, <code>name</code> is the leaf
        identifier: it is the direct read on <code>user.profile</code>.
      </p>
      <p>
        By default, rs-x watches the leaf identifier for{' '}
        <strong>direct value replacement</strong>. For{' '}
        <code>user.profile.name</code>, the watch is on the{' '}
        <code>&apos;name&apos;</code> key of <code>user.profile</code>; only
        assigning <code>user.profile.name = &apos;Bob&apos;</code> fires
        reevaluation. Changing a different property like{' '}
        <code>user.profile.role</code> does not. <code>user.profile.name</code>{' '}
        is a member expression; the segments <code>user</code> and{' '}
        <code>user.profile</code> are also watched for reference replacement.
        Replacing either re-attaches the watch, and if the resolved value of{' '}
        <code>name</code> has changed as a result, a change event is emitted.
      </p>
      <p>
        When the identifier&apos;s value is an <code>Array</code>,{' '}
        <code>Map</code>, <code>Set</code>, or <code>Date</code>, rs-x{' '}
        <strong>automatically wraps it in a Proxy</strong>. No watch rule is
        needed: mutations like <code>array.push()</code> or{' '}
        <code>map.set()</code> fire the expression the same way a direct
        assignment does.
      </p>
      <p>
        When you need to observe mutations inside the identifier&apos;s value,
        pass an{' '}
        <Link href="/docs/index-watch-rule">
          <code>IIndexWatchRule</code>
        </Link>{' '}
        as the second argument:{' '}
        <code>rsx(&apos;expr&apos;)(model, watchRule)</code>. The rule&apos;s{' '}
        <code>test(index, target)</code> method is called at the leaf level to
        decide which sub-properties of the identifier&apos;s value should be
        observed. Returning <code>true</code> for a sub-property key installs an
        observer for it; returning <code>false</code> leaves it unwatched.
      </p>
    </>
  ),

  whyItMatters: (
    <>
      <p>
        The default behaviour is correct and efficient for the vast majority of
        models. Consider using a rule when:
      </p>
      <ul>
        <li>
          You want to react to mutations inside the identifier&apos;s value, not
          just reference replacement — use{' '}
          <Link href="/docs/watch-index-recursive-rule">
            <code>watchIndexRecursiveRule</code>
          </Link>{' '}
          to widen observation.
        </li>
        <li>
          You only want to react to specific sub-property changes inside the
          identifier&apos;s value — write a custom{' '}
          <Link href="/docs/index-watch-rule">
            <code>IIndexWatchRule</code>
          </Link>{' '}
          whose <code>test()</code> returns <code>true</code> only for the
          properties you care about.
        </li>
      </ul>
    </>
  ),

  keyPoints: [
    <>
      A leaf identifier is the identifier node that directly reads a value — the
      immediate property access on its context. <code>a</code> and{' '}
      <code>b</code> in <code>a + b</code>; <code>name</code> in{' '}
      <code>user.profile.name</code>.
    </>,
    <>
      Default: rs-x watches for direct replacement of the identifier&apos;s
      value. Only assigning a new value to that specific property fires
      reevaluation — sibling properties on the same context do not.
    </>,
    <>
      <strong>Arrays, Maps, Sets, and Dates</strong> are automatically wrapped
      in a Proxy. Internal mutations (<code>push</code>, <code>set</code>,
      method calls) fire reevaluation without any rule.
    </>,
    <>
      Values that do not require a Proxy are not observed internally by default.
      Only direct assignment to the identifier fires reevaluation unless a rule
      is provided.
    </>,
    <>
      Pass an{' '}
      <Link href="/docs/index-watch-rule">
        <code>IIndexWatchRule</code>
      </Link>{' '}
      as the second argument to <code>rsx(&apos;expr&apos;)(model)</code> to
      extend observation to sub-properties of the identifier&apos;s value.
    </>,
    <>
      <code>test(index, target)</code> is called at the leaf level:{' '}
      <code>index</code> is a sub-property key of the identifier&apos;s value,{' '}
      <code>target</code> is the identifier&apos;s value itself. Return{' '}
      <code>true</code> to install a sub-observer for that property.
    </>,
    <>
      <Link href="/docs/watch-index-recursive-rule">
        <code>watchIndexRecursiveRule</code>
      </Link>{' '}
      always returns <code>true</code>, recursing into every sub-property. It is
      useful when you want any internal mutation of the identifier&apos;s value
      to fire.
    </>,
    <>
      For member expressions like <code>user.profile.name</code>, the segments{' '}
      <code>user</code> and <code>user.profile</code> are also watched for
      reference replacement. Replacing one re-attaches the watch; if the
      leaf&apos;s resolved value has changed, a change event is emitted.
    </>,
    <>
      The same rule applies to all leaf identifiers in the expression. For{' '}
      <code>a + b</code>, the rule governs both <code>a</code> and{' '}
      <code>b</code>.
    </>,
  ],

  deepDive: [
    {
      title: 'What fires reevaluation by default',
      paragraphs: [
        <>
          rs-x registers a watch on the specific{' '}
          <code>(identifierKey, context)</code> pair. For{' '}
          <code>user.profile.name</code>, that is{' '}
          <code>(&apos;name&apos;, user.profile)</code>. A direct assignment to
          that key — <code>user.profile.name = &apos;Bob&apos;</code> — fires
          the expression. An assignment like{' '}
          <code>user.profile.role = &apos;PM&apos;</code> targets a different
          key and is not observed.
        </>,
        <>
          For member expressions, the segments above the leaf are also watched
          for reference replacement. Replacing <code>user.profile</code> or{' '}
          <code>user</code> re-attaches the watch to the new objects; if the
          resolved value of <code>name</code> has changed as a result, a change
          event is emitted. This keeps the expression consistent even when the
          model is restructured above the leaf.
        </>,
      ],
    },
    {
      title: 'Automatic Proxy for arrays and collections',
      paragraphs: [
        <>
          When the identifier&apos;s value is an <code>Array</code>,{' '}
          <code>Map</code>, <code>Set</code>, or <code>Date</code>, rs-x
          automatically wraps it in a JavaScript <code>Proxy</code>. The proxy
          intercepts mutation methods (<code>push</code>, <code>splice</code>,{' '}
          <code>pop</code>, <code>set</code>, setter calls on <code>Date</code>)
          and treats them as change events, triggering reevaluation just as a
          direct assignment would.
        </>,
        <>
          No watch rule is required for this behaviour — it is determined by the
          value&apos;s type.
        </>,
      ],
      code: dedent`
        const model = { items: [1, 2, 3] };
        const expression = rsx('items')(model);

        // All of these fire reevaluation automatically:
        model.items.push(4);
        model.items[0] = 99;
        model.items.splice(1, 1);
      `,
    },
    {
      title: 'Widening with watchIndexRecursiveRule',
      paragraphs: [
        <>
          By default, only direct assignment to the identifier fires
          reevaluation — mutations inside the value do not. If you want any
          internal mutation to fire, pass{' '}
          <Link href="/docs/watch-index-recursive-rule">
            <code>watchIndexRecursiveRule</code>
          </Link>{' '}
          from <code>@rs-x/state-manager</code>.
        </>,
        <>
          This rule always returns <code>true</code> from <code>test()</code>,
          so rs-x installs observers for every sub-property of the
          identifier&apos;s value, recursively. For{' '}
          <code>
            rsx(&apos;config.theme&apos;)(model, watchIndexRecursiveRule)
          </code>
          , a write to <code>config.theme.color</code> fires the expression even
          though the <code>theme</code> reference itself was not replaced.
        </>,
      ],
      code: dedent`
        import { watchIndexRecursiveRule } from '@rs-x/state-manager';

        const expression = rsx('config.theme')(model, watchIndexRecursiveRule);
        // config.theme.color = 'red' now fires reevaluation.
      `,
    },
    {
      title: 'Selective widening with a custom IIndexWatchRule',
      paragraphs: [
        <>
          When only specific sub-properties should trigger reevaluation, write a
          custom{' '}
          <Link href="/docs/index-watch-rule">
            <code>IIndexWatchRule</code>
          </Link>{' '}
          whose <code>test(index, target)</code> returns <code>true</code> only
          for the keys you care about — observation is extended to those
          sub-properties only; all others remain unwatched.
        </>,
        <>
          Like <code>watchIndexRecursiveRule</code>, a custom rule adds
          observation on top of the reference-only default. The difference is
          that <code>test()</code> opts in selectively rather than for every
          sub-property.
        </>,
      ],
      code: dedent`
        const watchRule = {
          id: 'watch-name-only',
          context: { tracked: new Set(['name']) },
          test(index) {
            return this.context.tracked.has(String(index));
          },
          dispose() {},
        };

        // Expression returns user.profile (a plain object).
        // Only changes to profile.name fire; profile.role changes are ignored.
        const expression = rsx('user.profile')(model, watchRule);
      `,
    },
  ],

  examples: [
    {
      title: 'Default behaviour',
      description:
        'The watch is specific to the leaf identifier key. Assigning user.profile.name or replacing an intermediate reference (user.profile) fires; changing an unrelated property like role does not.',
      code: defaultBehaviorCode,
      playgroundScript: defaultBehaviorPlaygroundScript,
    },
    {
      title: 'Array — automatic Proxy',
      description:
        'When the identifier value is an Array, rs-x wraps it in a Proxy automatically. push and index writes fire without any watch rule.',
      code: arrayProxyCode,
      playgroundScript: arrayProxyPlaygroundScript,
    },
    {
      title: 'Widening with watchIndexRecursiveRule',
      description:
        'watchIndexRecursiveRule widens observation: any mutation inside the identifier value (config.theme) fires the expression, not just reference replacement.',
      code: recursiveRuleCode,
      playgroundScript: recursiveRulePlaygroundScript,
    },
    {
      title: 'Selective widening with a custom IIndexWatchRule',
      description:
        'A custom IIndexWatchRule extends observation to specific sub-properties only. Changes to name fire; changes to role remain unwatched.',
      code: allowListRuleCode,
      playgroundScript: allowListRulePlaygroundScript,
    },
  ],

  related: [
    {
      href: '/docs/index-watch-rule',
      title: 'IIndexWatchRule',
      meta: 'Full API reference — interface, factory, and semantics table',
    },
    {
      href: '/docs/watch-index-recursive-rule',
      title: 'watchIndexRecursiveRule',
      meta: 'Pre-built rule for full recursive observation — import and use directly',
    },
    {
      href: '/docs/core-concepts/member-expressions',
      title: 'Member expressions',
      meta: 'Nested property and member access — how member expression segments are watched',
    },
    {
      href: '/docs/core-concepts/first-expression',
      title: 'Create your first expression',
      meta: 'Step-by-step flow: bind, subscribe, options, and dispose',
    },
    {
      href: '/docs/core-concepts/async-operations',
      title: 'Async operations',
      meta: 'Mix Promise/Observable/expression values with sync values',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
