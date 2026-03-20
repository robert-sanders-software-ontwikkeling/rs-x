import { waitForEvent } from '@rs-x/core';
import { RepeaterDirective } from '../../../lib/core-components/repeater/repeater.directive';
import {
   IRepeaterController,
   IRepeaterDirective,
} from '../../../lib/core-components/repeater/repeater.interfaces';
import {
   boostrapComponent,
   registerComponentTestContext,
   teardownWebComponentTests,
} from '../../../lib/testing/utility';
import { ICustomElementConnector } from '../../../lib/web-component/interfaces';
import { IItem, createItem, createItems } from '../../test-data';

describe('Repeater directive', () => {
   let items: IItem[];
   let rootElement: ICustomElementConnector;
   const defaultId = 'default';
   const withAliasId = 'withAlias';

   const rows = [
      [1, 2, 3],
      [4, 5, 6],
   ];

   beforeAll(() => {
      registerComponentTestContext(
         `    
            <select id="${defaultId}">
               <template is="rsx-repeater" items.oneway="items">
                  <option value.oneway="$data.value" >
                     [[$data.text]]
                  </option>
               </template>
            </select>
            `,
         (c) => {
            c.items = items;
            c.dataRows = rows;
         },
         [RepeaterDirective],
         null
      );
   });
   afterAll(teardownWebComponentTests);

   beforeEach(async () => {
      items = createItems(4);
      rootElement = await boostrapComponent();
   });

   it('Item are bound correctly', () => {
      const actual = getOptionsInfo(defaultId);

      const expected = createItems(4);
      expect(actual).toEqual(expected);
   });

   it('Item are bound correctly with item alias', () => {
      const actual = getOptionsInfo(withAliasId);

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

      await waitForEvent(repeaterElement.customElement, 'itemsBound', () => {
         const target = items.target[0];
         target.text = 'Hi';
      });

      const actual = getOptionsInfo(defaultId);
      const expected = createItems(4);
      expected[0].text = 'Hi';
      expect(actual).toEqual(expected);
   });

   it('Adding an item will create the belonging element', async () => {
      const repeaterElement = getRepeater(defaultId);
      await waitForEvent(repeaterElement.customElement, 'itemsBound', () => {
         items.target.push(createItem(5));
      });

      const actual = getOptionsInfo(defaultId);
      const expected = createItems(5);
      expect(actual).toEqual(expected);
   });

   it('Deleting an item will delete the belonging element', async () => {
      const repeaterElement = getRepeater(defaultId);
      await waitForEvent(repeaterElement.customElement, 'itemsBound', () => {
         items.target.splice(1, 1);
      });

      const actual = getOptionsInfo(defaultId);
      const expected = [createItem(1), createItem(3), createItem(4)];
      expect(actual).toEqual(expected);
   });

   it('Reverse items will reverse belonging elements', () => {
      items.target.reverse();
      const actual = getOptionsInfo(defaultId);
      const expected = createItems(4).reverse();
      expect(actual).toEqual(expected);
   });

   it('Sort items will sort belonging elements', () => {
      items.target.sort((a, b) => Number(b.value) - Number(a.value));
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

   function getRepeater(
      id: string
   ): ICustomElementConnector<IRepeaterController, IRepeaterDirective> {
      return Type.cast(
         rootElement.shadowRoot.querySelector(`select#${id} template`)
      );
   }
});
