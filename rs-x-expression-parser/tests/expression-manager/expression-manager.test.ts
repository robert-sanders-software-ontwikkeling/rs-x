import { InjectionContainer } from '@rs-x/core';

import type { IExpressionCache } from '../../lib/expression-cache';
import type { IExpressionManager } from '../../lib/expression-factory/expression-manager.type';
import { RsXExpressionParserModule, unloadRsXExpressionParserModule } from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('ExpressionManager', () => {
    let expressionManager: IExpressionManager;

    beforeAll(async () => {
        await InjectionContainer.load(RsXExpressionParserModule);
        expressionManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionManager);
    });

    afterEach(() => {
        expressionManager.dispose();
    });

    afterAll(async () => {
        await unloadRsXExpressionParserModule();
    });

    it('The same expression is parsed only once', () => {
        const expressionCache: IExpressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);
        const context1 = { a: 1 };
        const context2 = { a: 1 };

        const { instance: expression1 } = expressionManager.create(context1).instance.create('a +1 * (2 + 3)');
        const { instance: expression2 } = expressionManager.create(context2).instance.create('a +1 * (2 + 3)');

        const referenceCount = expressionCache.getReferenceCount('a +1 * (2 + 3)');

        expect(referenceCount).toBe(2);

        expression1.dispose();
        expression2.dispose();
    });

    it('The cached expression is released when all references are released', () => {
        const expressionCache: IExpressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);
        const context1 = { a: 1 };
        const context2 = { a: 1 };
        const { instance: expression1 } = expressionManager.create(context1).instance.create('a +1 * (2 + 3)');
        const { instance: expression2 } = expressionManager.create(context2).instance.create('a +1 * (2 + 3)');

        expression1.dispose();
        expect(expressionCache.getReferenceCount('a +1 * (2 + 3)')).toEqual(1);

        expression2.dispose();
        expect(expressionCache.getReferenceCount('a +1 * (2 + 3)')).toEqual(0);
    });
});