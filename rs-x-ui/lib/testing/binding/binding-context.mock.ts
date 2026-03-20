import { IBindingContext } from '../../web-component/binding/binding-queue.interface';
import { EventManagerMock } from '../event-manager.mock';
import { BindingManagerMock } from './binding-manager.mock';

export class BindingContextMock implements IBindingContext {
   public readonly bindingManager = new BindingManagerMock();
   public readonly eventManager = new EventManagerMock();
   public readonly eventElements: Element[] = [];
   public readonly content: Node[] = [];

   constructor(properties?: Partial<IBindingContext>) {
      Object.assign(this, properties);
   }
}
