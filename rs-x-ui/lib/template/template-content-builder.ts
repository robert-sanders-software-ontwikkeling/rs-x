import { Type } from '@rs-x/core';
import { IDomContentBuilder } from './dom-content-builder.interface';
import { IHTMLParser } from '../html-parser/html-parser.interface';

export class TemplateContentBuilder implements IDomContentBuilder {
   constructor(
      private readonly _htmlParser: IHTMLParser,
      private readonly _template: string
   ) {}

   public buildContent(): Node[] {
      const content = [];
      (this.createContent() || []).forEach((element) =>
         this.addContentElements(element, content)
      );
      return content;
   }

   protected createContent(): Node[] {
      if (Type.isEmpty(this._template)) {
         return [];
      }
      return this.parseHtml(this._template);
   }

   private parseHtml(html: string): Node[] {
      return this._htmlParser.parse(html);
   }

   private addContentElements(element: Node, content: ChildNode[]): void {
      if (element instanceof DocumentFragment) {
         content.push(...Array.from(element.childNodes));
      } else {
         content.push(element as ChildNode);
      }
   }
}
