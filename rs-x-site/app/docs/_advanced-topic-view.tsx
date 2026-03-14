import dedent from 'dedent';
import Link from 'next/link';

import { LeftAccentCard } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../components/DocsBreadcrumbs';
import { SyntaxCodeBlock } from '../../components/SyntaxCodeBlock';
import { githubSourceHref } from '../../lib/github-source-links';

import { ObservationMatrixTable } from './observation-matrix-table.client';

export type AdvancedTopic =
  | 'observation'
  | 'async-operations'
  | 'modular-expressions'
  | 'commit';

interface TopicDoc {
  title: string;
  lead: string;
  keyPoints: string[];
  codeSteps: {
    title: string;
    code?: string;
    sourceLinks?: Array<{
      label: string;
      href: string;
    }>;
    subSteps?: {
      title: string;
      description?: string;
      code: string;
    }[];
  }[];
}

interface ObservationRow {
  valueType: string;
  href: string;
  mechanism: string;
  isAsync: boolean;
  detection: string;
}

const OBSERVATION_ROWS: ObservationRow[] = [
  {
    valueType: 'Plain object property',
    href: '/docs/observation/plain-object-property',
    mechanism: 'Patching',
    isAsync: false,
    detection:
      'Property writes hit patched descriptors and emit changes; with IndexWatchRule, matching nested members are observed recursively.',
  },
  {
    valueType: 'Array',
    href: '/docs/observation/array',
    mechanism: 'Proxy',
    isAsync: false,
    detection:
      'Array mutations emit index-level changes; with IndexWatchRule, matching items are observed recursively.',
  },
  {
    valueType: 'Map',
    href: '/docs/observation/map',
    mechanism: 'Proxy',
    isAsync: false,
    detection:
      'Map mutations emit key-level changes; with IndexWatchRule, matching entry values are observed recursively.',
  },
  {
    valueType: 'Set',
    href: '/docs/observation/set',
    mechanism: 'Proxy',
    isAsync: false,
    detection:
      'Set membership mutations emit member-level changes; with IndexWatchRule, matching members are observed recursively.',
  },
  {
    valueType: 'Date',
    href: '/docs/observation/date',
    mechanism: 'Proxy',
    isAsync: false,
    detection:
      'Date setter calls emit date-part changes; with IndexWatchRule, only matching date properties are emitted.',
  },
  {
    valueType: 'Expression (AbstractExpression)',
    href: '/docs/modular-expressions',
    mechanism: 'Observer (changed event)',
    isAsync: true,
    detection:
      'When an expression value changes, the change flows through state manager so dependent expressions re-evaluate.',
  },
  {
    valueType: 'Promise',
    href: '/docs/observation/promise',
    mechanism: 'Observer (then)',
    isAsync: true,
    detection:
      'When a promise resolves, the resolved value is stored and the change flows through state manager.',
  },
  {
    valueType: 'Observable',
    href: '/docs/observation/observable',
    mechanism: 'Observer (subscribe)',
    isAsync: true,
    detection:
      'Each observable emission updates the stored value, and the change flows through state manager.',
  },
];

