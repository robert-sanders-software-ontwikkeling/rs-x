import { mock, MockProxy } from 'jest-mock-extended';

export type NamedNodeMapMock = MockProxy<NamedNodeMap>;

export const createNamedNodeMapMock = (overrides?: { -readonly [K in keyof NamedNodeMap]?: NamedNodeMap[K] }): NamedNodeMapMock => {
   const m = mock<NamedNodeMap>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
