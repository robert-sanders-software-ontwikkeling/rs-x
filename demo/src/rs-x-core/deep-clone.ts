import {
    type IDeepClone,
    InjectionContainer,
    printValue,
    RsXCoreInjectionTokens,
    RsXCoreModule
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const deepClone: IDeepClone = InjectionContainer.get(RsXCoreInjectionTokens.IDeepClone);

export const run = (() => {
    const object = {
        a: 10,
        nested: {
            b: 20
        }
    };
    const clone = deepClone.clone(object);

    console.log(`Clone is a copy of the cloned object: ${object !== clone}`)
    console.log('Cloned object');
    printValue(clone);
})();