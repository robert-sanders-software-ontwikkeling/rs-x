import { IElementFactory } from '@rs-x/core';
import { ICustomElementCoreServices } from '../../web-component/interfaces';
import { StructuralDirectiveController } from '../../web-component/structural-directive.controller';

export class IfController extends StructuralDirectiveController {
   private _show = false;
   private readonly _content: Node[] = [];
   private readonly _contentElement: Node;

   constructor(
      services: ICustomElementCoreServices,
      itemElementFactory: IElementFactory
   ) {
      super(services);

      this._contentElement = itemElementFactory.create();
   }

   public get content(): readonly Node[] {
      return this._content;
   }

   public get show(): boolean {
      return this._show;
   }

   public set show(value: boolean) {
      if (this._show !== value) {
         this._show = value;
         if (this.isAttached) {
            this.updateContent();
         }
      }
   }

   public buildContent(): void {
      if (this.show) {
         this._content.push(this._contentElement);
         this.element.after(this._contentElement);
      } else {
         this._content.splice(0);
      }
   }

   private updateContent(): void {
      if (this.show) {
         this.buildContent();
         this.eventManager.bindEvents(this.getEventElements());
         this.bindingManager
            .attachBindings(this._content)
            .subscribe(this.emitBound);
      } else if (this._contentElement.parentNode) {
         this.bindingManager.removeBindingsForElements([...this._content]);
         this.eventManager.unbindEvents(this.getEventElements());
         this._contentElement.parentNode.removeChild(this._contentElement);
         this._content.splice(0);
      }
   }
}
