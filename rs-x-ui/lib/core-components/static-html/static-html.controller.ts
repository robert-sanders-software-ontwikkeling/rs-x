import { IHTMLParser } from '@rs-x/core';
import { Observable, of } from 'rxjs';
import { IChangedBinding } from '../../web-component/binding/interfaces';
import { ICustomElementCoreServices } from '../../web-component/interfaces';
import { StructuralDirectiveController } from '../../web-component/structural-directive.controller';
import { IStaticHtmlController } from './static-html.interfaces';

export class StaticHtmlController
   extends StructuralDirectiveController
   implements IStaticHtmlController
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
            this.buildContent();
         }
      }
   }

   public buildContent(): void {
      this._content.forEach((contentNode) => {
         this.element.before(contentNode);
      });
   }

   protected registerBindings(): Observable<IChangedBinding[]> {
      return of([]);
   }
}
