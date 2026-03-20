import { Observable, Subject } from 'rxjs';
import {
   ICustomElement,
   ICustomElementController,
} from '../web-component/interfaces';
export class CustomElementMock<
   T extends ICustomElementController = ICustomElementController,
> implements ICustomElement<T>
{
   public controller!: T;
   public parent!: Element;
   private _bound = new Subject<void>();

   constructor(public readonly element: HTMLElement) {}

   public get bound(): Observable<void> {
      return this._bound;
   }

   public emitBound(): void {
      this._bound.next();
   }

   public readonly buildContent = jest.fn();
   public readonly attach = jest.fn();
   public readonly detach = jest.fn();
   public readonly attributeChanged = jest.fn();
   public readonly querySelector = jest.fn();
}
