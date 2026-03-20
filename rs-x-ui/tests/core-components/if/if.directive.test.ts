/* eslint-disable @typescript-eslint/no-explicit-any */
import { IfDirective } from '../../../lib/core-components/if/if.directive';
import {
   ICustomElement,
   ICustomElementController,
   ICustomElementConnector,
} from '../../../lib/web-component/interfaces';
import {
   boostrapComponent,
   registerComponentTestContext,
   teardownWebComponentTests,
} from '../../../lib/testing/utility';

describe('If directive', () => {
   let rootElement: ICustomElementConnector<
      ICustomElementController,
      IIfTestContext
   >;
   beforeAll(() => {
      registerComponentTestContext(
         `
                <div>
                    <template is="rsx-if" show.oneway="show">
                        [[sayHello]]
                        <div id="withClick" on-click="window.console.log('hi')">
                        </div>
                    </template>
                </div>
            `,
         (c: IIfTestContext) => {
            c.sayHello = 'Hi robert';
            c.show = false;
         },
         [IfDirective],
         null
      );
   });
   afterAll(teardownWebComponentTests);

   beforeEach(async () => {
      rootElement = await boostrapComponent();
   });

   it('If show is initially false content will not been added', () => {
      expect(rootElement.shadowRoot.textContent.trim()).toEqual('');
   });

   it('Content will be added when setting show to true', () => {
      rootElement.customElement.show = true;
      expect(rootElement.shadowRoot.textContent.trim()).toEqual('Hi robert');
   });

   it('Content will be removed when settting from true to false', () => {
      rootElement.customElement.show = true;
      expect(rootElement.shadowRoot.textContent.trim()).toEqual('Hi robert');
      rootElement.customElement.show = false;
      expect(rootElement.shadowRoot.textContent.trim()).toEqual('');
   });

   it('events will be bind when setting show to true', () => {
      rootElement.customElement.show = true;
      const logSpy = jest.spyOn(window.console, 'log');
      const clickTarget: HTMLElement =
         rootElement.shadowRoot.querySelector('#withClick');
      clickTarget.click();
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenNthCalledWith(1, 'hi');
   });
});

interface IIfTestContext extends ICustomElement<any> {
   sayHello: string;
   show: boolean;
}
