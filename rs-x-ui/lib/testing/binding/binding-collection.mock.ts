import { ObservableMock } from '@rs-x/core/testing';
import { IBinding, IBindingCollection } from '../../web-component';

export class BindingCollectionMock implements IBindingCollection {
   public readonly valuesChanged = new ObservableMock();
   public readonly changed = new ObservableMock();
   public count!: number;
   public items: IBinding[] = [];
   public oneTimeBindings: IBinding[] = [];
   public oneWayBindings: IBinding[] = [];
   public textBindings: IBinding[] = [];
   public twoWayBindings: IBinding[] = [];
   public readonly add = jest.fn();
   public readonly addRange = jest.fn();
   public readonly remove = jest.fn();
   public readonly dispose = jest.fn();
   public readonly getBindingsForElements = jest.fn();
   public readonly filter = jest.fn();
   public readonly execute = jest.fn();
   public readonly findAndRemove = jest.fn();
   public readonly removeForElements = jest.fn();
   public readonly getRightToLeftBinding = jest.fn();
   public readonly getLeftToRightBinding = jest.fn();
   public readonly hasRightToLeftBinding = jest.fn();
   public readonly hasLeftToRightBinding = jest.fn();
   public readonly reset = jest.fn();
   public readonly suspendWatch = jest.fn();
   public readonly continueWatch = jest.fn();
   public readonly enableWatch = jest.fn();
   public readonly disableWatch = jest.fn();
}
