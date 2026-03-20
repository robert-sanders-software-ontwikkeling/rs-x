import { mock, MockProxy } from 'jest-mock-extended';

export type ElementMock = MockProxy<Element>;

export const createElementMock = (overrides?: { -readonly [K in keyof Element]?: Element[K] }): ElementMock => {
   const m = mock<Element>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
