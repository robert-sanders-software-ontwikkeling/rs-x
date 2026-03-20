import { mock, MockProxy } from 'jest-mock-extended';
import { DeepPartial } from 'ts-essentials';

export type ParentNodeMock = MockProxy<Node & ParentNode>;

export const createParentNodeMock = (overrides?: DeepPartial<Node & ParentNode>): ParentNodeMock =>
   mock<Node & ParentNode>(overrides);
