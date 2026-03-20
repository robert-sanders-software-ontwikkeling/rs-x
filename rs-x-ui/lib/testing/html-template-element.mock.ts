import { mock, MockProxy } from 'jest-mock-extended';

export type HTMLTemplateElementMock = MockProxy<HTMLTemplateElement>;

export const createHTMLTemplateElementMock = (overrides?: Partial<HTMLTemplateElement>): HTMLTemplateElementMock =>
   mock<HTMLTemplateElement>({
      getAttribute: jest.fn().mockReturnValue(null),
      querySelector: jest.fn().mockReturnValue(null),
      querySelectorAll: jest.fn().mockReturnValue([]),
      hasAttribute: jest.fn().mockReturnValue(false),
      dispatchEvent: jest.fn().mockReturnValue(true),
      getBoundingClientRect: jest.fn().mockReturnValue({ width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }),
      contains: jest.fn().mockReturnValue(false),
      closest: jest.fn().mockReturnValue(null),
      ...overrides,
   });
