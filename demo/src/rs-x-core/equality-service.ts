import {
    type IEqualityService,
    InjectionContainer,
    printValue,
    RsXCoreInjectionTokens,
    RsXCoreModule
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const equalityService: IEqualityService = InjectionContainer.get(RsXCoreInjectionTokens.IEqualityService);

export const run = (() => {
    const object1 = {
        a: 10,
        nested: {
            b: 20
        }
    };
    const object2 = {
        a: 10,
        nested: {
            b: 20
        }
    };

    printValue(object1);
    console.log('is equal to')
    printValue(object2);

    const result = equalityService.isEqual(object1, object2);
    console.log(`Result: ${result}`)
})();