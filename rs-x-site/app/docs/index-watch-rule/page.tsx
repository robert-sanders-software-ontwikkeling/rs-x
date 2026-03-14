import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

import { IndexWatchRuleSemanticsTable } from './index-watch-rule-semantics-table.client';

export const metadata = {
  title: 'IIndexWatchRule',
  description:
    'Rule contract for controlling which leaf index accesses are watched by rs-x/state-manager.',
};

const apiCode = dedent`
  export interface IIndexWatchRule {
    context: unknown;
    test(index: unknown, target: unknown): boolean;
  }
`;

const rsxUsageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  const watchRule: IIndexWatchRule = {
    context: { allow: new Set(['a', 'b']) },
    test(index) {
      return this.context.allow.has(String(index));
    },
  };

  const model = { a: 1, b: 2, c: 3 };
  const expression = rsx<number>('a + b')(model, watchRule);
`;

const stateManagerUsageCode = dedent`
  import type { IStateManager } from '@rs-x/state-manager';

  const watchRule = {
    context: { recursive: true },
    test(_index, _target) {
      return this.context.recursive;
    },
  };

  stateManager.watchState(model, 'user', { indexWatchRule: watchRule });
`;

const fullRecursiveShortcutCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import { watchIndexRecursiveRule } from '@rs-x/state-manager';

  const model = { a: { b: { c: 1 } } };
  const expression = rsx('a.b')(model, watchIndexRecursiveRule);
`;

const plainObjectPlaygroundCode = dedent`
  const rsx = api.rsx;

  const model = {
    user: {
      profile: { name: 'Ada', role: 'engineer' },
    },
  };

  const watchRule = {
    context: { trackedLeafProperties: new Set(['name']) },
    test(index, target) {
      if (target === model && index === 'user') {
        return true;
      }

      if (target === model.user && index === 'profile') {
        return true;
      }

      if (target === model.user.profile) {
        return this.context.trackedLeafProperties.has(String(index));
      }

      return false;
    },
  };

  const expression = rsx('user.profile')(model, watchRule);

  // Tracked:
  setTimeout(() => {
    model.user.profile.name = 'Grace';
  }, 250);

  // Not tracked by this rule:
  setTimeout(() => {
    model.user.profile.role = 'architect';
  }, 500);

  return expression;
`;

const datePlaygroundCode = dedent`
  const rsx = api.rsx;

  const model = {
    schedule: {
      start: new Date(2026, 0, 1, 9, 30, 0),
    },
  };

  const watchRule = {
    context: { trackedDateParts: new Set(['hours', 'minutes']) },
    test(index, target) {
      if (target === model && index === 'schedule') {
        return true;
      }

      if (target === model.schedule && index === 'start') {
        return true;
      }

      if (target === model.schedule.start) {
        return this.context.trackedDateParts.has(String(index));
      }

      return false;
    },
  };

  const expression = rsx('schedule.start')(model, watchRule);

  // Tracked by rule:
  setTimeout(() => {
    model.schedule.start.setHours(10);
  }, 250);

  // Not tracked by rule:
  setTimeout(() => {
    model.schedule.start.setSeconds(45);
  }, 500);

  return expression;
`;

const arrayPlaygroundCode = dedent`
  const rsx = api.rsx;

  const model = {
    items: [
      { label: 'A', qty: 1, note: 'keep' },
      { label: 'B', qty: 2, note: 'keep' },
    ],
  };

  const watchRule = {
    context: { trackedItemProperty: 'qty' },
    test(index, target) {
      if (target === model && index === 'items') {
        return true;
      }

      if (Array.isArray(target)) {
        return true; // watch each array slot
      }

      return String(index) === this.context.trackedItemProperty;
    },
  };

  const expression = rsx('items')(model, watchRule);

  // Tracked:
  setTimeout(() => {
    model.items[0].qty = 10;
  }, 250);

  // Not tracked by rule:
  setTimeout(() => {
    model.items[0].note = 'updated';
  }, 500);

  // Tracked member mutation:
  setTimeout(() => {
    model.items.push({ label: 'C', qty: 3, note: 'new' });
  }, 750);

  return expression;
`;

