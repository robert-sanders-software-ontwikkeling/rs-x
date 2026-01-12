import {
    IIndexValueAccessor,
    IndexAccessor,
    InjectionContainer,
    RsXCoreInjectionTokens,
    RsXCoreModule
} from '@rs-x/core';

interface ICustomContext {
    '1': number;
    '2': number;
}

const customIndexContext = Symbol('CustomIndexContext');
type CustomIndex = '1'| '2';

@IndexAccessor()
export class CustomIndexAccessor implements IIndexValueAccessor<ICustomContext, CustomIndex> {
    public readonly priority = 100;
    private readonly _values = new Map<CustomIndex, number>([
        ['1', 100],
        ['2', 200],

    ]);
   
    public hasValue(context: ICustomContext, index: CustomIndex): boolean {
        return context[index] !== undefined
    }

    public getIndexes(): IterableIterator<CustomIndex> {
        return ['1', '2'].values() as IterableIterator<CustomIndex>;
    }
   
    public isAsync(): boolean {
        return false;
    }

    public getResolvedValue(context: ICustomContext, index: CustomIndex): number {
        return this.getValue(context, index);
    }

    public getValue(_: ICustomContext, index: CustomIndex): number {
        return  this._values.get(index);
    }

    public setValue(_: ICustomContext, index: CustomIndex, value: number): void {
        this._values.set(index, value);
    }

    public applies(context: unknown, index: CustomIndex): boolean {
        return context  === customIndexContext && index === '1' || index === '2'
    }
}

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const indexValueAccessor: IIndexValueAccessor =  InjectionContainer.get(RsXCoreInjectionTokens.IIndexValueAccessor);

export const run = (() => {
    const initialValue = indexValueAccessor.getValue(customIndexContext, '2');
    console.log(`Initial value for index '2': ${initialValue}`);

    indexValueAccessor.setValue(customIndexContext, '2', 2000);
    const changedValue = indexValueAccessor.getValue(customIndexContext, '2');
    console.log(`value for index '2' after setting it to 2000: ${changedValue}` );

})();
