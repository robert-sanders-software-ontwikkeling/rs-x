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
// Integration tests for one-time bindings in BindingManager.
//
// One-time bindings (attribute suffix `.onetime`):
//   - Are NOT subscribed to expression changes (no reactive updates).
//   - Are applied once when `rebindElements` is called explicitly.
//   - Never update the target again, even if the source expression changes.
//
// Test element setup:
//   A standalone (parentless) element is used so that DomIdentifierOwnerResolver
//   resolves identifiers to the element itself rather than walking up the DOM.
//   Non-self-referential bindings (e.g. `title.onetime="id"`) allow the right
//   expression to watch `element.id` while the left expression sets `element.title`.
// ──────────────────────────────────────────────────────────────────────────────

describe('BindingManager – one-time bindings (integration)', () => {
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
    * Creates a standalone element (no parent) with a one-time binding that reads
    * `element.id` and writes to `element.title`.
    *
    * Because `propertyKey ("title") !== bindingExpression ("id")`, the parser uses
    * the element itself as the right-side context — no DOM traversal occurs.
    */
   function createElement(idValue: string): HTMLElement {
      const element = document.createElement('div');
      element.id = idValue;
      element.setAttribute('title.onetime', 'id');
      return element;
   }

   // ── initial value application ─────────────────────────────────────────────

   describe('value application', () => {
      it('does not apply value before rebindElements is called', () => {
         const element = createElement('hello');

         sut.attachBindings([element]);

         expect(element.title).toBe('');
      });

      it('applies the source value when rebindElements is called', () => {
         const element = createElement('hello-world');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.title).toBe('hello-world');
      });

      it('applies a literal string expression', () => {
         const element = document.createElement('div');
         // "'static title'" is a string literal – rightContext = element itself
         element.setAttribute('title.onetime', "'static title'");

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.title).toBe('static title');
      });

      it('applies multiple one-time bindings on the same element', () => {
         const element = document.createElement('div');
         element.setAttribute('title.onetime', "'my-title'");
         element.setAttribute('id.onetime', "'my-id'");

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.title).toBe('my-title');
         expect(element.id).toBe('my-id');
      });

      it('uses the source value at the moment rebindElements is called', () => {
         const element = createElement('first');

         sut.attachBindings([element]);
         element.id = 'second';   // change source before first apply
         sut.rebindElements([element]);

         expect(element.title).toBe('second');
      });
   });

   // ── no reactive updates ───────────────────────────────────────────────────

   describe('no reactive updates', () => {
      it('does not update the element when the source changes after rebindElements', () => {
         const element = createElement('initial');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         element.id = 'changed';

         // No subscription exists for one-time bindings, so the change cannot propagate.
         expect(element.title).toBe('initial');
      });

      it('does not update even after a microtask tick', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         element.id = 'changed';
         await Promise.resolve(); // flush microtask queue

         expect(element.title).toBe('initial');
      });
   });

   // ── parent-component resolution ───────────────────────────────────────────

   describe('parent-component resolution', () => {
      let domElementData: IDomElementData;

      beforeEach(() => {
         domElementData = InjectionContainer.get<IDomElementData>(RsXUIInjectionTokens.IDomElementData);
      });

      /**
       * Simulates a component-in-component template scenario:
       * - parent registers a component with property `myProp`
       * - child registers a component with property `title` (so the left expression
       *   resolves to the child component instance, not the parent DOM element)
       * - child's `title.onetime="myProp"` binding reads `myProp` from the parent
       *   component and writes it to the child component's `title` property
       */
      function createParentChildPair(parentPropValue: string): {
         parentComponent: { myProp: string };
         childComponent: { title: string };
         child: HTMLElement;
      } {
         const parentComponent = { myProp: parentPropValue };
         const parent = document.createElement('div');
         domElementData.register(parent, componentPropertyName, parentComponent);

         const childComponent = { title: '' };
         const child = document.createElement('div');
         domElementData.register(child, componentPropertyName, childComponent);
         child.setAttribute('title.onetime', 'myProp');
         parent.appendChild(child);

         return { parentComponent, childComponent, child };
      }

      it('resolves binding expression from parent component when child does not own the property', () => {
         const { childComponent, child } = createParentChildPair('hello-from-parent');

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         expect(childComponent.title).toBe('hello-from-parent');
      });

      it('uses the parent component value at the moment rebindElements is called', () => {
         const { parentComponent, childComponent, child } = createParentChildPair('initial');

         sut.attachBindings([child]);
         parentComponent.myProp = 'updated';
         sut.rebindElements([child]);

         expect(childComponent.title).toBe('updated');
      });

      it('does not reactively update when parent component property changes after rebindElements', () => {
         const { parentComponent, childComponent, child } = createParentChildPair('initial');

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         parentComponent.myProp = 'changed';

         expect(childComponent.title).toBe('initial');
      });

      it('resolves self-referential binding (title.onetime="title") from parent component, not the child element', () => {
         // When propertyKey === bindingExpression, BindingsParser sets rightContext = ownerElement.parentNode
         // so the right expression is forced to resolve on the parent rather than binding the element to itself.
         const parentComponent = { title: 'parent-title' };
         const parent = document.createElement('div');
         domElementData.register(parent, componentPropertyName, parentComponent);

         const childComponent = { title: '' };
         const child = document.createElement('div');
         domElementData.register(child, componentPropertyName, childComponent);
         child.setAttribute('title.onetime', 'title');  // self-referential: propertyKey === bindingExpression
         parent.appendChild(child);

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         expect(childComponent.title).toBe('parent-title');
      });
   });

   // ── async data ────────────────────────────────────────────────────────────

   describe('async data', () => {
      let domElementData: IDomElementData;

      beforeEach(() => {
         domElementData = InjectionContainer.get<IDomElementData>(RsXUIInjectionTokens.IDomElementData);
      });

      it('applies the resolved Promise value when rebindElements is called after resolution', async () => {
         jest.useFakeTimers();
         try {
            // myProp IS the async value — a Promise that resolves after 2 seconds.
            const parentComponent: { myProp: Promise<string> | string } = {
               myProp: new Promise<string>(resolve => setTimeout(() => resolve('async-value'), 2000)),
            };
            const parent = document.createElement('div');
            domElementData.register(parent, componentPropertyName, parentComponent);

            const childComponent = { title: '' };
            const child = document.createElement('div');
            domElementData.register(child, componentPropertyName, childComponent);
            child.setAttribute('title.onetime', 'myProp');
            parent.appendChild(child);

            sut.attachBindings([child]);

            // Resolve the Promise by advancing fake timers, then flush the
            // Promise.then microtask so the expression value is updated.
            jest.advanceTimersByTime(2000);
            await Promise.resolve();

            // Caller rebinds once data is ready — binding picks up the resolved value.
            sut.rebindElements([child]);
            expect(childComponent.title).toBe('async-value');
         } finally {
            jest.useRealTimers();
         }
      });

      it('applies the latest Observable value at the moment rebindElements is called', () => {
         jest.useFakeTimers();
         try {
            // myProp IS an Observable that emits a new string every second.
            const parentComponent: { myProp: Observable<string> | string } = {
               myProp: interval(1000).pipe(map(i => `tick-${i + 1}`)),
            };
            const parent = document.createElement('div');
            domElementData.register(parent, componentPropertyName, parentComponent);

            const childComponent = { title: '' };
            const child = document.createElement('div');
            domElementData.register(child, componentPropertyName, childComponent);
            child.setAttribute('title.onetime', 'myProp');
            parent.appendChild(child);

            sut.attachBindings([child]);

            // Advance to tick-2 — expression value is now 'tick-2'.
            jest.advanceTimersByTime(2000);
            jest.runAllTicks();

            // rebindElements takes a snapshot of the current expression value.
            sut.rebindElements([child]);
            expect(childComponent.title).toBe('tick-2');

            // Observable keeps emitting but one-time binding does NOT auto-update.
            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
            expect(childComponent.title).toBe('tick-2');

            // Only an explicit rebindElements picks up the new value.
            sut.rebindElements([child]);
            expect(childComponent.title).toBe('tick-3');
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

      it('emits bound event even when attachBindings encounters a parse error', () => {
         const element = document.createElement('div');
         // "unknownprop" is not a registered HTML attribute – parse will throw.
         element.setAttribute('unknownprop.onetime', 'value');

         let count = 0;
         sut.bound.subscribe(() => count++);

         sut.attachBindings([element]);

         expect(errorLog.add).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Failed to attach bindings' }),
         );
         expect(count).toBe(1);
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