const mapPlaygroundCode = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const admin = { enabled: true, rank: 1 };
  const guest = { enabled: false, rank: 2 };

  const model = {
    roles: new Map([
      ['admin', admin],
      ['guest', guest],
    ]),
  };

  const watchRule = {
    context: { trackedKeys: new Set(['admin']) },
    test(index, target) {
      if (target === model && index === 'roles') {
        return true;
      }

      if (target instanceof Map) {
        return this.context.trackedKeys.has(String(index));
      }

      if (target === model.roles.get('admin')) {
        return String(index) === 'enabled';
      }

      return false;
    },
  };

  const expression = rsx('roles["admin"]')(model, watchRule);
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    const trackedAdminChange = await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      admin.enabled = false;
    });
    console.log('admin enabled change emitted:', trackedAdminChange === expression); // true

    const ignoredGuestChange = await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      guest.enabled = true;
    });
    console.log('guest enabled change emitted:', ignoredGuestChange !== null); // false

    const trackedMapUpdate = await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.roles.set('admin', { enabled: true, rank: 3 });
    });
    console.log('admin map replacement emitted:', trackedMapUpdate === expression); // true

  return expression;
`;

const setPlaygroundCode = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const emptyFunction = () => {};

  const taskA = { id: 'A', done: false, note: 'leaf object' };
  const taskB = { id: 'B', done: false, note: 'other object' };

  const model = {
    trackedTask: taskA,
    tasks: new Set([taskA, taskB]),
  };

  // Default: non-recursive leaf watching
  const trackedTaskExpression = rsx('tasks[trackedTask]')(model);
    await new WaitForEvent(trackedTaskExpression, 'changed').wait(emptyFunction);

    const nestedChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
      ignoreInitialValue: true,
      timeout: 100,
    }).wait(() => {
      taskA.done = true;
    });
    console.log('nested done change emitted:', nestedChange !== null); // false

    const directChange = await new WaitForEvent(trackedTaskExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.tasks.delete(taskA);
    });
    console.log('set membership change emitted:', directChange === trackedTaskExpression); // true

  return trackedTaskExpression;
`;

const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

interface IRuleSemanticsRow {
  valueType: string;
  indexMeaning: string;
  targetMeaning: string;
  typicalRuleCheck: string;
}

const ruleSemanticsRows: IRuleSemanticsRow[] = [
  {
    valueType: 'Plain object',
    indexMeaning: 'Property key (string/symbol)',
    targetMeaning: 'The object that owns the property',
    typicalRuleCheck: "target === model.user && index === 'profile'",
  },
  {
    valueType: 'Date',
    indexMeaning: "Date part key ('year', 'month', 'time', ...)",
    targetMeaning: 'The Date instance',
    typicalRuleCheck: "target === model.date && index === 'hours'",
  },
  {
    valueType: 'Array',
    indexMeaning: 'Numeric slot index',
    targetMeaning: 'The array instance',
    typicalRuleCheck: 'Array.isArray(target) && index === 0',
  },
  {
    valueType: 'Map',
    indexMeaning: 'Map key',
    targetMeaning: 'The map instance',
    typicalRuleCheck: "target instanceof Map && index === 'admin'",
  },
  {
    valueType: 'Set',
    indexMeaning: 'Member value itself',
    targetMeaning: 'The set instance',
    typicalRuleCheck: 'target instanceof Set && trackedMembers.has(index)',
  },
];

interface IPlaygroundExample {
  title: string;
  description: string;
  code: string;
}

const playgroundExamples: IPlaygroundExample[] = [
  {
    title: 'Plain Object Example',
    description:
      'Tracks only user.profile.name while ignoring user.profile.role.',
    code: plainObjectPlaygroundCode,
  },
  {
    title: 'Date Example',
    description:
      'Tracks schedule.start hours/minutes updates and ignores seconds.',
    code: datePlaygroundCode,
  },
  {
    title: 'Array Example',
    description:
      'Tracks array slot mutations and qty changes on each item, but not note.',
    code: arrayPlaygroundCode,
  },
  {
    title: 'Map Example',
    description:
      'Tracks only the admin key branch and enabled property changes.',
    code: mapPlaygroundCode,
  },
  {
    title: 'Set Example',
    description:
      'Tracks a set member path by default (non-recursive): nested done is ignored, membership changes are tracked.',
    code: setPlaygroundCode,
  },
];

