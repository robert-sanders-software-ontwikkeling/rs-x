import { ObservableMock } from '@rs-x/core/testing';
import {
   IBinding,
   IBindingsChanged,
   IReflectedAttribute,
} from '../../web-component/binding/interfaces';
import { IBindingManager } from '../../web-component/binding/binding-manager.interface';

export class BindingManagerMock implements IBindingManager {
   private readonly _bindingsChanged = new ObservableMock<IBindingsChanged>();
   private readonly _rebuildContent = new ObservableMock<void>();
   public observerDisabled!: boolean;
   public oneWayBindings: IBinding[] = [];
   public oneTimeBindings: IBinding[] = [];
   public twoWayBindings: IBinding[] = [];
   public textBindings: IBinding[] = [];
   public readonly bound = new ObservableMock<void>();
   public readonly attributeReflected =
      new ObservableMock<IReflectedAttribute>();

   public get bindingsChanged(): ObservableMock<IBindingsChanged> {
      return this._bindingsChanged;
   }

   public get rebuildContent(): ObservableMock<void> {
      return this._rebuildContent;
   }

   public readonly setPropertyFromAttribute = jest.fn();
   public readonly attachBindingsManually = jest.fn();
   public readonly attachBindings = jest.fn();
   public readonly rebindElements = jest.fn();
   public readonly removeBindingsForElements = jest.fn();
   public readonly detachBindings = jest.fn();
   public readonly disableWatch = jest.fn();
   public readonly enableWatch = jest.fn();
}
