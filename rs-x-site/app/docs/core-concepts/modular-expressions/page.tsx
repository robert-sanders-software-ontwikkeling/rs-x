import dedent from 'dedent';
import Link from 'next/link';
import type { Metadata } from 'next';

import { CoreConceptPageLayout, type CoreConceptDoc } from '../_template/core-concept-page';

const exampleCode = dedent`
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
`;

const playgroundScript = dedent`
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
`;

const doc: CoreConceptDoc = {
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
  exampleCode: exampleCode,
  playgroundScript: playgroundScript,
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
      title: 'Change transaction manager',
      meta: 'Batch/commit update behavior',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      headerNote={
        <p className="cardText">
          See how modular expressions are implemented in the{' '}
          <Link href="/docs/modular-expressions">
            advanced modular expressions page
          </Link>
          .
        </p>
      }
    />
  );
}
