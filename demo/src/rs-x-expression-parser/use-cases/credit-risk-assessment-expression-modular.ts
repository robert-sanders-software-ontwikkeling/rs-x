import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';
import { BehaviorSubject } from 'rxjs';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory =
    InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);


export const run = (async () => {
    interface IRisk {
        volatilityIndex: number;
        recessionProbability: number;
    }

    const riskModel = {
        customer: {
            age: 42,
            income: 72000,
            employmentYears: 6
        },
        credit: {
            score: 680,
            outstandingDebt: 18000
        },
        market: {
            baseInterestRate: 0.035
        },
        risk: new BehaviorSubject<IRisk>({
            volatilityIndex: 0.28,
            recessionProbability: 0.12
        }),
    };

    const basePersonalRisk = expressionFactory.create(riskModel, `
        (credit.score < 600 ? 0.4 : 0.1) +
        (credit.outstandingDebt / customer.income) * 0.6 -
        (customer.employmentYears * 0.03)     
    `);

    const ageBasedRiskAdjustment = expressionFactory.create(riskModel, `
        customer.age < 25 ? 0.15 :
        customer.age < 35 ? 0.05 :
        customer.age < 55 ? 0.00 :
        0.08
    `);

    const marketRisk = expressionFactory.create(riskModel, `
        (risk.volatilityIndex * 0.5) +
        (risk.recessionProbability * 0.5)
    `);

    const interestRateImpact = expressionFactory.create(riskModel, 'market.baseInterestRate * 2');

    const riskScoreModel = {
        basePersonalRisk,
        ageBasedRiskAdjustment,
        marketRisk,
        interestRateImpact
    };

    const riskScore = expressionFactory.create(riskScoreModel, `
        basePersonalRisk + 
        ageBasedRiskAdjustment +
        marketRisk + 
        interestRateImpact
    `);

    const riskClassificationModel = {
        riskScore,
        thresholds: {
            highRisk: 0.75,
            mediumRisk: 0.45
        }
    };

    const riskClassification = expressionFactory.create(riskClassificationModel, `
        riskScore >= thresholds.highRisk
            ? 'HIGH'
            : riskScore >= thresholds.mediumRisk
                ? 'MEDIUM'
                : 'LOW'
    `);


    console.log('Initial risk: ')
    const changeSubscription = riskClassification.changed.subscribe(() => {
        console.log(riskClassification.value);
    });

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(riskClassification, 'changed').wait(emptyFunction);

        console.log('Risk after changing risk parameters from  { volatilityIndex: 0.28, recessionProbability: 0.12 } to  { volatilityIndex: 0.41, recessionProbability: 0.35 } :')
        await new WaitForEvent(riskClassification, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.risk.next({
                volatilityIndex: 0.45,
                recessionProbability: 0.35
            })
        });

        console.log('Risk after change age = 63 and employmentYears = 1 ');

        await new WaitForEvent(riskClassification, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.customer.age = 63;
            riskModel.customer.employmentYears = 1;
        });

    } finally {
        changeSubscription.unsubscribe();
        // Always dispose of expressions after use.
        riskClassification.dispose();
        riskScore.dispose();
        interestRateImpact.dispose();
        marketRisk.dispose();
        ageBasedRiskAdjustment.dispose();
        basePersonalRisk.dispose();
    }
})();

