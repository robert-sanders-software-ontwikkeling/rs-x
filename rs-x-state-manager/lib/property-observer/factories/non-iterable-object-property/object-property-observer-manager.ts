import {
   Injectable,
   InvalidOperationException,
   IPropertyDescriptor,
   IPropertyChange,
   PropertyDescriptorType,
   SingletonFactory,
   Type,
} from '@rs-x-core';
import { Subject } from 'rxjs';
import { AbstractObserver } from '../../../abstract-observer';
import { IDisposableOwner } from '../../../disposable-owner.interface';
import { IObserver } from '../../../observer.interface';
import {
   IObjectPropertyObserverManager,
   IPropertyObserverIdInfo,
   IPropertyObserverInfo,
   IPropertyObserverManager,
} from './object-property-observer-manager.type';

class PropertObserver extends AbstractObserver {
   private _value: unknown;
   private _emitingChange = false;
   private _propertyDescriptorWithTarget: IPropertyDescriptor;

   constructor(
      owner: IDisposableOwner,
      target: object,
      propertyName: string,
      initialValue: unknown
   ) {
      super(
         owner,
         target,
         initialValue,
         new Subject<IPropertyChange>(),
         propertyName
      );

      this.patch(propertyName);
   }

   protected disposeInternal(): void {
      const propertyName = this.id as string;
      const value = this.target[propertyName];
      //to prevent errors if is was non configurable
      delete this.target[propertyName];

      Object.defineProperty(
         this.target,
         propertyName,
         this._propertyDescriptorWithTarget.descriptor
      );

      if (
         this._propertyDescriptorWithTarget.type !==
         PropertyDescriptorType.Function
      ) {
         this.target[propertyName] = value;
      }

      this._value = undefined;
      this._propertyDescriptorWithTarget = undefined;
   }

   private patch(propertyName: string): void {
      const descriptorWithTarget = Type.getPropertyDescriptor(
         this.target,
         propertyName
      );
      const descriptor = descriptorWithTarget.descriptor;
      let newDescriptor: PropertyDescriptor;

      if (descriptorWithTarget.type === PropertyDescriptorType.Function) {
         newDescriptor =
            this.createFunctionPropertyDescriptor(descriptorWithTarget);
      } else if (!descriptor.get && !descriptor.set) {
         newDescriptor =
            this.createFieldPropertyDescriptor(descriptorWithTarget);
      } else if (descriptor.set) {
         newDescriptor =
            this.createWritablePropertyDescriptor(descriptorWithTarget);
      } else {
         throw new InvalidOperationException(
            `Property '${propertyName}' can not be watched because it is readonly`
         );
      }

      Object.defineProperty(this.target, propertyName, newDescriptor);

      this._propertyDescriptorWithTarget = descriptorWithTarget;
   }

   private createFunctionPropertyDescriptor(
      descriptorWithTarget: IPropertyDescriptor
   ): PropertyDescriptor {
      const newDescriptor = { ...descriptorWithTarget.descriptor };

      newDescriptor.value = (...args: unknown[]) => {
         const newValue = descriptorWithTarget.descriptor.value.call(
            this.target,
            ...args
         );

         if (newValue === undefined || this._value !== newValue) {
            this.emitChanged({
               newValue,
               arguments: args,
            });
         }
         return newValue;
      };
      return newDescriptor;
   }

   private setValue = (value) => {
      this._value = value;
   };

   protected emitChanged(change: Partial<IPropertyChange>) {
      this._value = change.newValue;

      if (!this._emitingChange) {
         this._emitingChange = true;
         super.emitChange({
            arguments: [],
            ...change,
            chain: [{ object: this.target, id: this.id }],
            target: this.target,
            id: this.id,
            setValue: this.setValue,
         });
         this._emitingChange = false;
      }
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
            this.emitChanged({ newValue: value });
         }
      };

      this._value = this.target[this.id as string];

      return newDescriptor;
   }

   private createWritablePropertyDescriptor(
      descriptorWithTarget: IPropertyDescriptor
   ): PropertyDescriptor {
      const newDescriptor = { ...descriptorWithTarget.descriptor };
      const oldSetter = descriptorWithTarget.descriptor.set;
      newDescriptor.set = (value) => {
         const oldValue = this.target[this.id as string];
         if (value !== oldValue) {
            oldSetter.call(this.target, value);
            this.emitChanged({ newValue: value });
         }
      };

      this._value = this.target[this.id as string];

      return newDescriptor;
   }
}

class PropertyObserverManager
   extends SingletonFactory<
      string,
      IPropertyObserverInfo,
      IObserver,
      IPropertyObserverIdInfo
   >
   implements IPropertyObserverManager
{
   constructor(
      private readonly _object: object,
      private readonly releaseObject: () => void
   ) {
      super();
   }

   public override getId(data: IPropertyObserverIdInfo): string {
      return data.index;
   }

   protected override createId(data: IPropertyObserverIdInfo): string {
      return data.index;
   }

   protected override createInstance(
      data: IPropertyObserverInfo,
      id: string
   ): IObserver {
      return new PropertObserver(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => this.release(id),
         },
         this._object,
         data.index,
         data.initialValue
      );
   }

   protected override onReleased(): void {
      this.releaseObject();
   }

   protected override releaseInstance(observer: IObserver): void {
      observer.dispose();
   }
}

@Injectable()
export class ObjectPropertyObserverManager
   extends SingletonFactory<object, object, IPropertyObserverManager>
   implements IObjectPropertyObserverManager
{
   constructor() {
      super();
   }

   public override getId(context: object): object {
      return context;
   }

   protected override createId(context: object): object {
      return context;
   }

   protected override createInstance(
      context: object
   ): IPropertyObserverManager {
      return new PropertyObserverManager(context, () => this.release(context));
   }

   protected override releaseInstance(
      propertyObserverManager: IPropertyObserverManager
   ): void {
      propertyObserverManager.dispose();
   }
}
