import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

type Topic = 'binding' | 'services' | 'observation' | 'commit';

interface TopicDoc {
  title: string;
  lead: string;
  keyPoints: string[];
  code: string;
}

interface ObservationRow {
  valueType: string;
  mechanism: string;
  detection: string;
  notes: string;
}

const OBSERVATION_ROWS: ObservationRow[] = [
  {
    valueType: 'Plain object property',
    mechanism:
      'Descriptor patching via Object.defineProperty wrapper around getter/setter or method descriptor.',
    detection:
      'Property write calls wrapped setter, emits property-change chain for context + index.',
    notes:
      'Used when value does not require proxy wrapping. Original descriptor is restored on dispose.',
  },
  {
    valueType: 'Array',
    mechanism:
      'Array observer proxy intercepts mutating methods (push/pop/splice/shift/unshift/reverse/sort/fill).',
    detection:
      'Method interception emits index-level changes and affected path updates.',
    notes:
      'Read access still resolves transparently through index accessor chain.',
  },
  {
    valueType: 'Map',
    mechanism:
      'Map observer proxy intercepts set/delete/clear and key lookups.',
    detection:
      'Mutations emit key-scoped changes so map-key identifier dependencies re-evaluate.',
    notes:
      'Map key owner resolver maps identifier path segments to map keys.',
  },
  {
    valueType: 'Set',
    mechanism:
      'Set observer proxy intercepts add/delete/clear and membership reads.',
    detection:
      'Membership mutations emit change notifications for tracked set dependencies.',
    notes:
      'Useful for expressions that depend on membership/size semantics.',
  },
  {
    valueType: 'Date',
    mechanism:
      'Date observer proxy intercepts mutating date methods.',
    detection:
      'Date mutator calls emit changed date-property slices (year/month/day/time etc.).',
    notes:
      'Allows expressions like Date-based comparisons to re-evaluate after mutation.',
  },
  {
    valueType: 'Promise',
    mechanism:
      'Promise observer pair factory tracks resolve path and stores last resolved value through accessor.',
    detection:
      'Resolved value write emits changed event through state manager pipeline.',
    notes:
      'From expression usage, async value reads behave like value reads once resolved.',
  },
  {
    valueType: 'Observable',
    mechanism:
      'Observable observer pair factory subscribes and stores last emitted value through accessor.',
    detection:
      'Each next emission updates stored value and emits deduplicated change notifications.',
    notes:
      'Unsubscribed on dispose/unbind to prevent leaks.',
  },
];

