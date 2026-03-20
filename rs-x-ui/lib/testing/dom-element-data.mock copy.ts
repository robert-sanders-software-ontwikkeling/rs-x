import { IDomElementData } from '../dom-element-data/dom-element-data.interface';

export class DomElementDataMock implements IDomElementData {
   public readonly register = jest.fn();
   public readonly unregister = jest.fn();
   public readonly getData = jest.fn();
   public readonly resolveContext = jest.fn();
   public readonly dispose = jest.fn();
}
