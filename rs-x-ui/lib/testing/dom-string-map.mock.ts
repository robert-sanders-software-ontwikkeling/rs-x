import { mock, MockProxy } from 'jest-mock-extended';

export type DOMStringMapMock = MockProxy<DOMStringMap>;

export const createDOMStringMapMock = (overrides?: { -readonly [K in keyof DOMStringMap]?: DOMStringMap[K] }): DOMStringMapMock => {
   const m = mock<DOMStringMap>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
