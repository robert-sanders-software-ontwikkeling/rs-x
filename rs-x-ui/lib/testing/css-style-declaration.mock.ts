import { mock, MockProxy } from 'jest-mock-extended';

export type CSSStyleDeclarationMock = MockProxy<CSSStyleDeclaration>;

export const createCSSStyleDeclarationMock = (overrides?: { -readonly [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K] }): CSSStyleDeclarationMock => {
   const m = mock<CSSStyleDeclaration>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
