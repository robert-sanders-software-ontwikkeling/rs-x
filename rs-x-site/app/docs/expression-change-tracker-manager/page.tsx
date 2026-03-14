import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'Expression Change Tracker Manager',
  description:
    'Track expression change history with pause/continue and batched notifications in rs-x.',
};

const apiCode = dedent`
  export interface IExpressionChangeTracker extends IDisposable {
    readonly changed: Observable<IExpressionChangeHistory[]>;
    pause(): void;
    continue(): void;
  }

  export type IExpressionChangeTrackerManager = IKeyedInstanceFactory<
    IExpression,
    IExpression,
    IExpressionChangeTracker
  >;
`;

const usageCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import {
    type IExpressionChangeTrackerManager,
    rsx,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const trackerManager = InjectionContainer.get<IExpressionChangeTrackerManager>(
    RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager
  );

  const model = { a: 10, b: 20 };
  const expression = rsx<number>('a + b')(model);

  const tracker = trackerManager.create(expression).instance;

  tracker.changed.subscribe((history) => {
    // history = list of changed nodes in the last flush
    console.log(history.map((item) => item.expression.expressionString));
  });

  tracker.pause();
  model.a = 11;
  model.b = 21;
  tracker.continue();

  // cleanup
  tracker.dispose();
`;

export default function ExpressionChangeTrackerManagerDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'Expression Change Tracker Manager' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">Expression Change Tracker Manager</h1>
          <p className="sectionLead">
            Create a tracker for an expression and observe granular change
            history batches. Pause and continue tracking when needed.
          </p>
          <p className="docsApiInterface">
            Interface:{' '}
            <span className="codeInline">IExpressionChangeTrackerManager</span>
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
            Tracks expression node updates and emits a list of changed
            expressions per flush cycle.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'expression',
                type: 'IExpression',
                typeHref: '/docs/iexpression',
                description: 'Root expression to track for change history.',
              },
            ]}
          />
          <p className="cardText">
            <span className="codeInline">pause()</span> and{' '}
            <span className="codeInline">continue()</span> do not take
            parameters.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Return type</h2>
          <p className="cardText">
            <span className="codeInline">create(expression)</span> returns a
            keyed-instance-factory result object with{' '}
            <span className="codeInline">instance</span>,
            <span className="codeInline"> id</span>, and{' '}
            <span className="codeInline">referenceCount</span>.
          </p>
          <p className="cardText">
            Tracker methods return <span className="codeInline">void</span>;{' '}
            <span className="codeInline">changed</span> returns observable
            batches of
            <span className="codeInline"> IExpressionChangeHistory[]</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage notes</h2>
          <p className="cardText">
            Call <span className="codeInline">dispose()</span> on the tracker to
            release manager references.
          </p>
          <p className="cardText">
            <span className="codeInline">pause()</span> suppresses tracking
            emissions until <span className="codeInline">continue()</span> is
            called.
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
