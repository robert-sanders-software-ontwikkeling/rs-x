import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'IExpression',
  description: 'Reference for the IExpression interface in rs-x.',
};

const apiCode = dedent`
  export interface IExpression<T = unknown, PT = unknown> extends IDisposable {
    readonly id: string;
    readonly changed: Observable<IExpression>;
    readonly type: ExpressionType; // see /docs/expression-type
    readonly expressionString: string;
    readonly parent: IExpression<PT> | undefined;
    readonly childExpressions: readonly IExpression[];
    readonly value: T | undefined;
    readonly isRoot: boolean;
    readonly isAsync: boolean | undefined;
    readonly hidden: boolean;
    changeHook?: ChangeHook; // see /docs/change-hook
    toString(): string;
    clone(): this;
    bind(settings: IExpressionBindConfiguration): IExpression;
  }
`;

const usageCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule, type IExpression } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = { a: 10, b: 20 };
  const expression: IExpression<number> = rsx<number>('a + b')(model);

  console.log(expression.value); // current value

  expression.changed.subscribe(() => {
    console.log(expression.value); // updated value
  });
`;

export default function IExpressionDocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>IExpression</h1>
              <p className='sectionLead'>
                Core runtime representation of a bound expression. Read current
                value from <span className='codeInline'>value</span> and listen
                for updates through <span className='codeInline'>changed</span>.
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs/rsx-function'>
                rsx function <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Description</h2>
              <p className='cardText'>
                <span className='codeInline'>value</span> contains the current
                computed result.
              </p>
              <p className='cardText'>
                <span className='codeInline'>changed</span> emits when tracked
                dependencies change and the expression re-evaluates.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList
                items={[
                  {
                    name: 'T',
                    type: 'generic type parameter',
                    description: 'Current expression value type.',
                  },
                  {
                    name: 'PT',
                    type: 'generic type parameter',
                    description: 'Parent expression value type.',
                  },
                ]}
              />
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                Type contract only. Runtime bindings return an{' '}
                <span className='codeInline'>IExpression&lt;T&gt;</span> instance.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Usage notes</h2>
              <p className='cardText'>
                Use <span className='codeInline'>parent</span>,{' '}
                <span className='codeInline'>childExpressions</span>,{' '}
                <span className='codeInline'>type</span>, and{' '}
                <span className='codeInline'>isRoot</span> to inspect expression
                structure.
              </p>
              <p className='cardText'>
                <span className='codeInline'>type</span> uses{' '}
                <Link href='/docs/expression-type'>ExpressionType</Link>.
              </p>
              <p className='cardText'>
                <span className='codeInline'>changeHook</span> uses{' '}
                <Link href='/docs/change-hook'>ChangeHook</Link>.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Lifecycle</h2>
              <p className='cardText'>
                <span className='codeInline'>IExpression</span> is disposable.
                Call <span className='codeInline'>dispose()</span> when you no
                longer need it.
              </p>
            </article>

            <aside className='qsCodeCard docsApiCode' aria-label='API and usage'>
              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>API</div>
              </div>
              <SyntaxCodeBlock code={apiCode} />

              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Usage example</div>
              </div>
              <SyntaxCodeBlock code={usageCode} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
