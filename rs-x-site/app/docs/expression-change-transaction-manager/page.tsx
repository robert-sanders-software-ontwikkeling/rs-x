import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'Expression Change Transaction Manager',
  description:
    'Coordinate expression commit boundaries with suspend/continue/commit in rs-x.',
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

  const unsubscribeCommitted = tx.subscribeCommitted(() => {
    console.log('commit boundary reached');
  });

  expression.changed.subscribe(() => {
    console.log('changed ->', expression.value);
  });

  // Batch writes
  tx.suspend();
  model.a = 10;
  model.b = 20;
  tx.continue(); // resumes + commit()

  unsubscribeCommitted();
`;

const apiCode = dedent`
  export type IExpressionCommitListener = () => void;

  export interface IDirtyFlushable {
    flush(): void;
  }

  export interface IExpressionChangeTransactionManager extends IDisposable {
    subscribeCommitted(listener: IExpressionCommitListener): () => void;
    suspend(): void;
    continue(): void;
    commit(): void;
    scheduleDirtyFlush(manager: IDirtyFlushable): void;
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
            Coordinates commit boundaries for expression evaluation. Internally,
            expression evaluate managers subscribe once and flush pending work
            when commits are triggered.
          </p>
          <p className="cardText">
            It also provides a shared microtask queue via{' '}
            <span className="codeInline">scheduleDirtyFlush(...)</span> so
            multiple dirty managers can flush once per microtask instead of
            creating independent flush loops.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'listener',
                type: '() => void',
                description:
                  'Commit listener passed to subscribeCommitted(listener). Returns an unsubscribe function.',
              },
              {
                name: 'manager',
                type: 'IDirtyFlushable',
                description:
                  'Dirty manager passed to scheduleDirtyFlush(manager). Must expose flush(): void.',
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
            <span className="codeInline">subscribeCommitted(...)</span> returns
            an unsubscribe callback.
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
            Keep <span className="codeInline">suspend()</span> /{' '}
            <span className="codeInline">continue()</span> calls balanced.
            <span className="codeInline"> continue() </span>
            decrements internal suspend depth.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Internal lifecycle</h2>
          <p className="cardText">
            <span className="codeInline">subscribeCommitted(...)</span>{' '}
            listeners are one-shot per commit call. Internally, listeners are
            copied, cleared, then invoked.
          </p>
          <p className="cardText">
            <span className="codeInline">scheduleDirtyFlush(...)</span> batches
            dirty managers in a shared set and flushes them in the next
            microtask using <span className="codeInline">queueMicrotask</span>.
          </p>
          <p className="cardText">
            If suspended, <span className="codeInline">commit()</span> is
            ignored until suspension depth returns to zero.
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
