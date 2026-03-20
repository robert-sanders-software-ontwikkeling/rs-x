import { IEventManager } from '../event-manager/event-manager.interface';
import { IBindingManager } from './binding-manager.interface';

export interface IBindingContext {
   bindingManager: IBindingManager;
   eventManager: IEventManager;
   eventElements: Element[];
   content: Node[];
}

export interface IBindingQueue {
   readonly isBinding: boolean;
   push(bindingContext: IBindingContext): void;
   bind(): void;
}
