import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'AbstractExpression',
  description: 'Base abstract class for all expression tree nodes in @rs-x/expression-parser.',
};

const apiCode = dedent`
  export abstract class AbstractExpression<T = unknown, PT = unknown>
    implements IExpression<T> {
    public abstract clone(): this;
    public bind(settings: IExpressionBindConfiguration): AbstractExpression;
    protected abstract evaluate(
      sender: AbstractExpression,
      root: AbstractExpression,
    ): T | undefined;
  }
`;

const usageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';

  const model = { a: 10, b: 20 };
  const expression = rsx<number>('a + b')(model);

  // In application code you usually consume IExpression,
  // while runtime internals use AbstractExpression subclasses.
  console.log(expression.value);
`;

export default function AbstractExpressionDocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>AbstractExpression</h1>
              <p className='sectionLead'>
                Internal runtime base class for parser node implementations (Identifier, Member, Binary,
                Function, and others). It owns bind/evaluate lifecycle and commit wiring.
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
              <h2 className='cardTitle'>What it does</h2>
              <p className='cardText'>
                Provides common expression-tree behavior: child-parent hierarchy, bind lifecycle, value
                storage, change emission, and transaction-manager integration.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList
                items={[
                  {
                    name: 'T',
                    type: 'generic type parameter',
                    description: 'Current node evaluation result type.',
                  },
                  {
                    name: 'PT',
                    type: 'generic type parameter',
                    description: 'Parent expression value type.',
                  },
                  {
                    name: 'settings',
                    type: 'IExpressionBindConfiguration',
                    description: 'Services/owner/rules used to bind an expression to a model context.',
                  },
                ]}
              />
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                <span className='codeInline'>bind(...)</span> returns the bound{' '}
                <span className='codeInline'>AbstractExpression</span> instance.
              </p>
              <p className='cardText'>
                <span className='codeInline'>evaluate(...)</span> returns{' '}
                <span className='codeInline'>T | undefined</span>.
              </p>
            </article>

            <aside className='qsCodeCard docsApiCode' aria-label='AbstractExpression API and usage'>
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

