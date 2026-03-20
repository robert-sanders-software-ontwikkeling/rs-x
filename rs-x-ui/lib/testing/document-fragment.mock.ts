import { mock, MockProxy } from 'jest-mock-extended';

export type DocumentFragmentMock = MockProxy<DocumentFragment>;

export const createDocumentFragmentMock = (overrides?: { -readonly [K in keyof DocumentFragment]?: DocumentFragment[K] }): DocumentFragmentMock => {
   const m = mock<DocumentFragment>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
