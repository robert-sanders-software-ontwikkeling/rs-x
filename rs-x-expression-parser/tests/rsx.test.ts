import { InjectionContainer } from '@rs-x/core';

import { rsx } from '../lib/rsx';
import { RsXExpressionParserModule, unloadRsXExpressionParserModule } from '../lib/rs-x-expression-parser.module';
import { AbstractExpression } from '../lib/expressions/abstract-expression';


describe('rsx (integration)', () => {
    beforeAll(async () => {
        await InjectionContainer.load(RsXExpressionParserModule);
    });

    afterAll(async () => {
        await unloadRsXExpressionParserModule();
    });

    it('creates an expression and evaluates correctly', () => {
        const model = { a: 1, b: 2 };

        const expression = rsx<number>`a+b`(model);
        expect(expression).toBeInstanceOf(AbstractExpression);

    });

    it('throws when interpolations are used', () => {
        expect(() => {
            rsx`a + ${1}`({ a: 1 });
    
        }).toThrow('rsx`...` does not support interpolations');
    });

    it('throws when called with more than one string segment (should never happen without interpolation, but still guarded)', () => {
        expect(() => {
            const fake = ['a', 'b'] as any as TemplateStringsArray;
            rsx(fake);
        }).toThrow('rsx`...` does not support interpolations');
    });

});