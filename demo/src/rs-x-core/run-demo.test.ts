import dedent from 'dedent';

import { runDemo } from '../../run-demo';

describe('Core  demos', () => {
     beforeEach(() => {
        jest.resetModules();
    });

    it('deep-clone.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-core/deep-clone.ts
            Clone is a copy of the cloned object: true
            Cloned object
            {
                a: 10
                nested: {
                    b: 20
                }
            }
        `;

        await expect(() => runDemo('rs-x-core/deep-clone.ts')).toOutputAsync(expected);
    });

    it('equality-service.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-core/equality-service.ts
            {
                a: 10
                nested: {
                    b: 20
                }
            }
            is equal to
            {
                a: 10
                nested: {
                    b: 20
                }
            }
            Result: true
        `;

        await expect(() => runDemo('rs-x-core/equality-service.ts')).toOutputAsync(expected);
    });

    it('guid-factory.ts', async () => {
        await runDemo('rs-x-core/guid-factory.ts');
    });


    it('error-log.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-core/error-log.ts
            Emmitted error
            {
                exception: Error: Oops an error
                message: Oops
                context: {
                    name: My error context
                }
            }
        `;

        await expect(() => runDemo('rs-x-core/error-log.ts')).toOutputAsync(expected);
    });

    it('redefine-custom-index-value-accessor-list.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-core/redefine-custom-index-value-accessor-list.ts
            Value of field 'a': 10 
            Value of 'array[1]': 2 
            Value of 'map['x'] will throw error: true
        `;

        await expect(() => runDemo('rs-x-core/redefine-custom-index-value-accessor-list.ts')).toOutputAsync(expected);
    });

    it('implementation-of-singleton-factory.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-core/implementation-of-singleton-factory.ts
            You can observe the same property multiple times but only one observer will be create:
            true
            Changing value to 20:
            Observer 1:
            20
            Observer 2:
            20
        `;

        await expect(() => runDemo('rs-x-core/implementation-of-singleton-factory.ts')).toOutputAsync(expected);
    });


    it('wait-for-event.ts', async () => {
        const expected = dedent`
            Running demo: demo/src/rs-x-core/wait-for-event.ts
            Emitted events:
            [
                Hello,
                hi
            ]
        `;

        await expect(() => runDemo('rs-x-core/wait-for-event.ts')).toOutputAsync(expected);
    });

});