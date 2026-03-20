import { mock, MockProxy } from 'jest-mock-extended';

export type ChildNodeMock = MockProxy<ChildNode>;
export type ChildNodeMockOverrides = { -readonly [K in keyof ChildNode]?: ChildNode[K] };

export const createChildNodeMock = (overrides?: ChildNodeMockOverrides): ChildNodeMock => {
   const m = mock<ChildNode>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
