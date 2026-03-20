import { InjectionContainer, waitForEvent } from '@rs-x/core';
import { RsXCoreUIModule } from '../../../lib/rs-x-core-ui.module';
import {
   boostrapComponent,
   registerComponentTestContext,
   teardownWebComponentTests,
} from '../../../lib/testing/utility';

import { RepeaterDirective } from '../../../lib/web-component/structural-directives/repeater/repeater.directive';
import { StructuralDirectiveRegistry } from '../../../lib/web-component/structural-directives/structural-directive-registry';
import { createItem, createItems, IItem } from '../../test-data';
import { RsXUIInjectionTokens } from '../../../lib/rx-x-core-ui.injection-tokens';

import {
   ICustomElement,
   ICustomElementController,
   ICustomElementConnector,
} from '../../../lib/web-component/interfaces';
import { IStructuralDirectiveRegistry } from '../../../lib/web-component/structural-directives/structural-directive-registry.interface';

interface ITestComponent extends ICustomElement {
   items: IItem[];
   dataRows: number[][];
   onItemsBound(): void;
}

describe('repeater directive tests', () => {
   let items: IItem[];
   let structuralDirectiveRegistry: IStructuralDirectiveRegistry;
   let rootElement: ICustomElementConnector<
      ICustomElementController,
      ITestComponent
   >;
   const defaultId = 'default';

   const rows = [
      [1, 2, 3],
      [4, 5, 6],
   ];

   beforeAll(async () => {
      await InjectionContainer.load(RsXCoreUIModule);

      registerComponentTestContext(
         `    
            <select id="${defaultId}">
               <template data-repeater="item in items" ready.on="onItemsBound()">
                  <option  >
                     [[item.text]]
                  </option>
               </template>
            </select>
         `,
         (c: ITestComponent) => {
            c.items = items;
            c.dataRows = rows;
            c.onItemsBound = () => {
               console.log('yippie');
            };
         },
         [RepeaterDirective],
         null
      );
   });

   afterAll(teardownWebComponentTests);

   beforeEach(async () => {
      items = createItems(1);

      structuralDirectiveRegistry =
         InjectionContainer.get<IStructuralDirectiveRegistry>(
            RsXUIInjectionTokens.IStructuralDirectiveRegistry
         );

      const result = await waitForEvent(
         structuralDirectiveRegistry,
         'bound',
         async () => {
            rootElement = await boostrapComponent();
         }
      );

      console.log(result);
   });

   it('Item are bound correctly', () => {
      const actual = getOptionsInfo(defaultId);

      const expected = createItems(4);
      expect(actual).toEqual(expected);
   });

   it('Items are correctly bound for nested repeaters', () => {
      const actual = Array.from(
         rootElement.shadowRoot.querySelectorAll(`table tr`)
      ).map((tr: HTMLTableRowElement) =>
         Array.from(tr.cells).map((td: HTMLTableCellElement) =>
            Number(td.innerHTML)
         )
      );
      expect(actual).toEqual([
         [1, 2, 3],
         [4, 5, 6],
      ]);
   });

   it('Changing an item will rebind the belonging element', async () => {
      const repeaterElement = getRepeater(defaultId);

      const result = await waitForEvent(repeaterElement, 'bound', () => {
         const target = rootElement.customElement.items[0];
         target.text = 'Hi';
      });

      const actual = getOptionsInfo(defaultId);
      const expected = createItems(4);
      expected[0].text = 'Hi';
      expect(actual).toEqual(expected);
   });

   it('Adding an item will create the belonging element', async () => {
      const repeaterElement = getRepeater(defaultId);
      await waitForEvent(repeaterElement, 'bound', () => {
         rootElement.customElement.items.push(createItem(5));
      });

      const actual = getOptionsInfo(defaultId);
      const expected = createItems(5);
      expect(actual).toEqual(expected);
   });

   it('Deleting an item will delete the belonging element', async () => {
      const repeaterElement = getRepeater(defaultId);
      await waitForEvent(repeaterElement, 'bound', () => {
         rootElement.customElement.items.splice(1, 1);
      });

      const actual = getOptionsInfo(defaultId);
      const expected = [createItem(1), createItem(3), createItem(4)];
      expect(actual).toEqual(expected);
   });

   it('Reverse items will reverse belonging elements', () => {
      rootElement.customElement.items.reverse();
      const actual = getOptionsInfo(defaultId);
      const expected = createItems(4).reverse();
      expect(actual).toEqual(expected);
   });

   it('Sort items will sort belonging elements', () => {
      rootElement.customElement.items.sort(
         (a, b) => Number(b.value) - Number(a.value)
      );
      const actual = getOptionsInfo(defaultId);
      const expected = createItems(4).sort(
         (a, b) => Number(b.value) - Number(a.value)
      );
      expect(actual).toEqual(expected);
   });

   function getOptionsInfo(id: string): IItem[] {
      return Array.from(
         rootElement.shadowRoot.querySelectorAll(`select#${id} option`)
      ).map((option: HTMLOptionElement) => {
         return {
            value: option.value,
            text: option.textContent.trim(),
         };
      });
   }

   function getRepeater(id: string): RepeaterDirective {
      const temoplateElement = rootElement.shadowRoot.querySelector(
         `select#${id} template`
      );
      return StructuralDirectiveRegistry.instance.getDirectivesForElement(
         temoplateElement
      )[0] as RepeaterDirective;
   }
});
