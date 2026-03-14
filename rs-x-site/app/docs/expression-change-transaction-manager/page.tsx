import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'Expression Change Transaction Manager',
  description:
    'Batch expression change emission with suspend/continue/commit in rs-x.',
};

const usageCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import {
    type IExpressionChangeTransactionManager,
    rsx,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const tx = InjectionContainer.get<IExpressionChangeTransactionManager>(
    RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
  );

  const model = { a: 1, b: 2 };
  const expression = rsx<number>('a + b')(model);

  expression.changed.subscribe(() => {
    console.log('changed ->', expression.value);
  });

  tx.suspend();
  model.a = 10;
  model.b = 20;
  tx.continue(); // commits pending changes and emits consolidated notifications
`;

const apiCode = dedent`
  export interface IExpressionChangeTransactionManager extends IDisposable {
    readonly commited: Observable<AbstractExpression>;
    registerChange(
      rootExpression: AbstractExpression,
      commitHandler: IExpressionChangeCommitHandler,
    ): void;
    suspend(): void;
    continue(): void;
    commit(): void;
  }
`;

export default function ExpressionChangeTransactionManagerDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'Expression Change Transaction Manager' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">
            Expression Change Transaction Manager
          </h1>
          <p className="sectionLead">
            Batch model updates so observers receive one consolidated commit
            notification instead of many intermediate updates.
          </p>
          <p className="docsApiInterface">
            Interface:{' '}
            <span className="codeInline">
              IExpressionChangeTransactionManager
            </span>
          </p>
        </div>
        <div className="docsApiActions">
          <Link className="btn btnGhost" href="/playground">
            Open Playground <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            Coordinates expression commit handlers per evaluation root and
            flushes them as one transaction boundary.
          </p>
          <p className="cardText">
            In practice, identifier updates call{' '}
            <span className="codeInline">registerChange(...)</span>, the
            manager groups these handlers in a per-root queue, and commit emits
            a single committed-root signal after reevaluation stabilizes.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'rootExpression',
                type: 'AbstractExpression',
                description:
                  'Root expression whose commit should be coordinated by the change transaction manager.',
              },
              {
                name: 'commitHandler',
                type: 'IExpressionChangeCommitHandler',
                description:
                  'Callback invoked when the manager flushes a commit cycle.',
              },
            ]}
          />
          <p className="cardText">
            <span className="codeInline">suspend()</span>,{' '}
            <span className="codeInline">continue()</span>, and{' '}
            <span className="codeInline">commit()</span> do not take parameters.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Return type</h2>
          <p className="cardText">
            All control methods return <span className="codeInline">void</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">commited</span> is an observable event
            stream of committed root expressions.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage notes</h2>
          <p className="cardText">
            <span className="codeInline">suspend()</span> pauses automatic
            flushing when state-manager cycles end.
          </p>
          <p className="cardText">
            <span className="codeInline">continue()</span> resumes and
            immediately triggers <span className="codeInline">commit()</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">commit()</span> flushes pending commit
            handlers for each root and emits on{' '}
            <span className="codeInline">commited</span> once that root has no
            pending handlers left in the current microtask pass.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Internal lifecycle</h2>
          <p className="cardText">
            The manager listens to state-manager{' '}
            <span className="codeInline">startChangeCycle</span> and{' '}
            <span className="codeInline">endChangeCycle</span>. A depth counter
            gates auto-commit, so flush happens only when the outermost cycle
            finishes and batching is not suspended.
          </p>
          <p className="cardText">
            Pending work is stored as{' '}
            <span className="codeInline">
              Map&lt;rootExpression, Set&lt;commitHandler&gt;&gt;
            </span>
            . This deduplicates repeated handler registrations per root in one
            cycle.
          </p>
          <p className="cardText">
            Commit execution runs in microtask passes. Each pass can trigger
            additional registrations during reevaluation; the next microtask
            pass flushes those before final committed emission.
          </p>
        </article>

        <aside className="qsCodeCard docsApiCode" aria-label="API and usage">
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">API</div>
          </div>
          <SyntaxCodeBlock code={apiCode} />

          <div className="qsCodeHeader">
            <div className="qsCodeTitle">Usage example</div>
          </div>
          <SyntaxCodeBlock code={usageCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
