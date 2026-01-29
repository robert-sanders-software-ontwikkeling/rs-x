import {
    ArrayIndexAccessor,
    ContainerModule,
    type IIndexValueAccessor,
    InjectionContainer,
    overrideMultiInjectServices,
    PropertyValueAccessor,
    RsXCoreInjectionTokens,
    RsXCoreModule
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);

export const MyModule = new ContainerModule((options) => {
    overrideMultiInjectServices(options, RsXCoreInjectionTokens.IIndexValueAccessorList,
        [
            { target: PropertyValueAccessor, token: RsXCoreInjectionTokens.IPropertyValueAccessor },
            { target: ArrayIndexAccessor, token: RsXCoreInjectionTokens.IArrayIndexAccessor },
        ]
    );
});

InjectionContainer.load(MyModule);
const indexValueAccessor: IIndexValueAccessor = InjectionContainer.get(RsXCoreInjectionTokens.IIndexValueAccessor);

export const run = (() => {
    const object = {
        a: 10,
        array: [1, 2],
        map: new Map([['x', 300]])
    };
    const aValue = indexValueAccessor.getValue(object, 'a');
    console.log(`Value of field 'a': ${aValue} `);

    const arrayValue = indexValueAccessor.getValue(object.array, 1);
    console.log(`Value of 'array[1]': ${arrayValue} `);

    let errrThrown = false;
    try {
         indexValueAccessor.getValue(object.map, 'x');
    } catch {
        errrThrown = true;
    }

    console.log(`Value of 'map['x'] will throw error: ${errrThrown}`);

})();
