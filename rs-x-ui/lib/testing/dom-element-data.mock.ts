import { IDomElementData } from '../dom-element-data/dom-element-data.interface';

export class DomElementDataMock implements IDomElementData {
   getData = jest.fn();
   register = jest.fn();
   unregister = jest.fn();
   resolveContext = jest.fn();
   dispose = jest.fn();
}
