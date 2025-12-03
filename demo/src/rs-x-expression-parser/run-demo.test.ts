import dedent from 'dedent';
import { runDemo } from '../../run-demo';

describe('Expression parser demos', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('Node timezone is UTC', () => {
        expect(process.env.TZ).toEqual('UTC');
    });

    it('addition-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/addition-expression.ts
            Initial value of 'a + b':
            4
            Value of 'a + b' after changing a to '6':
            9
            Value of 'a + b' after changing b to '4':
            10
            Final value of 'a + b':
            10
        `;

        await expect(() => runDemo('rs-x-expression-parser/addition-expression.ts')).toOutputAsync(expected);
    });

    it('array-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/array-expression.ts
            Initial value of '[a, ...array, 100]':
            [
                3,
                1,
                2,
                100
            ]
            Value of [a, ...array, 100]' after changing a to '6':
            [
                6,
                1,
                2,
                100
            ]
            Value of '[a, ...array, 100]' after changing array to '[1, 2, 3]':
            [
                6,
                1,
                2,
                3,
                100
            ]
            Value of '[a, ...array, 100]' after setting array to '[100, 200]':
            [
                6,
                100,
                200,
                100
            ]
            Final value of '[a, ...array, 100]':
            [
                6,
                100,
                200,
                100
            ]
        `;

        await expect(() => runDemo('rs-x-expression-parser/array-expression.ts')).toOutputAsync(expected);
    });

    it('bitwise-and-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-and-expression.ts
            Initial value of 'a & b':
            1
            Value of 'a & b' after changing a to '2':
            2
            Value of 'a & b' after changing b to '8':
            0
            Final value of 'a & b':
            0
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-and-expression.ts')).toOutputAsync(expected);
    });

    it('bitwise-left-shift-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-left-shift-expression.ts
            Initial value of 'a << b':
            20
            Value of 'a << b' after changing a to '4':
            16
            Value of 'a << b' after changing b to '3':
            32
            Final value of 'a << b':
            32
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-left-shift-expression.ts')).toOutputAsync(expected);
    });

    it('bitwise-not-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-not-expression.ts
            Initial value of '~a':
            -6
            Value of ~a' after changing a to '3':
            -4
            Final value of '~a':
            -4
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-not-expression.ts')).toOutputAsync(expected);
    });

    it('bitwise-or-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-or-expression.ts
            Initial value of 'a | b':
            7
            Value of 'a | b' after changing a to '10':
            10
            Value of 'a | b' after changing b to '3':
            11
            Final value of 'a | b':
            11
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-or-expression.ts')).toOutputAsync(expected);
    });

    it('bitwise-right-shift-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-right-shift-expression.ts
            Initial value of 'a >> b':
            1
            Value of 'a >> b' after changing a to '10':
            2
            Value of 'a >> b' after changing b to '3':
            1
            Final value of 'a >> b':
            1
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-right-shift-expression.ts')).toOutputAsync(expected);
    });

    it('bitwise-unsigned-right-shift-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-unsigned-right-shift-expression.ts
            Initial value of 'a >>> b':
            1
            Value of 'a >>> b' after changing a to '-5':
            1073741822
            Value of 'a >>> b' after changing b to '3':
            536870911
            Final value of 'a >>> b':
            536870911
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-unsigned-right-shift-expression.ts')).toOutputAsync(expected);
    });


    it('bitwise-xor-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/bitwise-xor-expression.ts
            Initial value of 'a ^ b':
            6
            Value of 'a ^ b' after changing a to '10':
            9
            Value of 'a ^ b' after changing b to '8':
            2
            Final value of 'a ^ b':
            2
        `;

        await expect(() => runDemo('rs-x-expression-parser/bitwise-xor-expression.ts')).toOutputAsync(expected);
    });

    it('conditional-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/conditional-expression.ts
            Initial value of 'a > b ? c : d':
            200
            Value of 'a > b ? c : d' after changing d to '300':
            300
            Value of 'a > b ? c : d' after changing a to '3':
            100
            Value of 'a > b ? c : d' after changing c to '2000':
            2000
            Value of 'a > b ? c : d' after changing b to '4':
            300
            Final value of 'a > b ? c : d':
            300
        `;

        await expect(() => runDemo('rs-x-expression-parser/conditional-expression.ts')).toOutputAsync(expected);
    });

    it('division-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/division-expression.ts
            Initial value of 'a / b':
            10
            Value of 'a / b' after changing a to '10':
            5
            Value of 'a /b b' after changing b to '2':
            Final value of 'a / b':
            5
        `;

        await expect(() => runDemo('rs-x-expression-parser/division-expression.ts')).toOutputAsync(expected);
    });

    it('equality-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/equality-expression.ts
            Initial value of 'a == b':
            false
            Value of 'a == b' after changing a to '2':
            true
            Value of 'a == b' after changing b to '4':
            false
            Final value of 'a == b':
            false
        `;

        await expect(() => runDemo('rs-x-expression-parser/equality-expression.ts')).toOutputAsync(expected);
    });

    it('exponentiation-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/exponentiation-expression.ts
            Initial value of 'a ** b':
            8
            Value of 'a ** b' after changing a to '4':
            64
            Value of 'a ** b' after changing b to '5':
            1024
            Final value of 'a ** b':
            1024
        `;

        await expect(() => runDemo('rs-x-expression-parser/exponentiation-expression.ts')).toOutputAsync(expected);
    });

    it('function-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/function-expression.ts
            Initial value of 'multiply(a, b)'
            6
            Value of 'multiply(a, b)' after changing a to '4':
            12
            Value of 'mutiply(a, b)' after changing b to '5':
            20
            Final value of 'multiply(a, b)':
            20
        `;

        await expect(() => runDemo('rs-x-expression-parser/function-expression.ts')).toOutputAsync(expected);
    });

    it('greater-than-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/greater-than-expression.ts
            Initial value of 'a > b':
            true
            Value of 'a > b' after changing a to '2':
            false
            Value of 'a > b' after changing b to '1':
            true
            Final value of 'a > b':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/greater-than-expression.ts')).toOutputAsync(expected);
    });

    it('greater-than-or-equal-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/greater-than-or-equal-expression.ts
            Initial value of 'a >= b':
            true
            Value of 'a >= b' after changing a to '1':
            false
            Value of 'a >= b' after changing b to '0':
            true
            Final value of 'a >= b':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/greater-than-or-equal-expression.ts')).toOutputAsync(expected);
    });

    it('in-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/in-expression.ts
            Initial value of 'propertyName in b':
            true
            Value of 'propertyName in b' after changing a to 'x':
            false
            Value of 'propertyName in b' after changing b to '{x: 1}':
            true
            Final value of 'propertyName in b':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/in-expression.ts')).toOutputAsync(expected);
    });

    it('inequality-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/inequality-expression.ts
            Initial value of 'a != b':
            true
            Value of 'a != b' after changing a to '2':
            false
            Value of 'a != b' after changing b to '2':
            Final value of 'a != b':
            false
        `;

        await expect(() => runDemo('rs-x-expression-parser/inequality-expression.ts')).toOutputAsync(expected);
    });

    it('instanceof-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/instanceof-expression.ts
            Initial value of 'a instanceof type':
            true
            Value of 'a instanceof type' after changing a to 'new Number(2)':
            false
            Value of 'a instanceof type' after changing type to 'Number':
            true
            Final value of 'a instanceof type':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/instanceof-expression.ts')).toOutputAsync(expected);
    });

    it('less-than-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/less-than-expression.ts
            Initial value of 'a < b':
            true
            Value of 'a < b' after changing a to '3':
            false
            Value of 'a < b' after changing b to '4':
            true
            Final value of 'a < b':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/less-than-expression.ts')).toOutputAsync(expected);
    });

    it('less-than-or-equal-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/less-than-or-equal-expression.ts
            Initial value of 'a <= b':
            true
            Value of 'a <= b' after changing a to '4':
            false
            Value of 'a < b' after changing b to '4':
            true
            Final value of 'a <= b':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/less-than-or-equal-expression.ts')).toOutputAsync(expected);
    });

    it('logical-and-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/logical-and-expression.ts
            Initial value of 'a && b':
            false
            Value of 'a && b' after changing a to 'true':
            true
            Value of 'a && b' after changing b to 'false':
            false
            Final value of 'a && b':
            false
        `;

        await expect(() => runDemo('rs-x-expression-parser/logical-and-expression.ts')).toOutputAsync(expected);
    });

    it('logical-or-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/logical-or-expression.ts
            Initial value of 'a || b':
            true
            Value of 'a || b' after changing a to 'false':
            false
            Value of 'a || b' after changing b to 'true':
            true
            Final value of 'a || b':
            true
        `;

        await expect(() => runDemo('rs-x-expression-parser/logical-or-expression.ts')).toOutputAsync(expected);
    });

    it('logical-not-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/logical-not-expression.ts
            Initial value of '!a':
            true
            Value of !a' after changing a to 'true':
            false
            Final value of '!a':
            false
        `;

        await expect(() => runDemo('rs-x-expression-parser/logical-not-expression.ts')).toOutputAsync(expected);
    });

    it('member-expression.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/member-expression.ts
            Initial value of 'a.b.c':
            10
            Value of 'a.b.c' after changing a to '{b : {c: 20}}':
            20
            Value of 'a.b.c' after changing b to '{c: 30}':
            30
            Value of 'a.b.c' after changing c to '40':
            40
            Final value of 'a.b.c':
            40
        `;

        await expect(() => runDemo('rs-x-expression-parser/member-expression.ts')).toOutputAsync(expected);
    });

    it('member-expression-with-array.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-expression-parser/member-expression-with-array.ts
            Initial value of 'a.b[1].c.d':
            11
            Value of 'a.b.c' after changing a to '{b: [{ c: { d: 100}},{ c: { d: 110}}}':
            110
            Value of 'a.b[1].c.d' after changing b[1] to '{ c: { d: 120}}':
            120
            Value of 'a.b[1].c.d' after changing b[1].c to '{d: 220}':
            220
            Value of 'a.b[1].c.d' after changing b[1].c.d to '330':
            330
            Final value of 'a.b[1].c.d':
            330
        `;

        await expect(() => runDemo('rs-x-expression-parser/member-expression-with-array.ts')).toOutputAsync(expected);
    });

});