const TOPICS: Record<AdvancedTopic, TopicDoc> = {
  observation: {
    title: 'Observation by data type',
    lead: 'How rs-x observes value changes differently per runtime type (descriptor patching, proxies, or async observers).',
    keyPoints: [
      'Proxy/descriptor factories are built on the core KeyedInstanceFactory abstraction and reuse one instance per target id.',
      'Proxy/descriptor instrumentation is applied once per observed target; rs-x reuses the same observer/proxy pair for additional bindings.',
      'Reuse is reference-counted: each additional consumer increments ownership, and dispose/unbind decrements it.',
      'When reference count reaches zero, rs-x releases the observer/proxy pair, restores patched descriptors, and writes proxified property values back to raw values.',
      'Plain object properties use descriptor patching through Object.defineProperty wrappers.',
      'Array/Map/Set/Date use dedicated proxy factories that intercept mutating operations.',
      'Promise/Observable use observer-style tracking (then/subscribe) and store last value via accessors.',
      'State manager merges all these sources into changed/contextChanged streams.',
      'Nested object references are rebound when path contexts change, preserving dependency tracking.',
    ],
    codeSteps: [],
  },
  'async-operations': {
    title: 'Async operations',
    lead: 'How rs-x unifies Promise, Observable, and Expression updates into one consistent observation and commit pipeline.',
    keyPoints: [
      'There is no separate async API mode: Promise, Observable, and Expression values go through the same observation pipeline as other values.',
      'Metadata is used at concrete decision points: ValueMetadata.isAsync(...) is checked in indexed observer factories to attach async observers, and ValueMetadata.needsProxy(...) is checked in IdentifierExpression to decide recursive proxying for member paths.',
      'PENDING is internal runtime state used while async values are unresolved; it is not a user-facing expression value.',
      'Promise observers cache resolved values and emit property changes when resolution arrives.',
      'Observable observers cache emissions, dedupe consecutive equal values, and emit through state manager.',
      'Expression observers forward expression.changed into the same property-change pipeline used by Promise/Observable.',
      'State manager wraps async updates in startChangeCycle/endChangeCycle, and transaction commit is deferred until cycle depth returns to zero.',
    ],
    codeSteps: [
      {
        title: 'Step 1: classify async value types',
        sourceLinks: [
          {
            label: 'ValueMetadata dispatcher',
            href: githubSourceHref(
              '@rs-x/core',
              'value-metadata/value-metadata.ts',
            ),
          },
          {
            label: 'PromiseMetadata',
            href: githubSourceHref(
              '@rs-x/core',
              'value-metadata/promise-metadata.ts',
            ),
          },
          {
            label: 'ObservableMetadata',
            href: githubSourceHref(
              '@rs-x/core',
              'value-metadata/observable-metadata.ts',
            ),
          },
          {
            label: 'ExpressionMetadata registration',
            href: githubSourceHref(
              '@rs-x/expression-parser',
              'rs-x-expression-parser.module.ts',
            ),
          },
          {
            label: 'PromiseAccessor',
            href: githubSourceHref(
              '@rs-x/core',
              'index-value-accessor/promise-accessor.ts',
            ),
          },
          {
            label: 'ObservableAccessor',
            href: githubSourceHref(
              '@rs-x/core',
              'index-value-accessor/observable-accessor.ts',
            ),
          },
        ],
        subSteps: [
          {
            title: 'Metadata marks values as async/proxy-aware',
            code: dedent`
              @Injectable()
              export class ExpressionMetadata implements IValueMetadata {
                public readonly priority = 300;

                public isAsync(): boolean {
                  return true;
                }

                public needsProxy(): boolean {
                  return true;
                }

                public applies(value: unknown): boolean {
                  return value instanceof AbstractExpression;
                }
              }
            `,
          },
          {
            title: 'Accessor fallback uses internal PENDING',
            code: dedent`
              // Promise/Observable accessor pattern (simplified)
              const cached = accessor.getResolvedValue(context, index);
              return cached === undefined ? PENDING : cached;
            `,
          },
        ],
      },
      {
        title: 'Step 2: observe async sources',
        sourceLinks: [
          {
            label: 'Promise observer implementation',
            href: githubSourceHref(
              '@rs-x/state-manager',
              'proxies/promise-proxy/promise-proxy.factory.ts',
            ),
          },
          {
            label: 'Observable observer implementation',
            href: githubSourceHref(
              '@rs-x/state-manager',
              'proxies/observable-proxy/observable-proxy.factory.ts',
            ),
          },
          {
            label: 'Expression observer proxy factory',
            href: githubSourceHref(
              '@rs-x/expression-parser',
              'expression-observer/expression-observer-proxy-pair.factory.ts',
            ),
          },
        ],
        subSteps: [
          {
            title: 'Promise resolution updates cache + emits change',
            code: dedent`
              target.then((resolved) => {
                this._promiseAccessor.setValue(context, index, resolved);
                this.emitChange({
                  chain: [{ context, index }],
                  target: context,
                  index,
                  newValue: resolved,
                });
              });
            `,
          },
          {
            title: 'Observable next(value) follows same pipeline',
            code: dedent`
              this._subscription = observable.subscribe((value) => {
                if (this._equalityService.isEqual(this.value, value)) return;
                this._observableAccessor.setValue(context, index, value);
                this.emitChange({
                  chain: [{ context, index }],
                  target: context,
                  index,
                  newValue: value,
                });
              });
            `,
          },
        ],
      },
      {
        title: 'Step 3: defer commit until data is ready',
        sourceLinks: [
          {
            label: 'AbstractExpression (PENDING handling)',
            href: githubSourceHref(
              '@rs-x/expression-parser',
              'expressions/abstract-expression.ts',
            ),
          },
          {
            label: 'ExpressionChangeTransactionManager',
            href: githubSourceHref(
              '@rs-x/expression-parser',
              'expresion-change-transaction-manager.ts',
            ),
          },
          {
            label: 'StateManager change-cycle wiring',
            href: githubSourceHref(
              '@rs-x/state-manager',
              'state-manager/state-manager.ts',
            ),
          },
        ],
        subSteps: [
          {
            title: 'Internal PENDING pauses the current reevaluation pass',
            code: dedent`
              protected evaluateBottomToTop(...): boolean {
                const value = this.evaluate(sender, root);
                if (value === PENDING) {
                  return false;
                }
                this._value = value;
                return this.parent ? this.parent.reevaluated(...) : true;
              }
            `,
          },
          {
            title: 'Commit runs after change-cycle depth returns to zero',
            code: dedent`
              onEndChangeCycle() {
                counter--;
                if (counter === 0 && !suspended) commit();
              }
            `,
          },
        ],
      },
    ],
  },
  'modular-expressions': {
    title: 'Modular expression implementation',
    lead: 'rs-x is a highly extendable framework: you can add support for custom data types without rewriting the runtime core. Modular expression support was added in exactly that way, by introducing a focused plugin set for the Expression value type.',
    keyPoints: [
      'rs-x was built to be extended and adaptable. It has extension points for value access, value metadata, observer factories, and deep-clone value handling, so we can add a new value type without changing the runtime core.',
      'First, ExpressionMetadata tells the runtime that AbstractExpression is a supported value type and that it should be handled as async/proxy-aware.',
      'Next, ExpressionIndexAccessor defines how expression members are read (`expression.value`) and intentionally blocks direct `setValue` writes.',
      'Then, ExpressionObserverFactory provides one reusable observer per expression and forwards `expression.changed` events into state-manager change events.',
      'After that, ExpressionObserverProxyPairFactory connects expression objects to the observer pipeline by handling values that are `AbstractExpression` instances and delegating observer creation to `IExpressionObserverFactory`.',
      'Finally, DeepCloneExceptWithExpressionSupport makes clone/evaluation paths unwrap `expression.value` (or `PENDING` when unresolved), so modular expressions compose correctly with other values.',
      'Result: modular expressions behave like a native runtime value type and participate fully in tracking, observation, and evaluation flows.',
    ],
    codeSteps: [
      {
        title: 'Step 1: ExpressionMetadata',
        subSteps: [
          {
            title: 'Plugin implementation',
            code: dedent`
              @Injectable()
              export class ExpressionMetadata implements IValueMetadata {
                public readonly priority = 300;

                public isAsync(): boolean {
                  return true;
                }

                public needsProxy(): boolean {
                  return true;
                }

                public applies(value: unknown): boolean {
                  return value instanceof AbstractExpression;
                }
              }
            `,
          },
          {
            title: 'Module registration',
            code: dedent`
              overrideMultiInjectServices(
                options,
                RsXCoreInjectionTokens.IValueMetadataList,
                [
                  {
                    target: ExpressionMetadata,
                    token: RsXExpressionParserInjectionTokens.ExpressiomMetadata,
                  },
                  ...defaultValueMetadataList,
                ],
              );
            `,
          },
        ],
      },
      {
        title: 'Step 2: ExpressionIndexAccessor',
        subSteps: [
          {
            title: 'Plugin implementation',
            code: dedent`
              @Injectable()
              export class ExpressionIndexAccessor implements IExpressionIndexAccessor {
                public readonly priority!: 300;

                public getResolvedValue(context: unknown, index: string): unknown {
                  return Type.cast<IExpression>((Type.toObject(context) ?? {})[index])?.value;
                }

                public hasValue(context: unknown, index: string): boolean {
                  return Type.cast<IExpression>((Type.toObject(context) ?? {})[index])?.value !== undefined;
                }

                public getValue(context: unknown, index: string): unknown {
                  return (Type.toObject(context) ?? {})[index];
                }

                public setValue(): void {
                  throw new UnsupportedException(
                    'Cannot set the value of an expression directly. To update it, modify the relevant properties in the expression context.',
                  );
                }

                public getIndexes(): IterableIterator<string> {
                  return [].values();
                }

                public applies(context: unknown, index: string): boolean {
                  return (Type.toObject(context) ?? {})[index] instanceof AbstractExpression;
                }
              }
            `,
          },
          {
            title: 'Module registration',
            code: dedent`
              overrideMultiInjectServices(
                options,
                RsXCoreInjectionTokens.IIndexValueAccessorList,
                [
                  {
                    target: ExpressionIndexAccessor,
                    token: RsXExpressionParserInjectionTokens.IExpressionIndexAccessor,
                  },
                  ...defaultIndexValueAccessorList,
                ],
              );
            `,
          },
        ],
      },
      {
        title: 'Step 3: IExpressionObserverFactory',
        subSteps: [
          {
            title: 'Factory contract',
            code: dedent`
              export interface IExpressionObserverData {
                owner?: IDisposableOwner;
                expression: AbstractExpression;
              }

              export type IExpressionObserverFactory = IKeyedInstanceFactory<
                AbstractExpression,
                IExpressionObserverData,
                IObserver
              >;
            `,
          },
          {
            title: 'Implementation details',
            code: dedent`
              @Injectable()
              export class ExpressionObserverFactory
                extends KeyedInstanceFactory<
                  AbstractExpression,
                  IExpressionObserverData,
                  IObserver
                >
                implements IExpressionObserverFactory
              {
                public override getId(data: IExpressionObserverData): AbstractExpression {
                  return data.expression;
                }

                protected override createId(data: IExpressionObserverData): AbstractExpression {
                  return data.expression;
                }

                protected override createInstance(
                  data: IExpressionObserverData,
                  id: AbstractExpression,
                ): IObserver {
                  return new ExpressionObserver(
                    {
                      canDispose: () => this.getReferenceCount(id) === 1,
                      release: () => {
                        this.release(id);
                        data.owner?.release();
                      },
                    },
                    data.expression,
                  );
                }

                protected override releaseInstance(observer: IObserver): void {
                  observer.dispose();
                }
              }
            `,
          },
          {
            title: 'ExpressionObserver implementation',
            code: dedent`
              class ExpressionObserver extends AbstractObserver<
                AbstractExpression,
                undefined,
                undefined
              > {
                private readonly _changedSubsctiption: Subscription;

                constructor(owner: IDisposableOwner, target: AbstractExpression) {
                  super(owner, target, undefined, new ReplaySubject<IPropertyChange>(1));
                  this._changedSubsctiption = target.changed.subscribe(
                    this.onExpressionChanged,
                  );
                }

                protected override disposeInternal(): void {
                  this._changedSubsctiption.unsubscribe();
                }

                private onExpressionChanged = (expression: IExpression): void => {
                  this.emitChange({
                    arguments: [],
                    chain: [],
                    target: this.target,
                    newValue: expression.value,
                  });
                };
              }
            `,
          },
          {
            title: 'DI registration',
            code: dedent`
              options
                .bind<IExpressionObserverFactory>(
                  RsXExpressionParserInjectionTokens.IExpressionObserverFactory,
                )
                .to(ExpressionObserverFactory)
                .inSingletonScope();
            `,
          },
        ],
      },
      {
        title: 'Step 4: ExpressionObserverProxyPairFactory',
        subSteps: [
          {
            title: 'Factory contract',
            code: dedent`
              export type IExpressionObserverProxyPairFactory =
                IObjectObserverProxyPairFactory<AbstractExpression>;
            `,
          },
          {
            title: 'Plugin implementation',
            code: dedent`
              @Injectable()
              export class ExpressionObserverProxyPairFactory implements IExpressionObserverProxyPairFactory {
                public readonly priority = 100;

                constructor(
                  @Inject(RsXExpressionParserInjectionTokens.IExpressionObserverFactory)
                  private readonly _expressionObserverFactory: IExpressionObserverFactory,
                ) {}

                public create(
                  owner: IDisposableOwner,
                  proxyTarget: IProxyTarget<AbstractExpression>,
                ): IExpressionObserverProxyPair {
                  return {
                    observer: this._expressionObserverFactory.create({
                      owner,
                      expression: proxyTarget.target,
                    }).instance,
                  };
                }

                public applies(object: unknown): boolean {
                  return object instanceof AbstractExpression;
                }
              }
            `,
          },
          {
            title: 'Module registration',
            code: dedent`
              overrideMultiInjectServices(
                options,
                RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
                [
                  {
                    target: ExpressionObserverProxyPairFactory,
                    token:
                      RsXExpressionParserInjectionTokens.IExpressionObserverProxyPairFactory,
                  },
                  ...defaultObjectObserverProxyPairFactoryList,
                ],
              );
            `,
          },
        ],
      },
      {
        title: 'Step 5: deep-clone support',
        subSteps: [
          {
            title: 'Deep clone plugin implementation',
            code: dedent`
              @Injectable()
              export class DeepCloneExceptWithExpressionSupport implements IDeepCloneExcept {
                constructor(
                  @Inject(RsXCoreInjectionTokens.IDeepCloneExcept)
                  private readonly _defaultDeepCloneValueGetter: IDeepCloneExcept,
                ) {}

                public except(source: unknown): unknown {
                  if (source instanceof AbstractExpression) {
                    return source.value === undefined ? PENDING : source.value;
                  }

                  return this._defaultDeepCloneValueGetter.except(source);
                }
              }
            `,
          },
          {
            title: 'Deep clone module wiring',
            code: dedent`
              options.unbind(RsXCoreInjectionTokens.DefaultDeepCloneExcept);
              options
                .bind<IDeepCloneExcept>(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
                .to(DeepCloneExceptWithExpressionSupport)
                .inSingletonScope();
            `,
          },
        ],
      },
    ],
  },
  commit: {
    title: 'Commit and reevaluation pipeline',
    lead: 'How mutations become a consolidated expression.changed emission through transaction-based commit handling.',
    keyPoints: [
      'Property/object observers emit IPropertyChange into state manager.',
      'State manager emits startChangeCycle/endChangeCycle and changed events.',
      'IdentifierExpression updates local value and registers commit handlers on the evaluation root.',
      'ExpressionChangeTransactionManager batches changes during the cycle and commits when cycle depth returns to zero.',
      'Commit reevaluates bottom-to-top; root expression then emits changed once with final value.',
    ],
    codeSteps: [
      {
        title: 'Step 1: suspend and continue',
        code: dedent`
          // transaction manager behavior
          suspend();
          // multiple model mutations...
          continue(); // unsuspend + commit()
        `,
      },
      {
        title: 'Step 2: auto-commit when cycle ends',
        code: dedent`
          onStartChangeCycle() { counter++; }
          onEndChangeCycle() {
            counter--;
            if (counter === 0 && !suspended) commit();
          }
        `,
      },
    ],
  },
};

