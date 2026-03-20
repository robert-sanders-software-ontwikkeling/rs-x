import { Observable } from 'rxjs';
import { IBindingManagerFactory } from '../binding/binding-manager.factory.type';
import { IBindingManager } from '../binding/binding-manager.interface';
import { Output } from '../decorators/output/output.decorator.function';
import { IEventManagerFactory } from '../event-manager/event-manager.factory.type';
import { IEventManager } from '../event-manager/event-manager.interface';
import { IStructuralDirective } from './repeater/repeater.directive.interface';
import { Assertion } from '../../../../rs-x-core/lib';

export abstract class StructuralDirective implements IStructuralDirective {
   @Output() public readonly bound!: Observable<void>;

   private _bindingManager!: IBindingManager | null;
   private _eventManager!: IEventManager | null;

   protected constructor(
      protected readonly _element: Element,
      private readonly _bindingManagerFactory: IBindingManagerFactory,
      private readonly _eventManagerFactory: IEventManagerFactory
   ) {}

   protected get bindingManager(): IBindingManager | null {
      return this._bindingManager;
   }

   protected get eventManager(): IEventManager | null {
      return this._eventManager;
   }

   public async attach(): Promise<void> {
      this._bindingManager = this._bindingManagerFactory.create(
         this._element
      ).instance;

      this._eventManager = this._eventManagerFactory.create({
         element: this._element,
         context: this,
      }).instance;
      this._eventManager.bindEvents([this._element]);

      await this.bindData();
   }

   public detach(): void {

      if(!this._bindingManager) {
            return;
      }
      this._bindingManager?.detachBindings();
      this._bindingManagerFactory.release(this._element);
      this._bindingManager = null;

      this._eventManager?.unbindAllEvents();
      this._eventManagerFactory.release(this._element);
      this._eventManager = null;

      this.unbindData();
   }

   protected abstract bindData(): Promise<void>;
   protected abstract unbindData(): void;

   protected emitBound(): void {

      Assertion.assertNotNullOrUndefined(this._eventManager, 'this._eventManager');
      this._eventManager.emitEvent(this, 'bound');
   }
}
