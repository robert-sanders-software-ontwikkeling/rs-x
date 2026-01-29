import { BehaviorSubject } from 'rxjs';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

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
        thresholds: {
            highRisk: 0.75,
            mediumRisk: 0.45
        }
    };

    const expressionString = `(
      (
        // =========================
        // Numeric risk score
        // =========================
        (
            // Base personal risk
            (
                (credit.score < 600 ? 0.4 : 0.1) +
                (credit.outstandingDebt / customer.income) * 0.6 -
                (customer.employmentYears * 0.03)
            )

            // Age-based risk adjustment
            +
            (
                customer.age < 25 ? 0.15 :
                customer.age < 35 ? 0.05 :
                customer.age < 55 ? 0.00 :
                0.08
            )

            // Market risk (async observable)
            +
            (
                (risk.volatilityIndex * 0.5) +
                (risk.recessionProbability * 0.5)
            )

            // Interest rate impact
            +
            (market.baseInterestRate * 2)
        )
        // =========================
        // Risk classification
        // =========================
        >= thresholds.highRisk
            ? 'HIGH'
            : (
                (
                    (
                        (credit.score < 600 ? 0.4 : 0.1) +
                        (credit.outstandingDebt / customer.income) * 0.6 -
                        (customer.employmentYears * 0.03)
                    )
                    +
                    (
                        customer.age < 25 ? 0.15 :
                        customer.age < 35 ? 0.05 :
                        customer.age < 55 ? 0.00 :
                        0.08
                    )
                    +
                    (
                        (risk.volatilityIndex * 0.5) +
                        (risk.recessionProbability * 0.5)
                    )
                    +
                    (market.baseInterestRate * 2)
                ) >= thresholds.mediumRisk
                ? 'MEDIUM'
                : 'LOW'
            )
        )
    )`;

    const expression = expressionFactory.create(riskModel, expressionString);

    console.log('Initial risk: ')
    const changeSubscription = expression.changed.subscribe(() => {
        console.log(expression.value);
    });

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log('Risk after changing risk parameters from  { volatilityIndex: 0.28, recessionProbability: 0.12 } to  { volatilityIndex: 0.41, recessionProbability: 0.35 } :')
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.risk.next({
                volatilityIndex: 0.45,
                recessionProbability: 0.35
            })
        });

        console.log('Risk after change age = 63 and employmentYears = 1 ');

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.customer.age = 63;
            riskModel.customer.employmentYears = 1;
        });
    } finally {
        changeSubscription.unsubscribe();
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

