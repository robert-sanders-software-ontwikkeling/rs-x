# Showing the Power of RS-X with a “Scary” Credit-Risk Formula

When I explain RS-X, I like to use examples that look *way more complicated than necessary*.  

Not because credit risk itself matters — it doesn’t — but because real-world formulas are messy. They mix rules, special cases, numbers that change over time, and async data. If RS-X can handle *that*, it can handle pretty much anything.

So let’s use a credit-risk formula to show what RS-X does best:  

- handle complex formulas naturally  
- mix sync and async data effortlessly  
- automatic updates  
- zero “glue code”

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
    volatilityIndex: number;      // e.g., market volatility
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
(
    (credit.score < 600 ? 0.4 : 0.1) +
    (credit.outstandingDebt / customer.income) * 0.6 -
    (customer.employmentYears * 0.03) +
    (customer.age < 25 ? 0.15 :
     customer.age < 35 ? 0.05 :
     customer.age < 55 ? 0.00 :
     0.08) +
    (riskParameters.risk.volatilityIndex * 0.5 +
     riskParameters.risk.recessionProbability * 0.5) +
    (riskParameters.market.baseInterestRate * 2)
) >= 0.75 ? 'HIGH' : (
(
    (credit.score < 600 ? 0.4 : 0.1) +
    (credit.outstandingDebt / customer.income) * 0.6 -
    (customer.employmentYears * 0.03) +
    (customer.age < 25 ? 0.15 :
     customer.age < 35 ? 0.05 :
     customer.age < 55 ? 0.00 :
     0.08) +
    (riskParameters.risk.volatilityIndex * 0.5 +
     riskParameters.risk.recessionProbability * 0.5) +
    (riskParameters.market.baseInterestRate * 2)
) >= 0.45 ? 'MEDIUM' : 'LOW'
);
```

Even if you start with one huge formula, you can use RS-X to transform it into reactive expressions.

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
const basePersonalRisk = expressionFactory.create(model, `
    (credit.score < 600 ? 0.4 : 0.1) +
    (credit.outstandingDebt / customer.income) * 0.6 -
    (customer.employmentYears * 0.03)
`) as IExpression<number>;
```

**Explanation:** Calculates baseline risk from credit score, debt/income ratio, and employment history.

### Age-based risk adjustment

```ts
const ageBasedRiskAdjustment = expressionFactory.create(_model, `
    customer.age < 25 ? 0.15 :
    customer.age < 35 ? 0.05 :
    customer.age < 55 ? 0.00 :
    0.08
`) as IExpression<number>;
```

**Explanation:** Modifies risk slightly based on age. Keeping it separate makes it readable and reusable.

### Market risk (async-friendly)

```ts
const marketRisk = expressionFactory.create(_model, `
    (riskParameters.risk.volatilityIndex * 0.5) +
    (riskParameters.risk.recessionProbability * 0.5)
`) as IExpression<number>;
```

**Explanation:** Market data arrives asynchronously, but RS-X updates automatically when it changes.

### Interest rate impact

```ts
const interestRateImpact = expressionFactory.create(_model, `
    riskParameters.market.baseInterestRate * 2
`) as IExpression<number>;
```

**Explanation:** Updates automatically if base interest rate changes.

### Composing the risk score

```ts
const riskScore = expressionFactory.create({
    basePersonalRisk,
    ageBasedRiskAdjustment,
    marketRisk,
    interestRateImpact
}, `
    basePersonalRisk + ageBasedRiskAdjustment + marketRisk + interestRateImpact
`);
```

**Explanation:** Combines sub-expressions into a total score. Only recalculates when inputs change.

```ts
const riskClassification = expressionFactory.create({
    riskScore: riskScore as IExpression<number>,
    thresholds: { highRisk: 0.75, mediumRisk: 0.45 }
}, `
    riskScore >= thresholds.highRisk
        ? 'HIGH'
        : riskScore >= thresholds.mediumRisk
            ? 'MEDIUM'
            : 'LOW'
`);
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

The real takeaway:  

- messy formulas don’t need messy code  
- RS-X can split monolithic expressions automatically  
- async and sync data mix effortlessly  
- updates propagate automatically and efficiently

---

## Final thought

RS-X lets you describe **what your logic is**, not **how to keep it up to date**.  

Even a “scary” formula becomes readable, modular, efficient, and surprisingly calm.

You can see this in action with this demo on StackBlitz: [StackBlitz demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo)

References:

- [RS-X GitHub](https://github.com/robert-sanders-software-ontwikkeling/rs-x)  
- NPM packages:
  - [@rs-x/core](https://www.npmjs.com/package/@rs-x/core)  
  - [@rs-x/state-manager](https://www.npmjs.com/package/@rs-x/state-manager)  
  - [@rs-x/expression-parser](https://www.npmjs.com/package/@rs-x/expression-parser)  
  - [@rs-x/angular](https://www.npmjs.com/package/@rs-x/angular)

#JavaScript #TypeScript #ReactiveProgramming #OpenSource #WebDevelopment #StateManagement #FrameworkAgnostic #LINQ #React #Angular #VueJS #SPA