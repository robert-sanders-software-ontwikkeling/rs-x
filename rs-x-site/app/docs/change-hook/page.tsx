import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'ChangeHook',
  description: 'Callback type used by IExpression.changeHook.',
};

const apiCode = dedent`
  export type ChangeHook = (expression: IExpression, oldValue: unknown) => void;
`;

const usageCode = dedent`
  import { rsx, type ChangeHook } from '@rs-x/expression-parser';

  const expression = rsx<number>('a + b')({ a: 1, b: 2 });

  const hook: ChangeHook = (changedExpression, oldValue) => {
    console.log('old:', oldValue);
    console.log('new:', changedExpression.value);
  };

  expression.changeHook = hook;
`;

export default function ChangeHookDocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>ChangeHook</h1>
              <p className='sectionLead'>
                <span className='codeInline'>ChangeHook</span> is an optional
                callback on <span className='codeInline'>IExpression</span> that
                receives the changed expression and previous value.
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs/iexpression'>
                IExpression <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Description</h2>
              <p className='cardText'>
                Called after an expression value changes. Use it for local side effects
                tied to one expression instance.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList
                items={[
                  {
                    name: 'expression',
                    type: 'IExpression',
                    typeHref: '/docs/iexpression',
                    description: 'Expression instance that changed.',
                  },
                  {
                    name: 'oldValue',
                    type: 'unknown',
                    description: 'Value before the update.',
                  },
                ]}
              />
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                <span className='codeInline'>void</span>
              </p>
            </article>

            <aside className='qsCodeCard docsApiCode' aria-label='ChangeHook API and usage'>
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
