import { IHTMLParser } from '@rs-x/core';
import { ICustomElementCoreServices } from '../../web-component/interfaces';
import { StructuralDirectiveController } from '../../web-component/structural-directive.controller';
import { IHtmlController } from './html.interfaces';

export class HtmlController
   extends StructuralDirectiveController
   implements IHtmlController
{
   private _html: string;
   private _content: Node[] = [];

   constructor(
      services: ICustomElementCoreServices,
      private readonly _htmlParser: IHTMLParser
   ) {
      super(services);
   }

   public get content(): readonly Node[] {
      return this._content;
   }

   public get html(): string {
      return this._html;
   }

   public set html(value: string) {
      if (this._html !== value) {
         this.disposeContent();
         this._html = value;
         this._content = this._htmlParser.parse(this._html);
         if (this.isAttached) {
            this.updateContent();
         }
      }
   }

   public buildContent(): void {
      this._content.forEach((contentNode) => {
         this.element.before(contentNode);
      });
   }

   private updateContent(): void {
      this.buildContent();
      this.eventManager.bindEvents(this.getEventElements());
      this.bindingManager
         .attachBindings(this._content)
         .subscribe(this.emitBound);
   }
}
