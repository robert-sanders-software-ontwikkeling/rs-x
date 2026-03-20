/* eslint-disable @typescript-eslint/no-explicit-any */
import { HtmlDirective } from '../../../lib/core-components/html/html.directive';
import {
   boostrapComponent,
   registerComponentTestContext,
   teardownWebComponentTests,
} from '../../../lib/testing/utility';
import {
   ICustomElement,
   ICustomElementConnector,
} from '../../../lib/web-component/interfaces';

describe('Html directive', () => {
   let rootElement: ICustomElementConnector;
   beforeAll(() => {
      registerComponentTestContext(
         '<div><template is="rsx-html" html.onetime="html"></template></div>',
         (c: IHtmlTestContext) => {
            c.sayHello = 'Hi Robert';
            c.html = '<span>[[sayHello]]</span>';
         },
         [HtmlDirective],
         null
      );
   });
   afterAll(teardownWebComponentTests);

   beforeEach(async () => {
      rootElement = await boostrapComponent();
   });

   it('Inject html wil be data bound', () => {
      expect(
         Array.from(rootElement.shadowRoot.children)[0].innerHTML.trim()
      ).toEqual(
         '<span>Hi Robert</span><template is="rsx-html" html.onetime="html"></template>'
      );
   });
});

interface IHtmlTestContext extends ICustomElement<any> {
   sayHello: string;
   html: string;
}
