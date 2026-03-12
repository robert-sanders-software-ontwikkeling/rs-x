import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

type RelatedLink = {
  href: string;
  title: string;
  meta: string;
};

type CoreConceptExample = {
  title: string;
  description: string;
  code: string;
  playgroundScript?: string;
};

type CoreConceptDoc = {
  slug: string;
  title: string;
  lead: string;
  whatItMeans: string;
  whyItMatters: string;
  keyPoints: string[];
  deepDive?: Array<{
    title: string;
    paragraphs: string[];
  }>;
  exampleCode?: string;
  playgroundScript?: string;
  examples?: CoreConceptExample[];
  related: RelatedLink[];
};

const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

const asyncPromiseExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: Promise.resolve(20),
  };

  const sum = rsx<number>('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };
`;

const asyncPromisePlaygroundScript = dedent`
  const rsx = api.rsx;

  const model = {
    a: 10,
    b: Promise.resolve(20),
  };

  const sum = rsx('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };

  return sum;
`;

const asyncObservableExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { BehaviorSubject } from 'rxjs';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: new BehaviorSubject(20),
  };

  const sum = rsx<number>('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b.next(model.b.value + randomInt(3, 12));
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };
`;

const asyncObservablePlaygroundScript = dedent`
  const $ = api.rxjs;
  const rsx = api.rsx;

  const model = {
    a: 10,
    b: new $.BehaviorSubject(20),
  };

  const sum = rsx('a + b')(model);
  const sumChangedSubscription = sum.changed.subscribe(() => {
    console.log('sum:', sum.value);
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const aInterval = setInterval(() => {
    model.a = randomInt(5, 25);
  }, 2000);

  const bInterval = setInterval(() => {
    model.b.next(model.b.value + randomInt(3, 12));
  }, 4000);

  const originalDispose = sum.dispose.bind(sum);
  let disposed = false;
  sum.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(aInterval);
    clearInterval(bInterval);
    sumChangedSubscription.unsubscribe();
    originalDispose();
  };

  return sum;
`;

const asyncExpressionValueExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const partialModel = {
    base: 10,
    bonus: Promise.resolve(20),
  };

  const partial = rsx<number>('base + bonus')(partialModel);
  const totalModel = {
    a: 5,
    partial,
  };
  const total = rsx<number>('a + partial')(totalModel);

  const totalChangedSubscription = total.changed.subscribe(() => {
    console.log('total:', total.value);
  });

  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const baseInterval = setInterval(() => {
    partialModel.base = randomInt(5, 25);
  }, 2000);

  const bonusInterval = setInterval(() => {
    partialModel.bonus = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const totalInterval = setInterval(() => {
    totalModel.a = randomInt(1, 10);
  }, 6000);

  const originalDispose = total.dispose.bind(total);
  let disposed = false;
  total.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(baseInterval);
    clearInterval(bonusInterval);
    clearInterval(totalInterval);
    totalChangedSubscription.unsubscribe();
    originalDispose();
  };
`;

const asyncExpressionValuePlaygroundScript = dedent`
  const rsx = api.rsx;

  const partialModel = {
    base: 10,
    bonus: Promise.resolve(20),
  };

  const partial = rsx('base + bonus')(partialModel);
  const totalModel = {
    a: 5,
    partial,
  };
  const total = rsx('a + partial')(totalModel);

  const totalChangedSubscription = total.changed.subscribe(() => {
    console.log('total:', total.value);
  });

  const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const baseInterval = setInterval(() => {
    partialModel.base = randomInt(5, 25);
  }, 2000);

  const bonusInterval = setInterval(() => {
    partialModel.bonus = new Promise((resolve) => {
      setTimeout(() => resolve(randomInt(10, 30)), 400);
    });
  }, 4000);

  const totalInterval = setInterval(() => {
    totalModel.a = randomInt(1, 10);
  }, 6000);

  const originalDispose = total.dispose.bind(total);
  let disposed = false;
  total.dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    clearInterval(baseInterval);
    clearInterval(bonusInterval);
    clearInterval(totalInterval);
    totalChangedSubscription.unsubscribe();
    originalDispose();
  };

  return total;
`;

const CORE_CONCEPT_DOCS: CoreConceptDoc[] = [
  {
    slug: 'modular-expressions',
    title: 'Modular expressions',
    lead: 'Split one large expression into reusable sub-expressions, then compose them into a final result that stays reactive.',
    whatItMeans:
      'In rs-x, expressions can reference other expressions as first-class values. Instead of one monolithic formula string, you define focused building blocks and compose them into a higher-level expression.',
    whyItMatters:
      'This makes expression logic easier to read, debug, and test. It also improves runtime efficiency because shared sub-expressions are reused instead of recalculated in multiple places.',
    keyPoints: [
      'Sub-expressions stay observable, so changes propagate through the graph automatically.',
      'Shared logic is evaluated once and reused by dependents.',
      'Works with synchronous and asynchronous values (observables/promises).',
      'You can move from long formulas to maintainable expression modules without changing reactive behavior.',
    ],
    deepDive: [
      {
        title: 'From monolithic formula to reusable modules',
        paragraphs: [
          'A large formula often duplicates parts of the same calculation, which hurts readability and performance. In the credit-risk example, the risk score logic appears multiple times in one expression string.',
          'With modular expressions, that same logic is split into smaller units. Each unit has one responsibility, and a final expression combines them. This removes duplication and makes each piece independently understandable.',
        ],
      },
      {
        title: 'Reactive behavior across expression boundaries',
        paragraphs: [
          'When a sub-expression changes, dependent expressions update automatically. You do not need custom plumbing code to keep derived values in sync.',
          'Because each expression is observable, the dependency graph remains explicit and predictable, even when modules are nested.',
        ],
      },
      {
        title: 'Performance and maintainability benefits',
        paragraphs: [
          'Expression parser services cache parse/evaluation structures, and modular design avoids repeated heavy computation.',
          'As rules grow, modular expressions let you evolve one part at a time while keeping the full formula behavior stable.',
        ],
      },
    ],
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

      await InjectionContainer.load(RsXExpressionParserModule);

      const model = {
        customer: {
          age: 31,
          income: 52000,
          employmentYears: 4,
        },
        credit: {
          score: 640,
          outstandingDebt: 12000,
        },
        riskParameters: {
          market: { baseInterestRate: 0.04 },
          risk: { volatilityIndex: 0.22, recessionProbability: 0.18 },
        },
      };

      // Sub-expressions
      const basePersonalRisk = rsx<number>(
        '(credit.score < 600 ? 0.4 : 0.1) + (credit.outstandingDebt / customer.income) * 0.6 - customer.employmentYears * 0.03',
      )(model);

      const ageBasedRiskAdjustment = rsx<number>(
        'customer.age < 25 ? 0.15 : customer.age < 35 ? 0.05 : customer.age < 55 ? 0.0 : 0.08',
      )(model);

      const marketRisk = rsx<number>(
        '(riskParameters.risk.volatilityIndex * 0.5) + (riskParameters.risk.recessionProbability * 0.5)',
      )(model);

      const interestRateImpact = rsx<number>(
        'riskParameters.market.baseInterestRate * 2',
      )(model);

      // Compose reusable modules
      const riskScore = rsx<number>(
        'basePersonalRisk + ageBasedRiskAdjustment + marketRisk + interestRateImpact',
      )({
        basePersonalRisk,
        ageBasedRiskAdjustment,
        marketRisk,
        interestRateImpact,
      });

      // Final classification
      const riskClassification = rsx<'HIGH' | 'MEDIUM' | 'LOW'>(
        "riskScore >= thresholds.highRisk ? 'HIGH' : riskScore >= thresholds.mediumRisk ? 'MEDIUM' : 'LOW'",
      )({
        riskScore,
        thresholds: { highRisk: 0.75, mediumRisk: 0.45 },
      });

      const randomBetween = (min: number, max: number): number =>
        min + Math.random() * (max - min);

      const randomInt = (min: number, max: number): number =>
        Math.floor(randomBetween(min, max + 1));

      let emphasizeHighRisk = false;
      const applyRandomScenario = () => {
        emphasizeHighRisk = !emphasizeHighRisk;

        if (emphasizeHighRisk) {
          // Push model toward HIGH risk.
          model.credit.score = randomInt(450, 580);
          model.credit.outstandingDebt = randomInt(25000, 60000);
          model.customer.income = randomInt(28000, 52000);
          model.customer.employmentYears = randomInt(0, 2);
          model.customer.age = randomInt(20, 28);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.55, 0.95);
          model.riskParameters.risk.recessionProbability = randomBetween(0.45, 0.9);
          model.riskParameters.market.baseInterestRate = randomBetween(0.06, 0.13);
        } else {
          // Push model toward MEDIUM/LOW risk.
          model.credit.score = randomInt(680, 820);
          model.credit.outstandingDebt = randomInt(1000, 14000);
          model.customer.income = randomInt(65000, 130000);
          model.customer.employmentYears = randomInt(5, 25);
          model.customer.age = randomInt(30, 58);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.05, 0.25);
          model.riskParameters.risk.recessionProbability = randomBetween(0.03, 0.2);
          model.riskParameters.market.baseInterestRate = randomBetween(0.01, 0.05);
        }
      };

      const classificationChangedSubscription = riskClassification.changed.subscribe(() => {
        console.log(
          'Risk score:',
          Number(riskScore.value).toFixed(3),
          'Classification:',
          riskClassification.value,
        );
      });

      // Keep changing inputs so classification flips over time.
      applyRandomScenario();
      const scenarioInterval = setInterval(() => {
        applyRandomScenario();
      }, 2500);

      const originalDispose = riskClassification.dispose.bind(riskClassification);
      let disposed = false;
      riskClassification.dispose = () => {
        if (disposed) {
          return;
        }
        disposed = true;
        clearInterval(scenarioInterval);
        classificationChangedSubscription.unsubscribe();
        originalDispose();
      };

      return riskClassification;
    `,
    playgroundScript: dedent`
      const rsx = api.rsx;

      const model = {
        customer: {
          age: 31,
          income: 52000,
          employmentYears: 4,
        },
        credit: {
          score: 640,
          outstandingDebt: 12000,
        },
        riskParameters: {
          market: { baseInterestRate: 0.04 },
          risk: { volatilityIndex: 0.22, recessionProbability: 0.18 },
        },
      };

      const basePersonalRisk = rsx(
        '(credit.score < 600 ? 0.4 : 0.1) + (credit.outstandingDebt / customer.income) * 0.6 - customer.employmentYears * 0.03',
      )(model);

      const ageBasedRiskAdjustment = rsx(
        'customer.age < 25 ? 0.15 : customer.age < 35 ? 0.05 : customer.age < 55 ? 0.0 : 0.08',
      )(model);

      const marketRisk = rsx(
        '(riskParameters.risk.volatilityIndex * 0.5) + (riskParameters.risk.recessionProbability * 0.5)',
      )(model);

      const interestRateImpact = rsx(
        'riskParameters.market.baseInterestRate * 2',
      )(model);

      const riskScore = rsx(
        'basePersonalRisk + ageBasedRiskAdjustment + marketRisk + interestRateImpact',
      )({
        basePersonalRisk,
        ageBasedRiskAdjustment,
        marketRisk,
        interestRateImpact,
      });

      const riskClassification = rsx(
        "riskScore >= thresholds.highRisk ? 'HIGH' : riskScore >= thresholds.mediumRisk ? 'MEDIUM' : 'LOW'",
      )({
        riskScore,
        thresholds: { highRisk: 0.75, mediumRisk: 0.45 },
      });

      const randomBetween = (min, max) => min + Math.random() * (max - min);
      const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));
      let emphasizeHighRisk = false;

      const applyRandomScenario = () => {
        emphasizeHighRisk = !emphasizeHighRisk;

        if (emphasizeHighRisk) {
          // Push model toward HIGH risk.
          model.credit.score = randomInt(450, 580);
          model.credit.outstandingDebt = randomInt(25000, 60000);
          model.customer.income = randomInt(28000, 52000);
          model.customer.employmentYears = randomInt(0, 2);
          model.customer.age = randomInt(20, 28);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.55, 0.95);
          model.riskParameters.risk.recessionProbability = randomBetween(0.45, 0.9);
          model.riskParameters.market.baseInterestRate = randomBetween(0.06, 0.13);
        } else {
          // Push model toward MEDIUM/LOW risk.
          model.credit.score = randomInt(680, 820);
          model.credit.outstandingDebt = randomInt(1000, 14000);
          model.customer.income = randomInt(65000, 130000);
          model.customer.employmentYears = randomInt(5, 25);
          model.customer.age = randomInt(30, 58);
          model.riskParameters.risk.volatilityIndex = randomBetween(0.05, 0.25);
          model.riskParameters.risk.recessionProbability = randomBetween(0.03, 0.2);
          model.riskParameters.market.baseInterestRate = randomBetween(0.01, 0.05);
        }
      };

      const classificationChangedSubscription = riskClassification.changed.subscribe(() => {
        console.log(
          'Risk score:',
          Number(riskScore.value).toFixed(3),
          'Classification:',
          riskClassification.value,
        );
      });

      // Keep changing inputs so classification flips over time.
      applyRandomScenario();
      const scenarioInterval = setInterval(() => {
        applyRandomScenario();
      }, 2500);

      const originalDispose = riskClassification.dispose.bind(riskClassification);
      let disposed = false;
      riskClassification.dispose = () => {
        if (disposed) {
          return;
        }
        disposed = true;
        clearInterval(scenarioInterval);
        classificationChangedSubscription.unsubscribe();
        originalDispose();
      };

      return riskClassification;
    `,
    related: [
      {
        href: '/docs/iexpression',
        title: 'IExpression',
        meta: 'Runtime expression contract',
      },
      {
        href: '/docs/abstract-expression',
        title: 'AbstractExpression',
        meta: 'Base expression runtime class',
      },
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Transaction manager',
        meta: 'Batch/commit update behavior',
      },
    ],
  },
  {
    slug: 'async-operations',
    title: 'Async operations',
    lead: 'Mix Promise, Observable, and expression values with sync values in one expression.',
    whatItMeans:
      'In rs-x, async and sync values work the same way inside expressions. You can mix both in one expression, and updates from each value type flow through the same reactive pipeline.',
    whyItMatters:
      'You avoid manual await/subscribe glue code per dependency. For example, with { a: 10, b: Promise.resolve(20) } you can bind "a + b" directly.',
    keyPoints: [
      'rs-x currently supports three async entities: Promise, RxJS Observable, and rsx expression values.',
      'rs-x is pluggable, so you can add support for custom async entities.',
      'Expression syntax stays the same for sync and async inputs.',
      'When async values resolve or emit, dependent expressions reevaluate automatically.',
    ],
    examples: [
      {
        title: 'Promise',
        description:
          'Bind directly to a Promise field and treat it like a normal value in the expression.',
        code: asyncPromiseExampleCode,
        playgroundScript: asyncPromisePlaygroundScript,
      },
      {
        title: 'Observable (RxJS)',
        description:
          'Bind directly to an observable source and react to next(...) emissions.',
        code: asyncObservableExampleCode,
        playgroundScript: asyncObservablePlaygroundScript,
      },
      {
        title: 'rsx expression value',
        description:
          'Bind one expression as a value inside another expression, including async inner dependencies.',
        code: asyncExpressionValueExampleCode,
        playgroundScript: asyncExpressionValuePlaygroundScript,
      },
    ],
    related: [
      {
        href: '/docs/async-operations',
        title: 'Advanced: Async operations',
        meta: 'Metadata/accessor/observer internals and commit flow',
      },
      {
        href: '/docs/observation/promise',
        title: 'Promise observation',
        meta: 'Observer + accessor pipeline for Promise values',
      },
      {
        href: '/docs/observation/observable',
        title: 'Observable observation',
        meta: 'Observer + accessor pipeline for Observable values',
      },
      {
        href: '/docs/modular-expressions',
        title: 'Expression implementation',
        meta: 'How expression value-type plugins are wired',
      },
    ],
  },
  {
    slug: 'collections',
    title: 'Collections',
    lead: 'Work safely with Array, Map, and Set values in reactive expressions.',
    whatItMeans:
      'Collection reads and writes are observed so dependent expressions can react when items change.',
    whyItMatters:
      'Collection-heavy models are common. Consistent collection tracking keeps computed values in sync with minimal manual code.',
    keyPoints: [
      'Array/Map/Set mutations can trigger reactive updates.',
      'Track collection item access and membership changes.',
      'Prefer explicit collection operations for predictable updates.',
    ],
    related: [
      {
        href: '/docs/observation',
        title: 'Observation strategy',
        meta: 'Collection observer behavior',
      },
      {
        href: '/docs/core-api/module/index-value-accessor',
        title: 'index-value-accessor',
        meta: 'Collection accessors',
      },
    ],
  },
  {
    slug: 'member-expressions',
    title: 'Member expressions',
    lead: 'Resolve nested property/member access reliably across object graphs.',
    whatItMeans:
      'Member expressions navigate object paths and method/property access while keeping runtime ownership and tracking consistent.',
    whyItMatters:
      'Most business models are nested. Reliable member access is required for correct dependency tracking.',
    keyPoints: [
      'Support nested property chains in expressions.',
      'Keep owner/context resolution stable per access.',
      'Track changes at the right depth in the object graph.',
    ],
    related: [
      {
        href: '/docs/abstract-expression',
        title: 'AbstractExpression',
        meta: 'Expression node behavior',
      },
      {
        href: '/docs/expression-type',
        title: 'ExpressionType',
        meta: 'Expression node types',
      },
    ],
  },
  {
    slug: 'readonly-properties',
    title: 'Readonly properties',
    lead: 'Handle write attempts safely when properties should not be modified.',
    whatItMeans:
      'Commit/write flow must respect readonly constraints and avoid unsafe mutations.',
    whyItMatters:
      'Readonly protection prevents accidental state corruption and keeps model contracts trustworthy.',
    keyPoints: [
      'Respect readonly fields during commit operations.',
      'Fail fast or skip writes based on runtime rules.',
      'Keep write behavior explicit and predictable.',
    ],
    related: [
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Transaction manager',
        meta: 'Write/commit lifecycle',
      },
      {
        href: '/docs/core-api/module/exceptions',
        title: 'exceptions',
        meta: 'Validation and error behavior',
      },
    ],
  },
  {
    slug: 'error-diagnostics',
    title: 'Error diagnostics',
    lead: 'Capture runtime errors and make debugging output readable and actionable.',
    whatItMeans:
      'Central error logging and formatting services collect runtime diagnostics and expose them consistently.',
    whyItMatters:
      'Fast diagnostics reduce debugging time and make production issues easier to investigate.',
    keyPoints: [
      'Capture runtime errors in one shared error stream.',
      'Use readable formatting for nested values.',
      'Keep diagnostics consistent across services.',
    ],
    related: [
      {
        href: '/docs/core-api/ErrorLog',
        title: 'ErrorLog',
        meta: 'Default runtime error logger',
      },
      {
        href: '/docs/core-api/PrettyPrinter',
        title: 'PrettyPrinter',
        meta: 'Readable debug output formatting',
      },
    ],
  },
  {
    slug: 'batching-transactions',
    title: 'Batching transactions',
    lead: 'Group changes and commit once to avoid redundant recalculation and render churn.',
    whatItMeans:
      'Transaction/commit flow batches multiple updates, then emits consolidated change results.',
    whyItMatters:
      'Batching improves performance and prevents noisy intermediate updates.',
    keyPoints: [
      'Suspend/continue update propagation where appropriate.',
      'Commit one grouped change result when batch completes.',
      'Reduce repeated recompute paths during rapid updates.',
    ],
    related: [
      {
        href: '/docs/expression-change-transaction-manager',
        title: 'Transaction manager',
        meta: 'Batch and commit flow details',
      },
      {
        href: '/docs/expression-change-commit-handler',
        title: 'Commit handler',
        meta: 'Commit execution behavior',
      },
    ],
  },
  {
    slug: 'caching-and-identity',
    title: 'Caching and identity',
    lead: 'Use stable ids and cache entries to reuse runtime state safely.',
    whatItMeans:
      'Factory and id services assign and track ids so repeated access can reuse existing entries instead of recreating them.',
    whyItMatters:
      'Stable identity reduces duplication, improves performance, and prevents memory churn.',
    keyPoints: [
      'Reuse cached entries when id and context match.',
      'Manage lifecycle with reference counting/dispose where required.',
      'Keep id generation stable for equivalent inputs.',
    ],
    related: [
      {
        href: '/docs/core-api/KeyedInstanceFactory',
        title: 'KeyedInstanceFactory',
        meta: 'Id-keyed instance lifecycle base',
      },
      {
        href: '/docs/core-api/module/sequence-id',
        title: 'sequence-id',
        meta: 'Stable id generation services',
      },
    ],
  },
];

