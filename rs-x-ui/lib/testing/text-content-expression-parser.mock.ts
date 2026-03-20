import { ITextContentExpressionParser } from '../web-component/binding/interfaces';

export class TextContentExpressionParserMock
   implements ITextContentExpressionParser
{
   public readonly parse = jest.fn();
}
