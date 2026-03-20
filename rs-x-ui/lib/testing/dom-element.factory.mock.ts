import { IDomElementFactory } from '../dom-element/dom-element.factory.interface';

export class DomElementFactoryMock implements IDomElementFactory {
   public readonly createElement = jest.fn();
}
