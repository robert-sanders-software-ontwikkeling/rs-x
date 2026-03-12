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
            Queues expression changes while updates are suspended and emits them
            together on commit.
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
                  'Root expression whose commit should be coordinated by the transaction manager.',
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
            <span className="codeInline">suspend()</span> pauses commit
            emission.
          </p>
          <p className="cardText">
            <span className="codeInline">continue()</span> resumes and triggers{' '}
            <span className="codeInline">commit()</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">commit()</span> flushes pending commit
            handlers.
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
