import { ConstructorType, InjectionContainer } from '@rs-x/core';
import { createHTMLElementMock, HTMLElementMock } from '../../../../lib/testing/html-element.mock';
import { RsXCoreUIModule } from '../../../../lib/rs-x-core-ui.module';
import { RsXUIInjectionTokens } from '../../../../lib/rx-x-core-ui.injection-tokens';
import { IViewChildContext } from '../../../../lib/web-component/decorators/view-child/view-child-context.interface';
import { IViewChildMetadata } from '../../../../lib/web-component/decorators/view-child/view-child-metadata.interface';
import { ViewChild } from '../../../../lib/web-component/decorators/view-child/view-child.decorator.function';

interface ITestClass {
   readonly querySelector: jest.Mock;
   readonly aViewChild: HTMLElement;
   readonly bViewChild: HTMLElement;
}

describe('View child context tests', () => {
   let viewChildContext: IViewChildContext;
   let TestClass: ConstructorType<ITestClass>;

   function createTestClass(): ConstructorType<ITestClass> {
      class WithViewChildren {
         @ViewChild('a')
         public aViewChild: HTMLElement;
         @ViewChild('b')
         public bViewChild: HTMLElement;

         public readonly querySelector = jest.fn();
      }

      return WithViewChildren;
   }

   beforeAll(async () => {
      await InjectionContainer.load(RsXCoreUIModule);
      TestClass = createTestClass();
      viewChildContext = InjectionContainer.get(
         RsXUIInjectionTokens.IViewChildContext
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXCoreUIModule);
   });

   it('getViewChildren returns metadata for all view children for specified type', () => {
      const actual = viewChildContext.getViewChildren(TestClass);
      const expected: IViewChildMetadata[] = [
         {
            name: 'a',
            propertyKey: 'aViewChild',
            key: Symbol.for('aViewChild'),
         },
         {
            name: 'b',
            propertyKey: 'bViewChild',
            key: Symbol.for('bViewChild'),
         },
      ];
      expect(actual).toEqual(expected);
   });

   it('getViewChild returns metadata for given view child and specified type', () => {
      const actual = viewChildContext.getViewChild(TestClass, 'bViewChild');
      const expected: IViewChildMetadata = {
         name: 'b',
         propertyKey: 'bViewChild',
         key: Symbol.for('bViewChild'),
      };
      expect(actual).toEqual(expected);
   });

   it('clearViewChildren will clear the cached view children', () => {
      const instance = new TestClass();

      let aViewChildValue = createHTMLElementMock();
      let bViewChildValue = createHTMLElementMock();

      jest.spyOn(instance, 'querySelector').mockImplementation((selector) => {
         if (selector === '[_a]') {
            return aViewChildValue;
         } else if (selector === '[_b]') {
            return bViewChildValue;
         } else {
            throw new Error('Invalid selector');
         }
      });

      expect(instance.aViewChild).toBe(aViewChildValue);
      expect(instance.bViewChild).toBe(bViewChildValue);

      viewChildContext.clearViewChildren(instance);

      aViewChildValue = createHTMLElementMock();
      bViewChildValue = createHTMLElementMock();

      expect(instance.aViewChild).toBe(aViewChildValue);
      expect(instance.bViewChild).toBe(bViewChildValue);
   });
});
