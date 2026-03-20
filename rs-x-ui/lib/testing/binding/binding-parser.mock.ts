import { IBindingsParser } from '../../web-component';

export class BindingParserMock implements IBindingsParser {
   public readonly parse = jest.fn();
}
