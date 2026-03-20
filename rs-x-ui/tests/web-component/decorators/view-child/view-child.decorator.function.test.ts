import {
   setupWebComponentTests,
   teardownWebComponentTests,
   waitForCustomElementEvent,
} from '../../../../lib/testing/utility';
import { Component } from '../../../../lib/web-component/decorators/component/component.decorator.function';
import { ViewChild } from '../../../../lib/web-component/decorators/view-child/view-child.decorator.function';
import { IWebComponentElement } from '../../../../lib/web-component/interfaces';
import { WebComponentController } from '../../../../lib/web-component/web-component-controller';
import { WebComponentElement } from '../../../../lib/web-component/web-component-element';

describe('ViewChild decorator', () => {
   @Component({
      selector: 'my-test-component',
      template: '<div> <span _content=""> </span> </div>',
      dependencies: [],
      controllerFactoryToken: WebComponentController,
   })
   class MyViewChildTestComponent extends WebComponentElement {
      @ViewChild('content')
      public viewChild: Element;
   }

   beforeAll(async () => {
      await setupWebComponentTests();
   });
   afterAll(async () => {
      await teardownWebComponentTests();
   });

   afterEach(() => {
      document.body.innerHTML = '';
   });

   it('ViewChild decorator will add a property to a web component for fetching the defined element', async () => {
      const result = await waitForCustomElementEvent(
         [
            {
               name: 'contentElement',
               eventName: 'bound',
               forType: MyViewChildTestComponent,
               execute: (component: IWebComponentElement) => {
                  return component;
               },
            },
         ],
         '<my-test-component></my-test-component>'
      );

      const contentElement = result.contentElement.viewChild;
      expect(contentElement.hasAttribute('_content')).toEqual(true);
   });
});
