import { Injectable } from '@rs-x/core';
import { IBindingContext, IBindingQueue } from './binding-queue.interface';

@Injectable()
export class BindingQueue implements IBindingQueue {
   private readonly pendingBindings: IBindingContext[] = [];
   private _isBinding = false;

   public get isBinding(): boolean {
      return this._isBinding;
   }

   public push(bindingContext: IBindingContext): void {
      this.pendingBindings.push(bindingContext);
   }

   public bind(): void {
      if (!this.pendingBindings.length) {
      }
      this._isBinding = true;

      this.pendingBindings.forEach((pendingBinding) => {
         const { bindingManager, eventManager, eventElements, content } =
            pendingBinding;
         eventManager.bindEvents(eventElements);
         bindingManager.attachBindings(content);
      });

      this.pendingBindings.length = 0;
      this._isBinding = false;
   }
}
