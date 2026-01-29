import { afterEach } from 'node:test';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { type IObserver } from '@rs-x/state-manager';

import { type IExpression, type IExpressionFactory, RsXExpressionParserInjectionTokens } from '../../lib';
import { RsXExpressionParserModule, unloadRsXExpressionParserModule } from '../../lib/rs-x-expression-parser.module';

describe('Expression observer tests', () => {
    let observer: IObserver | undefined;

    beforeAll(async () => {
        await InjectionContainer.load(RsXExpressionParserModule);
    });

    afterAll(async () => {
        await unloadRsXExpressionParserModule;
    });

    afterEach(() => {
        observer?.dispose();
        observer = undefined;
    });

    it('initial value', async () => {
        let expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
        const context: { a: number, b: number, c: number, aPlusB: IExpression | undefined } = {
            a: 10,
            b: 20,
            c: 40,
            aPlusB: undefined
        };
        context.aPlusB = expressionFactory.create(context, 'a + b');
        const largerThanExpression = expressionFactory.create(context, 'aPlusB > c');

        await new WaitForEvent(largerThanExpression, 'changed').wait(emptyFunction);

        expect(largerThanExpression.value).toEqual(false);

    });

    it('changed value', async () => {
        let expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
        const context: { a: number, b: number, c: number, aPlusB: IExpression | undefined } = {
            a: 10,
            b: 20,
            c: 40,
            aPlusB: undefined
        };
        context.aPlusB = expressionFactory.create(context, 'a + b');
        const largerThanExpression = expressionFactory.create(context, 'aPlusB > c');

        await new WaitForEvent(largerThanExpression, 'changed').wait(emptyFunction);


        await new WaitForEvent(largerThanExpression, 'changed', { ignoreInitialValue: true }).wait(() => {
            context.a = 30;
        });

        expect(largerThanExpression.value).toEqual(true);

    });

});