const TOPICS: Record<Topic, TopicDoc> = {
  binding: {
    title: 'Binding flow internals',
    lead:
      'How rsx(expressionString)(model) creates (or reuses from cache) an expression tree, binds it to the model, and manages its lifetime.',
    keyPoints: [
      'rsx(...) resolves IExpressionFactory from InjectionContainer and calls create(context, expressionString, leafRule).',
      'ExpressionManager scopes expression instances per context object and reference-counts them.',
      'ExpressionCache reuses parsed expression structures by expression string.',
      'bind(...) injects ExpressionServices and owner handles, then root commit is triggered through change transaction manager.',
      'IdentifierExpression binds context + index rule and starts state observation immediately.',
    ],
    code: dedent`
      // rs-x-expression-parser/lib/rsx.ts
      export function rsx<TReturn, TModel extends object = object>(
        expressionString: string,
      ) {
        return (model: TModel, leafIndexWatchRule?: IIndexWatchRule) => {
          const expressionFactory = InjectionContainer.get(...IExpressionFactory);
          return expressionFactory.create(model, expressionString, leafIndexWatchRule);
        };
      }

      // expression manager creation path
      ExpressionFactory.create(context, expressionString, rule)
        -> ExpressionManager.create(context)
        -> ExpressionCache.create(expressionString)
        -> expression.bind({ context, services, owner, leafIndexWatchRule: rule })
    `,
  },
  services: {
    title: 'Service wiring across packages',
    lead:
      'How core services, state manager services, and parser services are composed and injected into expressions.',
    keyPoints: [
      'RsXExpressionParserModule loads RsXStateManagerModule, which loads RsXCoreModule.',
      'ExpressionServices injects transactionManager, stateManager, indexValueAccessor, valueMetadata, expressionIdProvider, and identifierOwnerResolver.',
      'DefaultIdentifierOwnerResolver runs a chain: property -> array index -> map key -> global owner.',
      'IndexValueAccessor itself is a priority chain over property/collection/async/global accessor strategies.',
      'ValueMetadata decides if a value is async and if it requires proxy/observer treatment.',
    ],
    code: dedent`
      // expression-services.ts
      constructor(
        transactionManager,
        stateManager,
        indexValueAccessor,
        guidFactory,
        valueMetadata,
        expressionIdProvider,
        identifierOwnerResolver,
      ) {}

      // default identifier owner order
      PropertyOwnerResolver
      -> ArrayIndexOwnerResolver
      -> MapKeyOwnerResolver
      -> GlobalIdentifierOwnerResolver
    `,
  },
  observation: {
    title: 'Observation by data type',
    lead:
      'How rs-x observes value changes differently per runtime type (descriptor patching, proxies, or async observers).',
    keyPoints: [
      'Proxy/descriptor factories are built on the core SingletonFactory abstraction and reuse one instance per target id.',
      'Proxy/descriptor instrumentation is applied once per observed target; rs-x reuses the same observer/proxy pair for additional bindings.',
      'Reuse is reference-counted: each additional consumer increments ownership, and dispose/unbind decrements it.',
      'When reference count reaches zero, rs-x releases the observer/proxy pair and restores original descriptors where applicable.',
      'Plain object properties use descriptor patching through Object.defineProperty wrappers.',
      'Array/Map/Set/Date use dedicated proxy factories that intercept mutating operations.',
      'Promise/Observable use observer-style tracking (then/subscribe) and store last value via accessors.',
      'StateManager merges all these sources into changed/contextChanged streams.',
      'Nested object references are rebound when path contexts change, preserving dependency tracking.',
    ],
    code: dedent`
      // Core mechanism: factories extend SingletonFactory<TId, TData, TInstance>.
      // The target object (array/map/set/date/object+property scope) is the id.

      // 1) On bind/watch, StateManager asks the relevant factory to create(...)
      //    (ArrayProxyFactory, MapProxyFactory, ObjectPropertyObserverManager, ...).
      const { id, instance, referenceCount } = factory.create(data);
      // If referenceCount === 1 => createInstance(...) ran just now.
      // If referenceCount > 1  => existing instrumented instance was reused.

      // 2) createInstance(...) does the one-time instrumentation work:
      //    - proxy-based types: create Proxy(target, handler) + register in IProxyRegistry
      //    - plain object properties: patch descriptor(s) once and wrap setter/getter/method path

      // 3) On mutation/emission, observer emits IPropertyChange into StateManager.
      //    StateManager emits changed/contextChanged/startChangeCycle/endChangeCycle.

      // 4) On dispose/unbind, owner releases the singleton instance id.
      const releaseResult = factory.release(id);
      // releaseResult.referenceCount decremented by 1.
      // when it reaches 0, releaseInstance(...) runs and tears down instrumentation:
      //    - unregister proxy from IProxyRegistry
      //    - restore original descriptors for patched properties

      // 5) Expression pipeline reacts after state events:
      //    identifier update -> transaction commit -> root.changed
    `,
  },
  commit: {
    title: 'Commit and reevaluation pipeline',
    lead:
      'How mutations become a consolidated expression.changed emission through transaction-based commit handling.',
    keyPoints: [
      'Property/object observers emit IPropertyChange into StateManager.',
      'StateManager emits startChangeCycle/endChangeCycle and changed events.',
      'IdentifierExpression updates local value and registers commit handlers on the evaluation root.',
      'ExpressionChangeTransactionManager batches changes during the cycle and commits when cycle depth returns to zero.',
      'Commit reevaluates bottom-to-top; root expression then emits changed once with final value.',
    ],
    code: dedent`
      // transaction manager behavior
      suspend();
      // multiple model mutations...
      continue(); // unsuspend + commit()

      // cycle-driven auto-commit
      onStartChangeCycle() { counter++; }
      onEndChangeCycle() {
        counter--;
        if (counter === 0 && !suspended) commit();
      }
    `,
  },
};

export function generateStaticParams() {
  return Object.keys(TOPICS).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const entry = TOPICS[topic as Topic];
  if (!entry) {
    return {
      title: 'Advanced',
    };
  }
  return {
    title: `Advanced: ${entry.title}`,
    description: entry.lead,
  };
}

export default async function AdvancedTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const entry = TOPICS[topic as Topic];
  if (!entry) {
    notFound();
  }

  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>Advanced</p>
              <h1 className='sectionTitle'>{entry.title}</h1>
              <p className='sectionLead'>{entry.lead}</p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/advanced'>
                Back to Advanced <span aria-hidden='true'>→</span>
              </Link>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Detailed notes</h2>
              <ul className='advancedTopicList'>
                {entry.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>

            {topic === 'observation' && (
              <article className='card docsApiCard advancedMatrixCard'>
                <h2 className='cardTitle'>Change detection by value type</h2>
                <p className='cardText'>
                  rs-x selects the observation strategy per runtime value type.
                  The table below summarizes how mutation is detected and pushed
                  into the state/change pipeline.
                </p>
                <p className='cardText'>
                  Instrumentation is not re-applied on every bind. For the same
                  observed target, rs-x reuses the existing proxy/descriptor
                  wrapper and tracks usage with reference counting. New binds
                  increment the count; dispose/unbind decrements it; when the
                  count reaches zero, rs-x tears down observation and restores
                  original state where needed.
                </p>
                <p className='cardText'>
                  Related APIs: <Link href='/docs/iproxy-registry'>IProxyRegistry</Link>{' '}
                  and <Link href='/docs/singleton-factory'>SingletonFactory</Link>.
                </p>
                <div className='comparisonWrap advancedMatrixWrap'>
                  <table className='comparisonTable'>
                    <thead>
                      <tr>
                        <th>Value type</th>
                        <th>Mechanism</th>
                        <th>How change is detected</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OBSERVATION_ROWS.map((row) => (
                        <tr key={row.valueType}>
                          <td>{row.valueType}</td>
                          <td>{row.mechanism}</td>
                          <td>{row.detection}</td>
                          <td>{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            <aside className='qsCodeCard docsApiCode' aria-label='Technical flow snippet'>
              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Technical flow snippet</div>
              </div>
              <SyntaxCodeBlock code={entry.code} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
