import { mock, MockProxy } from 'jest-mock-extended';

export type DocumentMock = MockProxy<Document>;

export const createDocumentMock = (overrides?: { -readonly [K in keyof Document]?: Document[K] }): DocumentMock => {
   const m = mock<Document>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