type PageProps = {
  params: Promise<{ topic: string }>;
};

function bySlug(slug: string): CoreConceptDoc | undefined {
  return CORE_CONCEPT_DOCS.find((item) => item.slug === slug);
}

export function generateStaticParams() {
  return CORE_CONCEPT_DOCS.map((item) => ({ topic: item.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { topic } = await params;
  const item = bySlug(topic);
  if (!item) {
    return { title: 'Core concepts' };
  }
  return {
    title: item.title,
    description: item.lead,
  };
}

export default async function CoreConceptTopicPage({ params }: PageProps) {
  const { topic } = await params;
  const item = bySlug(topic);
  if (!item) {
    notFound();
  }
  const tryInPlaygroundHref = item.playgroundScript
    ? toPlaygroundHref(item.playgroundScript)
    : null;

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: item.title },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">{item.title}</h1>
          <p className="sectionLead">{item.lead}</p>
          {item.slug === 'modular-expressions' && (
            <p className="cardText">
              See how modular expressions are implemented in the{' '}
              <Link href="/docs/modular-expressions">
                advanced modular expressions page
              </Link>
              .
            </p>
          )}
          {item.slug === 'async-operations' && (
            <p className="cardText">
              For runtime internals, see the{' '}
              <Link href="/docs/async-operations">
                advanced async operations page
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What it means</h2>
          <p className="cardText">{item.whatItMeans}</p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Why it matters</h2>
          <p className="cardText">{item.whyItMatters}</p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Key points</h2>
          <ul className="advancedTopicLinks">
            {item.keyPoints.map((point) => (
              <li key={point}>
                {point}
                {item.slug === 'async-operations' &&
                  point ===
                    'rs-x is pluggable, so you can add support for custom async entities.' && (
                    <>
                      {' '}
                      See for example the{' '}
                      <Link href="/docs/modular-expressions">
                        modular expression implementation
                      </Link>
                      .
                    </>
                  )}
              </li>
            ))}
          </ul>
        </article>

        {item.deepDive && item.deepDive.length > 0 && (
          <article className="card docsApiCard">
            <h2 className="cardTitle">More details</h2>
            {item.deepDive.map((section) => (
              <div key={section.title}>
                <h3 className="coreInlineCodeTitle">{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="cardText">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </article>
        )}

        {item.exampleCode && (
          <article className="card docsApiCard">
            <h2 className="cardTitle">Example</h2>
            {tryInPlaygroundHref ? (
              <div className="cardLinks">
                <Link className="cardLink" href={tryInPlaygroundHref}>
                  Try in playground <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}
            <SyntaxCodeBlock code={item.exampleCode} />
          </article>
        )}

        {item.examples?.map((example) => (
          <article key={example.title} className="card docsApiCard">
            <h2 className="cardTitle">{example.title} example</h2>
            <p className="cardText">{example.description}</p>
            {example.playgroundScript ? (
              <div className="cardLinks">
                <Link
                  className="cardLink"
                  href={toPlaygroundHref(example.playgroundScript)}
                >
                  Try in playground <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : null}
            <SyntaxCodeBlock code={example.code} />
          </article>
        ))}

        <article className="card docsApiCard">
          <h2 className="cardTitle">Related docs</h2>
          <ul className="docsApiLinkGrid">
            {item.related.map((link) => (
              <li key={link.href}>
                <Link className="docsApiLinkItem" href={link.href}>
                  <span className="docsApiLinkTitle">{link.title}</span>
                  <span className="docsApiLinkMeta">{link.meta}</span>
                  <span className="docsApiLinkArrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
