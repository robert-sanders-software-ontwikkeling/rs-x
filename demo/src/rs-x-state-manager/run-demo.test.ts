import dedent from 'dedent';
import { runDemo } from '../../run-demo';

describe('Statemanager demos', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('Node timezone is UTC', () => {
        expect(process.env.TZ).toEqual('UTC');
    });

    it('register-non-recursive-state.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-non-recursive-state.ts
            Initial value:
            {
                y: 10
            }
            Changed value:
            {
                y: 20
            }
            Latest value:
            {
                y: 20
            }

            stateContext.x.y = 30 will not emit any change:
            ---
        `;

        await expect(() => runDemo('rs-x-state-manager/register-non-recursive-state.ts')).toOutputAsync(expected);
    });

    it('register-recursive-state.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-recursive-state.ts
            Initial value:
            {
                y: 10
            }
            Changed value:
            {
                y: 20
            }
            Changed (recursive) value:
            {
                y: 30
            }
            Latest value:
            {
                y: 30
            }
        `;
        await expect(() => runDemo('rs-x-state-manager/register-recursive-state.ts')).toOutputAsync(expected);
    });

    it('register-state-is-idempotent.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-state-is-idempotent.ts
            Initial value:
            {
                y: 10
            }
            Changed value:
            {
                y: 20
            }
            Changed event is still emitted after unregister because one observer remains.
            Changed value:
            {
                y: 30
            }
            Changed event is no longer emitted after the last observer unregisters.
            Changed value:
            ---
        `;

        await expect(() => runDemo('rs-x-state-manager/register-state-is-idempotent.ts')).toOutputAsync(expected);
    });

    it('register-property.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-property.ts
            Initial value:
            {
                a: 10
                nested: {
                    a: 20
                    nested: {
                        a: 30
                        nested: {
                            a: 40
                        }
                    }
                }
            }

            Replacing stateContext.b.nested.nested will emit a change event
            Changed value:
            {
                a: 10
                nested: {
                    a: 20
                    nested: {
                        a: -30
                        nested: {
                            a: -40
                        }
                    }
                }
            }
            Latest value:
            {
                a: 10
                nested: {
                    a: 20
                    nested: {
                        a: -30
                        nested: {
                            a: -40
                        }
                    }
                }
            }
        `;

        await expect(() => runDemo('rs-x-state-manager/register-property.ts')).toOutputAsync(expected);
    });

    it('register-date.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-date.ts

            ******************************************
            * Watching date
            ******************************************

            Initial value:
            date: Fri, 05 Mar 2021 00:00:00 GMT
            Changed value:
            date: Sun, 05 Mar 2023 00:00:00 GMT
            Set value:
            date: Thu, 06 Jun 2024 00:00:00 GMT
            Latest value:
            Thu, 06 Jun 2024 00:00:00 GMT

            ******************************************
            * Watching year
            ******************************************

            Initial value:
            2021
            Changed value:
            2023
            Latest value:
            2023
        `;

        await expect(() => runDemo('rs-x-state-manager/register-date.ts')).toOutputAsync(expected);
    });

    it('register-promise.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-promise.ts
            Initial value:
            10
            Changed value:
            30
            Latest value: 30
        `;

        await expect(() => runDemo('rs-x-state-manager/register-promise.ts')).toOutputAsync(expected);
    });

    it('register-observable.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-observable.ts
            Initial value:
            10
            Changed value:
            30
            Latest value: 30
        `;

        await expect(() => runDemo('rs-x-state-manager/register-observable.ts')).toOutputAsync(expected);
    });

    it('register-array.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-array.ts
            Initial value:
            [
                [
                    1,
                    2
                ],
                [
                    3,
                    4
                ]
            ]
            Changed value:
            [
                [
                    1,
                    2
                ],
                [
                    3,
                    4,
                    5
                ]
            ]
            Latest value:
            [
                [
                    1,
                    2
                ],
                [
                    3,
                    4,
                    5
                ]
            ]
        `;

        await expect(() => runDemo('rs-x-state-manager/register-array.ts')).toOutputAsync(expected);
    });

    it('register-map.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-map.ts
            Initial value:
            {
                a: [
                    1,
                    2
                ]
                b: [
                    3,
                    4
                ]
            }
            Changed value:
            {
                a: [
                    1,
                    2
                ]
                b: [
                    3,
                    4,
                    5
                ]
            }
            Latest value:
            {
                a: [
                    1,
                    2
                ]
                b: [
                    3,
                    4,
                    5
                ]
            }
        `;

        await expect(() => runDemo('rs-x-state-manager/register-map.ts')).toOutputAsync(expected);
    });

    it('register-set.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/register-set.ts
            Initial value:
            {
                [
                    1,
                    2
                ]
                [
                    3,
                    4
                ]
            }
            Changed value:
            {
                [
                    1,
                    2
                ]
                [
                    3,
                    4,
                    5
                ]
            }
            Latest value:
            {
                [
                    1,
                    2
                ]
                [
                    3,
                    4,
                    5
                ]
            }
        `;

        await expect(() => runDemo('rs-x-state-manager/register-set.ts')).toOutputAsync(expected);
    });

    it('state-manager-customize.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-state-manager/state-manager-customize.ts

            ***********************************************
            Start watching the whole book

            My initial book:

            Page 0:
              0: Once upon a time
              1: bla bla

            Page 1:
              0: bla bla
              1: They lived happily ever after.
              2: The end

            Update second line on the first page:

            My book after change:

            Page 0:
              0: Once upon a time
              1: In a far far away land

            Page 1:
              0: bla bla
              1: They lived happily ever after.
              2: The end

            ***********************************************
            Start watching line 3 on page 1

            Line 3 on page 1 has changed to 'a prince was born'
            My book after change:

            Page 0:
              0: Once upon a time
              1: In a far far away land
              2: a prince was born

            Page 1:
              0: bla bla
              1: They lived happily ever after.
              2: The end

            Changing line 1 on page 1 does not emit change:
            ---
        `;
        await expect(() => runDemo('rs-x-state-manager/state-manager-customize.ts')).toOutputAsync(expected);
    });
});