import { IHTMLParser } from '../html-parser/html-parser.interface';
import { HTMLElementMock } from './html-element.mock';

export class HTMLParserMock implements IHTMLParser {
   constructor(parsedHtml?: HTMLElementMock[]) {
      if (parsedHtml) {
         this.parse.mockReturnValue(parsedHtml);
      }
   }
   public readonly parse = jest.fn();
}
