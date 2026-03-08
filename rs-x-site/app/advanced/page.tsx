import Link from 'next/link';

export const metadata = {
  title: 'Advanced',
  description: 'Step-by-step technical diagrams for rs-x internals.',
};

export default function AdvancedPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container docsPage'>
          <div className='docsApiHeader advancedHeader'>
            <div>
              <p className='docsApiEyebrow'>Advanced</p>
              <h1 className='sectionTitle'>Expression Creation</h1>
              <p className='sectionLead'>
                Step 1: how <span className='codeInline'>rsx(...)</span> creates an expression instance through
                factory, manager, cache lookup, and parser fallback.
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <div className='advancedLayout'>
            <article className='card docsApiCard advancedSvgCard'>
              <div className='advancedSvgWrap advancedSvgMap'>
                <div className='advancedSvgInner'>
                  <img
                    src='/diagrams/expression-creation-flow.svg'
                    alt='Expression creation flow diagram'
                    className='advancedSvg'
                  />
                </div>
              </div>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>What this flow does</h2>
              <ul className='advancedTopicList'>
                <li>
                  <span className='codeInline'>rsx(expressionString)(model)</span> asks the
                  <span className='codeInline'> IExpressionFactory</span> to create a bound expression.
                </li>
                <li>
                  <span className='codeInline'>ExpressionManager</span> creates the expression for a context (model) once;
                  if the same expression is requested again for that same context, it reuses the existing instance and
                  increments the reference count by 1.
                </li>
                <li>
                  <span className='codeInline'>ExpressionCache</span> is checked first by expression string.
                </li>
                <li>
                  On cache miss, <span className='codeInline'>ExpressionParser</span> parses the expression, builds the tree,
                  and stores that parsed prototype in cache.
                </li>
                <li>
                  For both cache hit and cache miss, rs-x clones the cached prototype and binds that clone to the passed
                  model/context. The final result is a bound <span className='codeInline'>IExpression&lt;T&gt;</span> ready for
                  evaluation and change notifications.
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
