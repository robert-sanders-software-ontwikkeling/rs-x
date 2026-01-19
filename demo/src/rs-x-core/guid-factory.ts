import {
    IGuidFactory,
    InjectionContainer,
    RsXCoreInjectionTokens,
    RsXCoreModule
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const guidFactory: IGuidFactory = InjectionContainer.get(RsXCoreInjectionTokens.IGuidFactory);

export const run = (() => {
    const guid = guidFactory.create();
    console.log(`Created guid: ${guid}`)
})();