export function getAdvancedTopicMetadata(topic: AdvancedTopic) {
  const entry = TOPICS[topic];
  return {
    title: `Advanced: ${entry.title}`,
    description: entry.lead,
  };
}

export function renderAdvancedTopicPage(topic: AdvancedTopic) {
  const entry = TOPICS[topic];
  const useModularStepAccent = topic === 'modular-expressions';

  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container">
          <div className="docsApiHeader">
            <div>
              <DocsBreadcrumbs
                items={[
                  { label: 'Docs', href: '/docs' },
                  { label: entry.title },
                ]}
              />
              <p className="docsApiEyebrow">Advanced</p>
              <h1 className="sectionTitle">{entry.title}</h1>
              <p className="sectionLead">{entry.lead}</p>
              {topic === 'modular-expressions' && (
                <p className="cardText">
                  See also:{' '}
                  <Link href="/docs/core-concepts/modular-expressions">
                    Core concepts: Modular expressions
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div className="docsApiGrid">
            {topic !== 'observation' && (
              <article className="card docsApiCard">
                <h2 className="cardTitle">Detailed notes</h2>
                <ul className="advancedTopicList">
                  {entry.keyPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            )}

            {topic === 'observation' && (
              <article className="card docsApiCard advancedMatrixCard">
                <h2 className="cardTitle">Change detection by value type</h2>
                <p className="cardText">
                  rs-x selects the observation strategy per runtime value type.
                  The table below summarizes how mutation is detected and pushed
                  into the state/change pipeline.
                </p>
                <p className="cardText">
                  Recursive member observation is opt-in via{' '}
                  <Link href="/docs/index-watch-rule">
                    <span className="codeInline">IIndexWatchRule</span>
                  </Link>
                  , passed either to state manager{' '}
                  <span className="codeInline">watchState(...)</span> or as{' '}
                  <span className="codeInline">leafIndexWatchRule</span> in{' '}
                  <Link href="/docs/rsx-function">
                    <span className="codeInline">rsx(...)</span>
                  </Link>
                  . The rule is evaluated per{' '}
                  <span className="codeInline">(index, target)</span>; when it
                  returns true, rs-x installs nested observers/proxies and
                  rebinds them if a member value is replaced. Without a watch
                  rule, only root assignments/mutations are observed.
                </p>
                <p className="cardText">
                  rs-x does not set up observation again on every bind. For the
                  same observed target, it reuses the existing observation setup
                  and tracks usage with reference counting. New binds increment
                  the count; dispose/unbind decrements it; when the count
                  reaches zero, rs-x tears down observation, restores patched
                  descriptors, and writes proxified property values back to
                  their raw (unproxified) value.
                </p>
                <ObservationMatrixTable rows={OBSERVATION_ROWS} />
              </article>
            )}

            {topic !== 'observation' && entry.codeSteps.length > 0 && (
              <aside
                className="qsCodeCard docsApiCode"
                aria-label="Technical flow steps"
              >
                <div className="advancedCodeStepList">
                  {entry.codeSteps.map((step) => {
                    const stepClassName = useModularStepAccent
                      ? 'advancedCodeStep advancedCodeStepWithOuterEdge'
                      : 'advancedCodeStep';
                    const stepContent = (
                      <>
                        <header className="advancedCodeStepHeader">
                          <h3 className="advancedCodeStepTitle">
                            {step.title}
                          </h3>
                        </header>
                        {step.sourceLinks && step.sourceLinks.length > 0 && (
                          <p className="cardText">
                            Code links:{' '}
                            {step.sourceLinks.map((source, sourceIndex) => (
                              <span key={`${step.title}-${source.label}`}>
                                {sourceIndex > 0 ? ' · ' : ''}
                                <Link
                                  href={source.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {source.label}
                                </Link>
                              </span>
                            ))}
                          </p>
                        )}
                        {step.subSteps?.length ? (
                          <div className="advancedCodeSubStepList">
                            {step.subSteps.map((subStep) => (
                              <div
                                key={`${step.title}-${subStep.title}`}
                                className="advancedCodeSubStep"
                              >
                                <div className="qsCodeHeader">
                                  <div className="qsCodeTitle">
                                    {subStep.title}
                                  </div>
                                </div>
                                {subStep.description && (
                                  <p className="cardText advancedCodeSubStepDescription">
                                    {subStep.description}
                                  </p>
                                )}
                                <SyntaxCodeBlock code={subStep.code} />
                              </div>
                            ))}
                          </div>
                        ) : step.code ? (
                          <SyntaxCodeBlock code={step.code} />
                        ) : null}
                      </>
                    );

                    if (useModularStepAccent) {
                      return (
                        <LeftAccentCard
                          key={step.title}
                          as="section"
                          tone="brand"
                          className={stepClassName}
                        >
                          {stepContent}
                        </LeftAccentCard>
                      );
                    }

                    return (
                      <section key={step.title} className={stepClassName}>
                        {stepContent}
                      </section>
                    );
                  })}
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
