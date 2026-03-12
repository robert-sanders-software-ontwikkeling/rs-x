import dedent from 'dedent';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'rsx function',
  description: 'Bind expression strings to a model with the rsx helper.',
};

const apiCode = dedent`
  export function rsx<TReturn, TModel extends object = object>(
    expressionString: string,
  ): (
    model: TModel,
    leafIndexWatchRule?: IIndexWatchRule,
  ) => IExpression<TReturn>;
`;

const usageCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = { a: 10, b: 20 };
  const expression = rsx<number>('a + b')(model);

  console.log(expression.value); // 30

  expression.changed.subscribe(() => {
    console.log('updated:', expression.value);
  });

  model.b = 25; // triggers changed
`;

const factoryCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import {
    IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const expressionFactory = InjectionContainer.get(
    RsXExpressionParserInjectionTokens.IExpressionFactory,
  ) as IExpressionFactory;

  const model = { a: 10, b: 20 };
  const expression = expressionFactory.create<number, typeof model>(
    model,
    'a + b',
  );
`;

export default function RsxFunctionDocsPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/expression-parser' },
              { label: 'rsx function' },
            ]}
          />
          <p className="docsApiEyebrow">API Reference</p>
          <h1 className="sectionTitle">rsx function</h1>
          <p className="sectionLead">
            <span className="codeInline">rsx</span> takes an expression string
            and returns a binder function. Call the binder with a model to get
            an executable expression instance.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            <span className="codeInline">rsx(&apos;a + b&apos;)</span>
            returns a function that binds the expression to your model. Only the
            model parts used by the expression become reactive. For example,
            with <span className="codeInline">rsx(&apos;a + b&apos;)</span>,
            fields <span className="codeInline">a</span> and{' '}
            <span className="codeInline">b</span> are tracked, while an
            unrelated field like <span className="codeInline">c</span> is not.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            items={[
              {
                name: 'expressionString',
                type: 'string',
                description:
                  "Expression string to parse (for example 'a + b').",
              },
              {
                name: 'model',
                type: 'TModel extends object',
                description: 'Target object context bound to the expression.',
              },
              {
                name: 'leafIndexWatchRule?',
                type: 'IIndexWatchRule',
                description:
                  'Optional rule controlling how leaf index dependencies are watched.',
              },
            ]}
          />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Return type</h2>
          <p className="cardText">
            Returns a binder function:
            <span className="codeInline">
              {' '}
              (model, leafIndexWatchRule?) =&gt; IExpression&lt;TReturn&gt;
            </span>
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Requirements</h2>
          <p className="cardText">
            Load <span className="codeInline">RsXExpressionParserModule</span>{' '}
            into the <span className="codeInline">InjectionContainer</span>{' '}
            before using <span className="codeInline">rsx</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Usage notes</h2>
          <p className="cardText">
            You can also resolve the singleton{' '}
            <span className="codeInline">IExpressionFactory</span> from the{' '}
            <span className="codeInline">InjectionContainer</span> and call{' '}
            <span className="codeInline">create(...)</span> directly. That
            works, but <span className="codeInline">rsx(...)</span> is the
            simplest entry point and avoids extra DI boilerplate in application
            code.
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

          <div className="qsCodeHeader">
            <div className="qsCodeTitle">
              Direct factory usage (more boilerplate)
            </div>
          </div>
          <SyntaxCodeBlock code={factoryCode} />
        </aside>
      </div>
    </DocsPageTemplate>
  );
}
