import {
    type IDisposable,
    type IDisposableOwner,
    InvalidOperationException,
    type IPropertyChange,
    type IPropertyDescriptor,
    PropertyDescriptorType,
    SingletonFactory,
    Type,
    UnsupportedException
} from '@rs-x/core';
import { type Observable, Subject } from 'rxjs';

interface IObserver extends IDisposable {
    changed: Observable<IPropertyChange>;
}

class PropertObserver implements IObserver {
    private _isDisposed = false;
    private _value: unknown;
    private _propertyDescriptorWithTarget: IPropertyDescriptor | undefined;
    private readonly _changed = new Subject<IPropertyChange>();

    constructor(
        private readonly _owner: IDisposableOwner,
        private readonly _target: object,
        private readonly _propertyName: string,
    ) {
        this.patch();
    }

    public get changed(): Observable<IPropertyChange> {
        return this._changed;
    }

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }

        if (!this._owner?.canDispose || this._owner.canDispose()) {
            const propertyName = this._propertyName as string;
            const value = this._target[propertyName];
            //to prevent errors if is was non configurable
            delete this._target[propertyName];

            if (
                this._propertyDescriptorWithTarget?.type !==
                PropertyDescriptorType.Function
            ) {
                this._target[propertyName] = value
            }

            this._propertyDescriptorWithTarget = undefined;
        }

        this._owner?.release?.();
    }

    private patch(): void {
        const descriptorWithTarget = Type.getPropertyDescriptor(
            this._target,
            this._propertyName
        );
        const descriptor = descriptorWithTarget.descriptor;
        let newDescriptor: PropertyDescriptor;

        if (descriptorWithTarget.type === PropertyDescriptorType.Function) {
            throw new UnsupportedException('Methods are not supported')
        } else if (!descriptor.get && !descriptor.set) {
            newDescriptor =
                this.createFieldPropertyDescriptor(descriptorWithTarget);
        } else if (descriptor.set) {
            newDescriptor =
                this.createWritablePropertyDescriptor(descriptorWithTarget);
        } else {
            throw new InvalidOperationException(
                `Property '${this._propertyName}' can not be watched because it is readonly`
            );
        }

        Object.defineProperty(this._target, this._propertyName, newDescriptor);

        this._propertyDescriptorWithTarget = descriptorWithTarget;
    }

    private emitChange(change: Partial<IPropertyChange>, id: unknown) {
        this._value = change.newValue;

        this._changed.next({
            arguments: [],
            ...change,
            chain: [{ object: this._target, id: this._propertyName }],
            target: this._target,
            id,
        });
    }

    private createFieldPropertyDescriptor(
        descriptorWithTarget: IPropertyDescriptor
    ): PropertyDescriptor {
        const newDescriptor = { ...descriptorWithTarget.descriptor };

        newDescriptor.get = () => this._value;
        delete newDescriptor.writable;
        delete newDescriptor.value;

        newDescriptor.set = (value) => {
            if (value !== this._value) {
                this.emitChange({ newValue: value, }, this._propertyName);
            }
        };

        this._value = this._target[this._propertyName];

        return newDescriptor;
    }

    private createWritablePropertyDescriptor(
        descriptorWithTarget: IPropertyDescriptor
    ): PropertyDescriptor {
        const newDescriptor = { ...descriptorWithTarget.descriptor };
        const oldSetter = descriptorWithTarget.descriptor.set as (v: unknown) => void
        newDescriptor.set = (value) => {
            const oldValue = this._target[this._propertyName];
            if (value !== oldValue) {
                oldSetter.call(this._target, value);
                this.emitChange({ newValue: value }, this._propertyName);
            }
        };

        this._value = this._target[this._propertyName];

        return newDescriptor;
    }
}

class PropertyObserverManager
    extends SingletonFactory<
        string,
        string,
        IObserver,
        string
    > {
    constructor(
        private readonly _object: object,
        private readonly releaseObject: () => void
    ) {
        super();
    }

    public override getId(propertyName: string): string {
        return propertyName;
    }

    protected override createId(propertyName: string): string {
        return propertyName;
    }

    protected override createInstance(
        propertyName: string,
        id: string
    ): IObserver {
        return new PropertObserver(
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => this.release(id),
            },
            this._object,
            propertyName
        );
    }

    protected override onReleased(): void {
        this.releaseObject();
    }

    protected override releaseInstance(observer: IObserver): void {
        observer.dispose();
    }
}

class ObjectPropertyObserverManager
    extends SingletonFactory<object, object, PropertyObserverManager> {
    constructor() { super(); }

    public override getId(context: object): object {
        return context;
    }

    protected override createId(context: object): object {
        return context;
    }

    protected override createInstance(
        context: object
    ): PropertyObserverManager {
        return new PropertyObserverManager(
            context,
            () => this.release(context)
        );
    }
    protected override releaseInstance(propertyObserverManager: PropertyObserverManager): void {
        propertyObserverManager.dispose();
    }
}

class PropertyObserverFactory {
    private readonly _objectPropertyObserverManager = new ObjectPropertyObserverManager();

    public create(context: object, propertyName: string): IObserver {
        return this._objectPropertyObserverManager
            .create(context).instance
            .create(propertyName).instance;
    }
}

export const run = (() => {
    const context = {
        a: 10
    };
    const propertyObserverFactory = new PropertyObserverFactory();
    
    const aObserver1 = propertyObserverFactory.create(context, 'a');
    const aObserver2 = propertyObserverFactory.create(context, 'a');

    const changeSubsription1 = aObserver1.changed.subscribe((change) => {
        console.log('Observer 1:')
        console.log(change.newValue)
    });
    const changeSubsription2 = aObserver1.changed.subscribe((change) => {
        console.log('Observer 2:')
        console.log(change.newValue)
    });

    console.log('You can observe the same property multiple times but only one observer will be create:');
    console.log(aObserver1 === aObserver2);

    console.log('Changing value to 20:')

    context.a = 20;

    // Dispose of the observers 
    aObserver1.dispose();
    aObserver2.dispose();
    // Unsubsribe to the changed event
    changeSubsription1.unsubscribe();
    changeSubsription2.unsubscribe();
})();