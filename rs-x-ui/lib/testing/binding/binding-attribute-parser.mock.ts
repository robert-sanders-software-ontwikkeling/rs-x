import { IBindingAttributeParser } from '../../web-component/binding/interfaces';

export class BindingAttributeParserMock implements IBindingAttributeParser {
   public readonly parse = jest.fn();
}
