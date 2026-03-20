/* eslint-disable @typescript-eslint/no-explicit-any */
import { htmlTageNames, HtmlTagName, Input } from '@rs-x/core';
import { TestDirectiveController } from '../../lib/testing/test-directive-controller';
import {
   setupWebComponentTests,
   teardownWebComponentTests,
} from '../../lib/testing/utility';

import { Bootstrapper } from '../../lib/web-component/bootstrapper';
import { CustomElement } from '../../lib/web-component/custom-element';
import {
   ICustomElementController,
   IWebComponentController,
} from '../../lib/web-component/interfaces';
import { WebComponentController } from '../../lib/web-component/web-component-controller';
import { WebComponentElement } from '../../lib/web-component/web-component-element';
import { Directive } from '../../lib/web-component/decorators/directive/directive.decorator.function';
import { Component } from '../../lib/web-component/decorators/component/component.decorator.function';

describe('Custom element registry tests', () => {
   beforeAll(async () => {
      await setupWebComponentTests();
   });
   afterAll(async () => {
      await teardownWebComponentTests();
   });

   afterEach(() => {
      document.body.innerHTML = '';
   });

   it('Can customize table tags', async () => {
      const attachedTagNames = [];

      const tableTags = [
         HtmlTagName.Caption,
         HtmlTagName.Col,
         HtmlTagName.Colgroup,
         HtmlTagName.Table,
         HtmlTagName.Tbody,
         HtmlTagName.Td,
         HtmlTagName.Tfoot,
         HtmlTagName.Th,
         HtmlTagName.Thead,
         HtmlTagName.Tr,
      ];
      @Directive({
         prefix: 'dir',
         appliesTo: tableTags,
         controllerFactoryToken: TestDirectiveController,
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class MyDirective extends CustomElement<ICustomElementController> {
         public attach(): void {
            attachedTagNames.push(
               this.controller.element.tagName.toLowerCase()
            );
            super.attach();
         }
      }

      await Bootstrapper.registerWebComponents();

      document.body.innerHTML = `
            <table is="dir-table">
                <colgroup is="dir-colgroup">
                    <col is="dir-col">
                </colgroup>
                <caption is="dir-caption"></caption>
                <thead is="dir-thead">
                    <tr is="dir-tr">
                        <th is="dir-th"></th>
                    </tr>
                </thead>
                <tbody is="dir-tbody">
                    <tr>
                        <td is="dir-td"></td>
                    </tr>
                </tbody>
                <tfoot is="dir-tfoot">
                    <tr><td></td></tr>
                </tfoot>
            </table>
        `;

      expect(attachedTagNames.sort()).toEqual(tableTags);
   });

   it('Can create directives', async () => {
      const tagNames = [];
      const excludeTags = [
         HtmlTagName.Caption,
         HtmlTagName.Col,
         HtmlTagName.Colgroup,
         HtmlTagName.Table,
         HtmlTagName.Tbody,
         HtmlTagName.Td,
         HtmlTagName.Tfoot,
         HtmlTagName.Th,
         HtmlTagName.Thead,
         HtmlTagName.Tr,
         HtmlTagName.Html,
         HtmlTagName.Head,
         HtmlTagName.Body,
      ];
      const topLevelsTags = htmlTageNames.filter(
         (htmlTagName) => !excludeTags.includes(htmlTagName)
      );

      const stringBuilders = [];
      topLevelsTags.forEach((htmlTagName) => {
         stringBuilders.push(
            `<${htmlTagName} is="dir-${htmlTagName}"></${htmlTagName}>`
         );
      });

      @Directive({
         prefix: 'dir',
         appliesTo: topLevelsTags,
         controllerFactoryToken: TestDirectiveController,
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class MyDirective extends CustomElement<ICustomElementController> {
         public attach(): void {
            tagNames.push(this.controller.element.tagName.toLowerCase());
            super.attach();
         }
      }

      await Bootstrapper.registerWebComponents();

      document.body.innerHTML = stringBuilders.join(' ');

      const d = topLevelsTags.filter((t) => !tagNames.includes(t));

      expect(tagNames.length).toEqual(topLevelsTags.length);
   });

   it('Can create component without shadow dom', async () => {
      let tagName;

      @Component({
         selector: 'my-component-a',
         template: '<div>Hello</div>',
         controllerFactoryToken: WebComponentController,
         attachShadow: false,
         dependencies: [],
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class MyComponent extends WebComponentElement<IWebComponentController> {
         public attach(): void {
            tagName = this.controller.customElementConnector.tagName.toLowerCase();
            super.attach();
         }
      }

      await Bootstrapper.registerWebComponents();

      document.body.innerHTML = '<my-component-a></my-component-a>';

      const element = document.querySelector('my-component-a');
      expect(tagName).toEqual('my-component-a');
      expect(element.shadowRoot).toBeNull();
   });

   it('Can create component with shadow dom', async () => {
      let tagName;

      @Component({
         selector: 'my-component-b',
         template: '<div>Hello</div>',
         controllerFactoryToken: WebComponentController,
         attachShadow: true,
         dependencies: [],
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class MyComponent extends WebComponentElement<IWebComponentController> {
         public attach(): void {
            tagName = this.controller.customElementConnector.tagName.toLowerCase();
            super.attach();
         }
      }

      await Bootstrapper.registerWebComponents();

      document.body.innerHTML = '<my-component-b></my-component-b>';

      const element = document.querySelector('my-component-b');
      expect(tagName).toEqual('my-component-b');
      expect(element.shadowRoot).toBeInstanceOf(ShadowRoot);
   });

   it('every custom element type will have its own set of observed attributes', async () => {
      @Component({
         selector: 'my-component-c',
         template: '<div>Hello</div>',
         controllerFactoryToken: WebComponentController,
         attachShadow: true,
         dependencies: [],
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class MyComponentC extends WebComponentElement<IWebComponentController> {
         @Input({ reflectToAttribute: true }) public c;
      }

      @Component({
         selector: 'my-component-d',
         template: '<div>Hello</div>',
         controllerFactoryToken: WebComponentController,
         attachShadow: true,
         dependencies: [],
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      class MyComponentD extends WebComponentElement<IWebComponentController> {
         @Input({ reflectToAttribute: true }) public d;
      }

      await Bootstrapper.registerWebComponents();

      document.body.innerHTML =
         '<my-component-c></my-component-c><my-component-d></my-component-d>';

      const elementa = document.querySelector('my-component-c');
      const elementb = document.querySelector('my-component-d');

      expect((elementa.constructor as any).observedAttributes).toEqual(['c']);
      expect((elementb.constructor as any).observedAttributes).toEqual(['d']);
   });
});
