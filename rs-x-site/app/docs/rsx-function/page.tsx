import dedent from 'dedent';
import Link from 'next/link';

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
    options?: IRsxOptions,
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

  expression.changed.subscribe(() => {
    console.log('changed:', expression.value);
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

const rsxOptionsCode = dedent`
  // rsx options (compiler/build hints; not runtime playground behavior)
  const expression = rsx<number>('a + b', {
    preparse: true, // default
    lazy: false, // default
    compiled: true, // default
  })(model);
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
            (and optional declaration options) and returns a binder function.
            Then call that binder with a model to create a bound expression.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">Description</h2>
          <p className="cardText">
            Call shape: <span className="codeInline">rsx(expression, options?)(model, leafIndexWatchRule?)</span>.
          </p>
          <p className="cardText">
            Step 1: <span className="codeInline">rsx(&apos;a + b&apos;, options?)</span>{' '}
            declares the expression and returns a binder.
          </p>
          <p className="cardText">
            Step 2: calling that binder with{' '}
            <span className="codeInline">(model)</span> creates the live
            expression instance.
          </p>
          <p className="cardText">
            For <span className="codeInline">a + b</span>, fields{' '}
            <span className="codeInline">a</span> and{' '}
            <span className="codeInline">b</span> are tracked; unrelated fields
            are not.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Parameters</h2>
          <ApiParameterList
            currentSymbol="rsx"
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
                name: 'options?',
                type: 'IRsxOptions',
                typeHref: '/docs/irsx-options',
                description:
                  'Optional per-expression options object: { preparse?: boolean; lazy?: boolean; compiled?: boolean }.',
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
          <h2 className="cardTitle">Arguments and options explained</h2>
          <p className="cardText">
            <span className="codeInline">model</span> and{' '}
            <span className="codeInline">leafIndexWatchRule</span> are binder
            arguments: <span className="codeInline">(model, leafIndexWatchRule?)</span>.
          </p>
          <p className="cardText">
            <span className="codeInline">model</span> is required and defines
            binding context for identifier resolution.
          </p>
          <p className="cardText">
            <span className="codeInline">leafIndexWatchRule</span> is optional
            and lets you customize leaf/member watch behavior for arrays/maps/
            sets or nested object paths.
          </p>
          <p className="cardText">
            <span className="codeInline">preparse</span> and{' '}
            <span className="codeInline">lazy</span> plus{' '}
            <span className="codeInline">compiled</span> are declaration options
            on the <span className="codeInline">rsx(..., options)</span> call
            used by compiler/AOT workflows. Defaults: preparse=true, lazy=false,
            compiled=true.
          </p>
          <p className="cardText">
            See <Link href="/docs/irsx-options">IRsxOptions</Link> for option
            details.
          </p>
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
          <p className="cardText">
            If you want the full step-by-step lifecycle (create, bind, options,
            subscribe, dispose), see{' '}
            <Link href="/docs/core-concepts/first-expression">
              Create your first expression
            </Link>
            .
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
          <div className="qsCodeHeader">
            <div className="qsCodeTitle">rsx options</div>
          </div>
          <SyntaxCodeBlock code={rsxOptionsCode} />

        </aside>
      </div>
    </DocsPageTemplate>
  );
}
