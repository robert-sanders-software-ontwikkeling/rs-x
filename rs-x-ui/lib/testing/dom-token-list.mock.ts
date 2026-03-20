import { mock, MockProxy } from 'jest-mock-extended';

export type DOMTokenListMock = MockProxy<DOMTokenList>;

export const createDOMTokenListMock = (overrides?: { -readonly [K in keyof DOMTokenList]?: DOMTokenList[K] }): DOMTokenListMock => {
   const m = mock<DOMTokenList>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