export default function IndexWatchRuleDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/state-manager' },
              { label: 'IIndexWatchRule' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">IIndexWatchRule</h1>
          <p className="sectionLead">
            <span className="codeInline">IIndexWatchRule</span> is the
            gatekeeper for recursive observation. It decides which nested
            member/index updates are turned into reactive change events.
          </p>
        </div>
        <div className="docsApiActions">
          <Link className="btn btnGhost" href="/docs/rsx-function">
            rsx function <span aria-hidden="true">→</span>
          </Link>
          <Link className="btn btnGhost" href="/docs/observation">
            Observation by data type <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What It Controls</h2>
          <p className="cardText">
            The rule is evaluated with{' '}
            <span className="codeInline">test(index, target)</span> whenever
            rs-x decides if a nested value should remain observed. Returning{' '}
            <span className="codeInline">true</span> keeps recursive observation
            active for that member path.
          </p>
          <p className="cardText">
            Without a watch rule, rs-x still tracks root assignments and
            collection membership mutations. But nested member/property changes
            under leaf values are only tracked when the rule allows them.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Where To Pass The Rule</h2>
          <p className="cardText">
            Use it either at expression binding time (
            <span className="codeInline">leafIndexWatchRule</span>) or directly
            in state manager (
            <span className="codeInline">
              watchState(..., {'{'} indexWatchRule {'}'})
            </span>
            ).
          </p>
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">rsx usage</div>
          </div>
          <SyntaxCodeBlock code={rsxUsageCode} />
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">state manager usage</div>
          </div>
          <SyntaxCodeBlock code={stateManagerUsageCode} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'context',
                type: 'unknown',
                description:
                  'User-defined data bag used by test(...) to hold rule config.',
              },
              {
                name: 'index',
                type: 'unknown',
                description: 'Current member/index candidate under evaluation.',
              },
              {
                name: 'target',
                type: 'unknown',
                description:
                  'Object/collection that owns the current index/member.',
              },
            ]}
          />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Return Type</h2>
          <p className="cardText">
            <span className="codeInline">test(...)</span> returns{' '}
            <span className="codeInline">boolean</span>.
          </p>
          <p className="cardText">
            Return <span className="codeInline">true</span> to include a member
            in recursive observation; return{' '}
            <span className="codeInline">false</span> to skip it.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Index / Target Semantics By Type</h2>
          <p className="cardText">
            The meaning of <span className="codeInline">index</span> depends on
            runtime type:
          </p>
          <IndexWatchRuleSemanticsTable rows={ruleSemanticsRows} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Practical Pattern</h2>
          <p className="cardText">The usual rule shape is:</p>
          <ul className="advancedTopicList">
            <li>
              Allow the leaf container itself (for example{' '}
              <span className="codeInline">model.items</span>) so recursive
              observation can be installed.
            </li>
            <li>
              Allow specific collection members/keys or nested object
              properties.
            </li>
            <li>Keep rule logic deterministic and side-effect free.</li>
          </ul>
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">Watch everything under the leaf</div>
          </div>
          <SyntaxCodeBlock code={fullRecursiveShortcutCode} />
        </article>

        {playgroundExamples.map((example) => (
          <article key={example.title} className="card docsApiCard">
            <h2 className="cardTitle">{example.title}</h2>
            <p className="cardText">{example.description}</p>
            <div className="cardLinks">
              <Link className="cardLink" href={toPlaygroundHref(example.code)}>
                Try in playground <span aria-hidden="true">→</span>
              </Link>
            </div>
            <SyntaxCodeBlock code={example.code} />
          </article>
        ))}

        <aside
          className="qsCodeCard docsApiCode"
          aria-label="IIndexWatchRule API and quick reference"
        >
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">Quick checklist</div>
          </div>
          <SyntaxCodeBlock
            code={dedent`
              // 1) Start with strict matching:
              //    if (target === model && index === 'items') return true;
              //
              // 2) Add nested branches intentionally:
              //    if (Array.isArray(target)) return true;
              //
              // 3) Filter leaf properties:
              //    return index === 'qty';
            `}
          />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
