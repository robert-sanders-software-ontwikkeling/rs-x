When I explain RS-X, I like to use examples that look way more complicated than necessary.

This helps us to test the power of RS-X. For this post, I want to use a credit-risk formula. With this formula, I can demonstrate the following features:

- Mix synchronous and asynchronous data effortlessly.
- Modular expressions: support for splitting up a monolithic expression into sub-expressions.
- Automatic updating of the expression value when bound data changes. You can use your data model as the source of truth. Changing your data model will automatically update the value of the expression.

---

## The formula (monolithic version)

Here’s a “scary” credit-risk formula in JavaScript with model:

```ts
//Model
export interface ICustomer {
  age: number;
  income: number;
  employmentYears: number;
}

// Credit info
export interface ICredit {
  score: number;
  outstandingDebt: number;
}

// Market parameters
export interface IMarket {
  baseInterestRate: number;
}

// Risk parameters
export interface IRisk {
  volatilityIndex: number; // e.g., market volatility
  recessionProbability: number; // e.g., probability of economic downturn
}

// Risk calculation parameters
export interface IRiskCalcParameters {
  readonly market: IMarket;
  readonly risk: IRisk;
}

// Make it asynchronous to simulate API calls for fetching data.
export interface IRiskModel {
  readonly customer: BehaviorSubject<ICustomer>;
  readonly credit: BehaviorSubject<ICredit>;
  readonly riskParameters: BehaviorSubject<IRiskCalcParameters>;
}

//Nonolithic scary formula
(credit.score < 600 ? 0.4 : 0.1) +
  (credit.outstandingDebt / customer.income) * 0.6 -
  customer.employmentYears * 0.03 +
  (customer.age < 25
    ? 0.15
    : customer.age < 35
      ? 0.05
      : customer.age < 55
        ? 0.0
        : 0.08) +
  (riskParameters.risk.volatilityIndex * 0.5 +
    riskParameters.risk.recessionProbability * 0.5) +
  riskParameters.market.baseInterestRate * 2 >=
0.75
  ? 'HIGH'
  : (credit.score < 600 ? 0.4 : 0.1) +
        (credit.outstandingDebt / customer.income) * 0.6 -
        customer.employmentYears * 0.03 +
        (customer.age < 25
          ? 0.15
          : customer.age < 35
            ? 0.05
            : customer.age < 55
              ? 0.0
              : 0.08) +
        (riskParameters.risk.volatilityIndex * 0.5 +
          riskParameters.risk.recessionProbability * 0.5) +
        riskParameters.market.baseInterestRate * 2 >=
      0.45
    ? 'MEDIUM'
    : 'LOW';
```

This looks scary, or not 😄. So let's split it up into sub-expressions to make it more readable.

---

## Treat your data as living inputs

The data model is simple:

- customer info
- credit info
- market/risk parameters

These values might change independently or arrive asynchronously. RS-X doesn’t care. You just plug them into expressions, and updates flow automatically.

No listeners. No subscriptions. No `recalculateRiskScore()` calls.

---

## From monolith to modular

Big formulas are messy and inefficient if calculated as a single block. RS-X lets you naturally split formulas into sub-expressions for efficiency and readability. Each sub-expression only recalculates when its inputs change.

### Base personal risk

```ts
const basePersonalRisk = expressionFactory.create(
  model,
  `
    (credit.score < 600 ? 0.4 : 0.1) +
    (credit.outstandingDebt / customer.income) * 0.6 -
    (customer.employmentYears * 0.03)
`,
) as IExpression<number>;
```

**Explanation:** Calculates baseline risk from credit score, debt/income ratio, and employment history.

### Age-based risk adjustment

```ts
const ageBasedRiskAdjustment = expressionFactory.create(
  _model,
  `
    customer.age < 25 ? 0.15 :
    customer.age < 35 ? 0.05 :
    customer.age < 55 ? 0.00 :
    0.08
`,
) as IExpression<number>;
```

**Explanation:** Modifies risk slightly based on age. Keeping it separate makes it readable and reusable.

### Market risk (async-friendly)

```ts
const marketRisk = expressionFactory.create(
  _model,
  `
    (riskParameters.risk.volatilityIndex * 0.5) +
    (riskParameters.risk.recessionProbability * 0.5)
`,
) as IExpression<number>;
```

**Explanation:** Market data arrives asynchronously, but RS-X updates automatically when it changes.

### Interest rate impact

```ts
const interestRateImpact = expressionFactory.create(
  _model,
  `
    riskParameters.market.baseInterestRate * 2
`,
) as IExpression<number>;
```

**Explanation:** Updates automatically if base interest rate changes.

### Composing the risk score

```ts
const riskScore = expressionFactory.create(
  {
    basePersonalRisk,
    ageBasedRiskAdjustment,
    marketRisk,
    interestRateImpact,
  },
  `
    basePersonalRisk + ageBasedRiskAdjustment + marketRisk + interestRateImpact
`,
);
```

**Explanation:** Combines sub-expressions into a total score. Only recalculates when inputs change.

```ts
const riskClassification = expressionFactory.create(
  {
    riskScore: riskScore as IExpression<number>,
    thresholds: { highRisk: 0.75, mediumRisk: 0.45 },
  },
  `
    riskScore >= thresholds.highRisk
        ? 'HIGH'
        : riskScore >= thresholds.mediumRisk
            ? 'MEDIUM'
            : 'LOW'
`,
);
```

**Explanation:** Converts numeric score to HIGH/MEDIUM/LOW categories. Thresholds are reactive data — updates propagate automatically.

---

## Why this matters

This pattern isn’t just for credit risk. You can use it for:

- pricing rules
- validation logic
- feature flags
- scoring models
- UI state
- basically anything you can imagine

## Final thought

- RS-X supports modular expressions that enables you to split up complex monolithic expression in reusable sub expressions
- async and sync data mix effortlessly
- updates propagate automatically and efficiently
- You can just use your data model as source of true

With RS-X, you can think in a more declarative way about your data and operations:

- You define your data model
- You define your operations via expressions
- You bind the expressions to your data model
- You can now just manipulate the data, and the expressions will update automatically

You can see this in action with the demos on StackBlitz:

- [Angular demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo)
- [React demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-react-demo)

References:

- [RS-X GitHub](https://github.com/robert-sanders-software-ontwikkeling/rs-x)
- NPM packages:
  - [@rs-x/core](https://www.npmjs.com/package/@rs-x/core)
  - [@rs-x/state-manager](https://www.npmjs.com/package/@rs-x/state-manager)
  - [@rs-x/expression-parser](https://www.npmjs.com/package/@rs-x/expression-parser)
  - [@rs-x/angular](https://www.npmjs.com/package/@rs-x/angular)
