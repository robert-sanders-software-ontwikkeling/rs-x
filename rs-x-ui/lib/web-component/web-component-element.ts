import { Observable } from 'rxjs';
import {
   IReflectedAttribute,
   ISlotBoundEventArgs,
} from './binding/interfaces';

import { IBindingManager } from './binding/binding-manager.interface';
import { Output } from './decorators/output/output.decorator.function';
import { IEventManager } from './event-manager/event-manager.interface';
import {
   ICustomElementConnector,
   IStyle,
   IWebComponentController,
   IWebComponentElement,
} from './interfaces';
import { IResizeObserverEntry } from '../resize/resize-observer-entry.interface';
import { Input } from './decorators/input/input.decorator.function';

export class WebComponentElement<
   T extends IWebComponentController = IWebComponentController,
> implements IWebComponentElement<T>
{
   @Output() public bound!: Observable<void>;
   @Output() public attributeReflected!: Observable<IReflectedAttribute>;
   @Output() public resized!: Observable<IResizeObserverEntry[]>;
   @Output() public slotBound!: Observable<ISlotBoundEventArgs>;
   @Output() public slotAssigned!: Observable<HTMLSlotElement>;

   public controller!: T;

   public get element(): ICustomElementConnector {
      return this.controller.customElementConnector;
   }

   public get parent(): Element {
      return this.controller.parent;
   }

   @Input()
   public get visible(): boolean {
      return this.controller.visible;
   }

   public set visible(value: boolean) {
      this.controller.visible = value;
   }

   @Input({ attributeName: 'custom-style' })
   public get customStyle(): IStyle {
      return this.controller.customStyle;
   }

   public set customStyle(value: IStyle) {
      this.controller.customStyle = value;
   }

   public buildContent(): void {
      this.controller.buildContent();
   }

   public attach(): void {
      this.controller.attach();
   }

   public detach(): void {
      this.controller.detach();
   }

   public attributeChanged(
      attributeName: string,
      newValue: unknown,
      oldValue: unknown
   ): Promise<void> {
      return this.controller.attributeChanged(
         attributeName,
         newValue,
         oldValue
      );
   }

   public querySelector(selector: string): Element | null {
      return this.controller.querySelector(selector);
   }

   protected get eventManager(): IEventManager | null {
      return this.controller.eventManager;
   }

   protected get bindingManager(): IBindingManager | null{
      return this.controller.bindingManager;
   }
}
