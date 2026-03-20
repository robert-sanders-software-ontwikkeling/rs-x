import { mock, MockProxy } from 'jest-mock-extended';
import { HtmlTagName } from '../html-elements/html-tag-name';
import { ICustomElement, ICustomElementConnector } from '../web-component/interfaces';
import { createHTMLElementMock } from './html-element.mock';
import { CustomElementMock } from './custom-element.mock';

export type CustomHtmlElementMock = MockProxy<ICustomElementConnector>;

export interface ICustomHtmlElementMockSettings extends Partial<ICustomElementConnector> {
   customElement?: ICustomElement;
}

export const createCustomHtmlElementMock = (
   settings?: ICustomHtmlElementMockSettings,
): CustomHtmlElementMock => {
   const m = mock<ICustomElementConnector>({
      getAttribute: jest.fn().mockReturnValue(null),
      querySelector: jest.fn().mockReturnValue(null),
      querySelectorAll: jest.fn().mockReturnValue([]),
      hasAttribute: jest.fn().mockReturnValue(false),
      dispatchEvent: jest.fn().mockReturnValue(true),
      getBoundingClientRect: jest.fn().mockReturnValue({ width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }),
      contains: jest.fn().mockReturnValue(false),
      closest: jest.fn().mockReturnValue(null),
   });
   m.customElement = (settings?.customElement ?? new CustomElementMock(createHTMLElementMock({ tagName: HtmlTagName.Div }))) as unknown as ICustomElement;
   if (settings) {
      const { customElement: _, ...rest } = settings;
      Object.assign(m, rest);
   }
   return m;
};
