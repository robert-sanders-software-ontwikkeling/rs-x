import { mock, MockProxy } from 'jest-mock-extended';

export type NodeMock = MockProxy<Node>;
export type NodeMockOverrides = { -readonly [K in keyof Node]?: Node[K] };

export const createNodeMock = (overrides?: NodeMockOverrides): NodeMock => {
   const m = mock<Node>();
   if (overrides) {
      Object.assign(m, overrides);
   }
   return m;
};
