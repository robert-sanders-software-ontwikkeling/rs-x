import { DocsBreadcrumbs } from '../../../components/DocsBreadcrumbs';

export const metadata = {
  title: 'Expression creation',
  description:
    'How rsx(...) creates a bound expression instance through factory, manager, cache, and parser.',
};

const keyPoints = [
  '`rsx(expressionString)(model)` asks `IExpressionFactory` to create a bound expression instance.',
  '`ExpressionManager` creates one expression instance per context and expression and reuses it when requested again for the same context.',
  '`ExpressionCache` is checked first by expression string.',
  'On cache miss, `ExpressionParser` parses the expression, builds the tree, and stores that parsed prototype in cache.',
  'For both cache hit and cache miss, rs-x clones the cached prototype and binds that clone to the passed model/context.',
  'The final result is a bound `IExpression<T>` ready for evaluation and change notifications.',
];

export default function ExpressionCreationPage() {
  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container docsPage">
          <div className="docsApiHeader">
            <div>
              <DocsBreadcrumbs
                items={[
                  { label: 'Docs', href: '/docs' },
                  { label: 'Expression creation' },
                ]}
              />
              <p className="docsApiEyebrow">Advanced</p>
              <h1 className="sectionTitle">Expression creation</h1>
              <p className="sectionLead">
                How <span className="codeInline">rsx(...)</span> creates a bound
                expression instance through factory, manager, cache lookup, and
                parser fallback.
              </p>
            </div>
          </div>

          <div className="docsApiGrid">
            <article className="card docsApiCard advancedSvgCard">
              <div className="advancedSvgWrap advancedSvgMap">
                <div className="advancedSvgInner">
                  <img
                    src="/diagrams/expression-creation-flow.svg"
                    alt="Expression creation flow diagram"
                    className="advancedSvg"
                  />
                </div>
              </div>
            </article>

            <article className="card docsApiCard">
              <h2 className="cardTitle">Detailed notes</h2>
              <ul className="advancedTopicList">
                {keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
