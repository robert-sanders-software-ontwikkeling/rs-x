import { mock, MockProxy } from 'jest-mock-extended';

export type ShadowRootMock = MockProxy<ShadowRoot>;

export const createShadowRootMock = (overrides?: { -readonly [K in keyof ShadowRoot]?: ShadowRoot[K] }): ShadowRootMock => {
   const m = mock<ShadowRoot>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
