import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'IExpressionChangeCommitHandler',
  description:
    'Commit callback contract used by expression transaction batching.',
};

const apiCode = dedent`
  export interface IExpressionChangeCommitHandler {
    owner: AbstractExpression;
    commit: (
      root: AbstractExpression,
      pendingCommits: Set<IExpressionChangeCommitHandler>,
    ) => boolean;
  }
`;

const usageCode = dedent`
  import type {
    IExpressionChangeCommitHandler,
    AbstractExpression,
  } from '@rs-x/expression-parser';

  const handler: IExpressionChangeCommitHandler = {
    owner: rootExpression,
    commit(root, pendingCommits) {
      // perform node-specific commit work
      // return true when this handler committed a change
      return true;
    },
  };
`;

export default function ExpressionChangeCommitHandlerDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'IExpressionChangeCommitHandler' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">IExpressionChangeCommitHandler</h1>
          <p className="sectionLead">
            Internal commit handler contract used by the transaction manager to
            flush pending expression changes in a batch.
          </p>
        </div>
        <div className="docsApiActions">
          <Link
            className="btn btnGhost"
            href="/docs/expression-change-transaction-manager"
          >
            Transaction manager <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            Defines how one expression node participates in a commit cycle. The
            manager gathers handlers and invokes them during flush.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'owner',
                type: 'AbstractExpression',
                description:
                  'Expression instance that owns this commit handler.',
              },
              {
                name: 'root',
                type: 'AbstractExpression',
                description:
                  'Root expression being committed in the current cycle.',
              },
              {
                name: 'pendingCommits',
                type: 'Set<IExpressionChangeCommitHandler>',
                description:
                  'Remaining handlers queued for the same commit cycle.',
              },
            ]}
          />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Return type</h2>
          <p className="cardText">
            <span className="codeInline">commit(...)</span> returns{' '}
            <span className="codeInline">boolean</span> indicating whether this
            handler produced a commit.
          </p>
        </article>

        <aside
          className="qsCodeCard docsApiCode"
          aria-label="IExpressionChangeCommitHandler API and usage"
        >
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
