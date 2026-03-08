import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'IIndexWatchRule',
  description:
    'Rule contract for controlling which leaf index accesses are watched by rs-x/state-manager.',
};

const apiCode = dedent`
  export interface IIndexWatchRule {
    context: unknown;
    test(index: unknown, target: unknown): boolean;
  }
`;

const usageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  const watchRule: IIndexWatchRule = {
    context: { allow: new Set(['a', 'b']) },
    test(index) {
      return this.context.allow.has(String(index));
    },
  };

  const model = { a: 1, b: 2, c: 3 };
  const expression = rsx<number>('a + b')(model, watchRule);
`;

export default function IndexWatchRuleDocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>IIndexWatchRule</h1>
              <p className='sectionLead'>
                Controls whether a leaf index access should be observed. Useful for narrowing
                subscription scope in dynamic index/member scenarios.
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs/rsx-function'>
                rsx function <span aria-hidden='true'>→</span>
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
                The rule decides if a specific <span className='codeInline'>index</span> on a{' '}
                <span className='codeInline'>target</span> should be watched for changes.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList
                items={[
                  {
                    name: 'context',
                    type: 'unknown',
                    description: 'User-defined context object used by your test logic.',
                  },
                  {
                    name: 'index',
                    type: 'unknown',
                    description: 'Current index/property key being evaluated for observation.',
                  },
                  {
                    name: 'target',
                    type: 'unknown',
                    description: 'Current owner object/collection containing the index.',
                  },
                ]}
              />
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                <span className='codeInline'>test(...)</span> returns{' '}
                <span className='codeInline'>boolean</span>.
              </p>
            </article>

            <aside className='qsCodeCard docsApiCode' aria-label='IIndexWatchRule API and usage'>
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

