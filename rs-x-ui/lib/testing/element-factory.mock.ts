import { IElementFactory } from '../dom-item-element-synchronisizer/element-factory.interface';

export class ElementFactoryMock implements IElementFactory {
   public readonly create = jest.fn();
   public readonly setData = jest.fn();
}
