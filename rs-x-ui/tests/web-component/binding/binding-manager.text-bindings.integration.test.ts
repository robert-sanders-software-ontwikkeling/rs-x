import { interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InjectionContainer } from '@rs-x/core';
import { IExpressionFactory, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { ErrorLogMock } from '@rs-x/core/testing';
import { RsXCoreUIModule, unloadRsXCoreUIModule } from '../../../lib/rs-x-ui.module';
import { RsXUIInjectionTokens } from '../../../lib/rx-x-ui.injection-tokens';
import { IBindingCollection, IBindingsParser } from '../../../lib/web-component/binding/interfaces';
import { IInputContext } from '../../../lib/web-component/decorators/input/input-context.interface';
import { BindingManager } from '../../../lib/web-component/binding/binding-manager';
import { IDomElementData } from '../../../lib/dom-element-data/dom-element-data.interface';
import { componentPropertyName } from '../../../lib/web-component/interfaces';

// ──────────────────────────────────────────────────────────────────────────────
// Integration tests for text bindings in BindingManager.
//
// Text bindings (syntax: `[[ expression ]]` in a text node):
//   - Produce BindingType.OneWayText bindings — they react to source changes
//     just like one-way attribute bindings.
//   - The right expression is a TemplateLiteralExpression whose inner
//     IdentifierExpression children are non-root, so commit() fires
//     synchronously during bind(), making binding.right.value immediately
//     available for rebindElements without waiting for a change cycle.
//   - Reactive updates arrive after one microtask tick (queueMicrotask inside
//     ExpressionChangeTransactionManager.tryCommit).
//   - The left expression writes to the nearest ancestor's textContent
//     property (resolved via DomIdentifierOwnerResolver walking up the DOM).
// ──────────────────────────────────────────────────────────────────────────────

describe('BindingManager – text bindings (integration)', () => {
   let sut: BindingManager;
   let errorLog: ErrorLogMock;

   beforeAll(async () => {
      await InjectionContainer.load(RsXCoreUIModule);
   });

   afterAll(async () => {
      await unloadRsXCoreUIModule();
   });

   beforeEach(() => {
      errorLog = new ErrorLogMock();

      sut = new BindingManager(
         document.createElement('div'),
         InjectionContainer.get<IInputContext>(RsXUIInjectionTokens.IInputContext),
         InjectionContainer.get<IBindingCollection>(RsXUIInjectionTokens.IBindingCollection),
         errorLog,
         InjectionContainer.get<IBindingsParser>(RsXUIInjectionTokens.IBindingsParser),
         InjectionContainer.get<IExpressionFactory>(RsXExpressionParserInjectionTokens.IExpressionFactory),
      );
   });

   afterEach(() => {
      sut.detachBindings();
   });

   // ── helpers ───────────────────────────────────────────────────────────────

   /**
    * Creates a standalone element (no parent) with a text binding `[[ id ]]`
    * that reads from `element.id`.
    *
    * Standalone means DomIdentifierOwnerResolver resolves identifiers by
    * falling back to the element itself (no DOM ancestor to walk up to).
    * The left expression (textContent) also resolves on the element, so
    * left.setValue(value) sets element.textContent directly.
    */
   function createElement(idValue: string): HTMLElement {
      const element = document.createElement('span');
      element.id = idValue;
      element.appendChild(document.createTextNode('[[ id ]]'));
      return element;
   }

   /**
    * Flush one pending microtask tick — needed after property changes so that
    * ExpressionChangeTransactionManager.tryCommit can emit the committed value.
    */
   const nextTick = () => Promise.resolve();

   // ── initial value application ─────────────────────────────────────────────

   describe('initial value application', () => {
      it('applies the source value when rebindElements is called', () => {
         const element = createElement('hello-world');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.textContent).toBe('hello-world');
      });

      it('applies a static string template', () => {
         const element = document.createElement('span');
         element.appendChild(document.createTextNode("[[ 'static text' ]]"));

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.textContent).toBe('static text');
      });

      it('applies a mixed template with literal and expression parts', () => {
         const element = document.createElement('span');
         element.id = 'world';
         element.appendChild(document.createTextNode('Hello [[ id ]]!'));

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.textContent).toBe('Hello world!');
      });

      it('uses the source value at the moment rebindElements is called', () => {
         const element = createElement('first');

         sut.attachBindings([element]);
         element.id = 'second';  // change source before initial apply
         sut.rebindElements([element]);

         expect(element.textContent).toBe('second');
      });
   });

   // ── reactive updates ──────────────────────────────────────────────────────

   describe('reactive updates', () => {
      it('updates the text when the source property changes after rebindElements', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);
         sut.rebindElements([element]);
         expect(element.textContent).toBe('initial');

         element.id = 'updated';
         await nextTick();

         expect(element.textContent).toBe('updated');
      });

      it('does not require rebindElements for updates after the first change', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);

         element.id = 'reactive-value';
         await nextTick();

         expect(element.textContent).toBe('reactive-value');
      });

      it('tracks multiple sequential changes', async () => {
         const element = createElement('first');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         element.id = 'second';
         await nextTick();
         expect(element.textContent).toBe('second');

         element.id = 'third';
         await nextTick();
         expect(element.textContent).toBe('third');
      });

      it('stops updating after detachBindings is called', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);
         sut.rebindElements([element]);
         sut.detachBindings();

         element.id = 'changed';
         await nextTick();

         expect(element.textContent).toBe('initial');
      });
   });

   // ── parent-component resolution ───────────────────────────────────────────

   describe('parent-component resolution', () => {
      let domElementData: IDomElementData;

      beforeEach(() => {
         domElementData = InjectionContainer.get<IDomElementData>(RsXUIInjectionTokens.IDomElementData);
      });

      /**
       * Creates a parent element with a registered component owning `myProp`,
       * and a child element with a registered component owning `textContent`
       * (so the left expression stays anchored on the child component instance
       * rather than walking up to the parent element's textContent).
       *
       * The child's text node `[[ myProp ]]` resolves `myProp` from the parent
       * component and writes to `childComponent.textContent`.
       */
      function createParentChildPair(initialValue: string): {
         parentComponent: { myProp: string };
         childComponent: { textContent: string };
         child: HTMLElement;
      } {
         const parentComponent = { myProp: initialValue };
         const parent = document.createElement('div');
         domElementData.register(parent, componentPropertyName, parentComponent);

         const childComponent = { textContent: '' };
         const child = document.createElement('span');
         domElementData.register(child, componentPropertyName, childComponent);
         child.appendChild(document.createTextNode('[[ myProp ]]'));
         parent.appendChild(child);

         return { parentComponent, childComponent, child };
      }

      it('applies the parent component value when rebindElements is called', () => {
         const { childComponent, child } = createParentChildPair('hello-from-parent');

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         expect(childComponent.textContent).toBe('hello-from-parent');
      });

      it('updates the child text when the parent component property changes', async () => {
         const { parentComponent, childComponent, child } = createParentChildPair('initial');

         sut.attachBindings([child]);
         sut.rebindElements([child]);
         expect(childComponent.textContent).toBe('initial');

         parentComponent.myProp = 'updated';
         await nextTick();

         expect(childComponent.textContent).toBe('updated');
      });

      it('tracks multiple sequential changes to the parent component property', async () => {
         const { parentComponent, childComponent, child } = createParentChildPair('first');

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         parentComponent.myProp = 'second';
         await nextTick();
         expect(childComponent.textContent).toBe('second');

         parentComponent.myProp = 'third';
         await nextTick();
         expect(childComponent.textContent).toBe('third');
      });

      it('stops updating after detachBindings is called', async () => {
         const { parentComponent, childComponent, child } = createParentChildPair('initial');

         sut.attachBindings([child]);
         sut.rebindElements([child]);
         sut.detachBindings();

         parentComponent.myProp = 'changed';
         await nextTick();

         expect(childComponent.textContent).toBe('initial');
      });
   });

   // ── async data ────────────────────────────────────────────────────────────

   describe('async data', () => {
      let domElementData: IDomElementData;

      beforeEach(() => {
         domElementData = InjectionContainer.get<IDomElementData>(RsXUIInjectionTokens.IDomElementData);
      });

      function createParentChildPair(asyncProp: Promise<string> | Observable<string> | string): {
         parentComponent: { myProp: typeof asyncProp };
         childComponent: { textContent: string };
         child: HTMLElement;
      } {
         const parentComponent = { myProp: asyncProp };
         const parent = document.createElement('div');
         domElementData.register(parent, componentPropertyName, parentComponent);

         const childComponent = { textContent: '' };
         const child = document.createElement('span');
         domElementData.register(child, componentPropertyName, childComponent);
         child.appendChild(document.createTextNode('[[ myProp ]]'));
         parent.appendChild(child);

         return { parentComponent, childComponent, child };
      }

      it('propagates the resolved Promise value when it arrives', async () => {
         jest.useFakeTimers();
         try {
            const { childComponent, child } = createParentChildPair(
               new Promise<string>(resolve => setTimeout(() => resolve('async-value'), 2000)),
            );

            sut.attachBindings([child]);

            jest.advanceTimersByTime(2000);
            await Promise.resolve();

            sut.rebindElements([child]);
            expect(childComponent.textContent).toBe('async-value');
         } finally {
            jest.useRealTimers();
         }
      });

      it('propagates each value emitted by an interval Observable', async () => {
         jest.useFakeTimers();
         try {
            const { childComponent, child } = createParentChildPair(
               interval(1000).pipe(map(i => `tick-${i + 1}`)),
            );

            sut.attachBindings([child]);

            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
            expect(childComponent.textContent).toBe('tick-1');

            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
            expect(childComponent.textContent).toBe('tick-2');

            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
            expect(childComponent.textContent).toBe('tick-3');
         } finally {
            jest.useRealTimers();
         }
      });
   });

   // ── lifecycle ─────────────────────────────────────────────────────────────

   describe('lifecycle', () => {
      it('emits bound event after attachBindings', () => {
         const element = createElement('test');
         let count = 0;
         sut.bound.subscribe(() => count++);

         sut.attachBindings([element]);

         expect(count).toBe(1);
      });

      it('emits bound event on each reactive value change', async () => {
         const element = createElement('initial');
         sut.attachBindings([element]);
         sut.rebindElements([element]);

         let count = 0;
         sut.bound.subscribe(() => count++);

         element.id = 'changed-1';
         await nextTick();
         element.id = 'changed-2';
         await nextTick();

         expect(count).toBe(2);
      });

      it('detachBindings disposes bindings without throwing', () => {
         const element = createElement('test');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(() => sut.detachBindings()).not.toThrow();
      });

      it('detachBindings can be called before attachBindings without throwing', () => {
         expect(() => sut.detachBindings()).not.toThrow();
      });
   });
});
