import {
   IDeepClone,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
   SingletonFactory,
   UnsupportedException,
} from '@rs-x/core';
import {
   IObjectStateManager,
   IState,
   IStateForObjectManager,
   IValueKey,
   IValueWithKey,
} from './object-state-manager.interface';

export class StateForObjectManager
   extends SingletonFactory<unknown, IValueWithKey, IState, IValueKey>
   implements IStateForObjectManager
{
   constructor(
      private readonly _deepClone: IDeepClone,
      private readonly releaseContext: VoidFunction
   ) {
      super();
   }

   public override getId(data: IValueKey): unknown {
      return data.key;
   }

   public set(key: unknown, value: unknown): void {
      const state = this.getFromId(key);

      if (state) {
         state.valueCopy = this.deepClone(key, value);
         state.value = value;
      } else {
         this.create({ key, value });
      }
   }

   protected override createId(data: IValueKey): unknown {
      return data.key;
   }

   private deepClone(key: unknown, data: unknown): unknown {
      try {
         return this._deepClone.clone(data);
      } catch (e) {
         throw new UnsupportedException(
            `Failed to clone state for key '${key}'. Error: ${e}. If the object type is not supported, you can provide your own implementation of IDeepClone.`
         );
      }
   }

   protected override createInstance(data: IValueWithKey): IState {
      return {
         value: data.value,
         valueCopy: this.deepClone(data.key, data.value),
      };
   }

   protected override onReleased(): void {
      this.releaseContext();
   }
}

@Injectable()
export class ObjectStateManager
   extends SingletonFactory<unknown, unknown, IStateForObjectManager>
   implements IObjectStateManager
{
   constructor(
      @Inject(RsXCoreInjectionTokens.IDeepClone)
      private readonly _deepClone: IDeepClone
   ) {
      super();
   }

   public getId(object: unknown): unknown {
      return object;
   }

   public replaceState(
      key: unknown,
      newContext: unknown,
      newValue: unknown,
      oldContext
   ): void {
      let stateForObjectManagerForNewContext: IStateForObjectManager;
      const stateForObjectManagerForOldContext = this.getFromId(oldContext);

      if (newValue === undefined) {
         stateForObjectManagerForOldContext?.release(key);
         return;
      }

      if (newContext !== oldContext) {
         stateForObjectManagerForOldContext?.release(key);
         stateForObjectManagerForNewContext = this.getFromId(newContext);
      } else {
         stateForObjectManagerForNewContext =
            stateForObjectManagerForOldContext;
      }

      if (stateForObjectManagerForNewContext) {
         stateForObjectManagerForNewContext.set(key, newValue);
      } else if (newValue !== undefined) {
         this.create(newContext).instance.create({
            key,
            value: newValue,
         });
      }
   }

   protected createId(object: unknown): unknown {
      return object;
   }

   protected createInstance(context: unknown): IStateForObjectManager {
      return new StateForObjectManager(this._deepClone, () =>
         this.release(context)
      );
   }
}
