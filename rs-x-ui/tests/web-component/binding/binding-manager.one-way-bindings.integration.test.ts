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
// Integration tests for one-way bindings in BindingManager.
//
// One-way bindings (attribute suffix `.oneway`):
//   - Subscribe to expression changes — the target updates automatically
//     whenever the source property changes (reactive).
//   - Initial value is applied explicitly via `rebindElements`, just like
//     one-time bindings.  This is because the expression system's change cycle
//     (startChangeCycle / endChangeCycle / queueMicrotask) defers the first
//     commit until the next external property set, so the value is not yet
//     visible inside `attachBindings`.
//   - After `rebindElements` is called (or after the first property change),
//     the binding continues to auto-update whenever the right-side expression
//     changes.
//   - Stopped only when `detachBindings` is called.
//
// Key contrast with one-time bindings:
//   - One-time: `rebindElements` applies a snapshot; no further updates ever.
//   - One-way:  `rebindElements` applies the initial value; subsequent changes
//               propagate automatically after one microtask tick.
// ──────────────────────────────────────────────────────────────────────────────

describe('BindingManager – one-way bindings (integration)', () => {
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
    * Creates a standalone element (no parent) with a one-way binding that reads
    * `element.id` and writes to `element.title`.
    *
    * Non-self-referential (`title` ≠ `id`) so rightContext = element itself.
    */
   function createElement(idValue: string): HTMLElement {
      const element = document.createElement('div');
      element.id = idValue;
      element.setAttribute('title.oneway', 'id');
      return element;
   }

   /**
    * Flush one pending microtask tick so that queueMicrotask callbacks inside
    * ExpressionChangeTransactionManager.tryCommit run before assertions.
    */
   const nextTick = () => Promise.resolve();

   // ── initial value application ─────────────────────────────────────────────

   describe('initial value application', () => {
      it('applies the source value when rebindElements is called', () => {
         const element = createElement('hello-world');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.title).toBe('hello-world');
      });

      it('applies a literal string expression', () => {
         const element = document.createElement('div');
         element.setAttribute('title.oneway', "'static title'");

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.title).toBe('static title');
      });

      it('applies multiple one-way bindings on the same element', () => {
         const element = document.createElement('div');
         element.setAttribute('title.oneway', "'my-title'");
         element.setAttribute('id.oneway', "'my-id'");

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         expect(element.title).toBe('my-title');
         expect(element.id).toBe('my-id');
      });

      it('uses the source value at the moment rebindElements is called', () => {
         const element = createElement('first');

         sut.attachBindings([element]);
         element.id = 'second';  // change source before initial apply
         sut.rebindElements([element]);

         expect(element.title).toBe('second');
      });
   });

   // ── reactive updates ──────────────────────────────────────────────────────

   describe('reactive updates', () => {
      it('updates the element when the source property changes after rebindElements', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);
         sut.rebindElements([element]);
         expect(element.title).toBe('initial');

         element.id = 'updated';
         await nextTick();

         expect(element.title).toBe('updated');
      });

      it('does not require rebindElements for updates after the first change', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);

         // No rebindElements — but a reactive change should still propagate.
         element.id = 'reactive-value';
         await nextTick();

         expect(element.title).toBe('reactive-value');
      });

      it('tracks multiple sequential changes', async () => {
         const element = createElement('first');

         sut.attachBindings([element]);
         sut.rebindElements([element]);

         element.id = 'second';
         await nextTick();
         expect(element.title).toBe('second');

         element.id = 'third';
         await nextTick();
         expect(element.title).toBe('third');
      });

      it('stops updating after detachBindings is called', async () => {
         const element = createElement('initial');

         sut.attachBindings([element]);
         sut.rebindElements([element]);
         sut.detachBindings();

         element.id = 'changed';
         await nextTick();

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
       * Creates a parent element with a registered component that owns `myProp`,
       * and a child element with a registered component that owns `title`.
       * The child's `title.oneway="myProp"` binding reads `myProp` from the parent
       * component and writes it to the child component's `title` property.
       */
      function createParentChildPair(initialValue: string): {
         parentComponent: { myProp: string };
         childComponent: { title: string };
         child: HTMLElement;
      } {
         const parentComponent = { myProp: initialValue };
         const parent = document.createElement('div');
         domElementData.register(parent, componentPropertyName, parentComponent);

         const childComponent = { title: '' };
         const child = document.createElement('div');
         domElementData.register(child, componentPropertyName, childComponent);
         child.setAttribute('title.oneway', 'myProp');
         parent.appendChild(child);

         return { parentComponent, childComponent, child };
      }

      it('applies the parent component value when rebindElements is called', () => {
         const { childComponent, child } = createParentChildPair('hello-from-parent');

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         expect(childComponent.title).toBe('hello-from-parent');
      });

      it('updates the child component property when the parent component property changes', async () => {
         const { parentComponent, childComponent, child } = createParentChildPair('initial');

         sut.attachBindings([child]);
         sut.rebindElements([child]);
         expect(childComponent.title).toBe('initial');

         parentComponent.myProp = 'updated';
         await nextTick();

         expect(childComponent.title).toBe('updated');
      });

      it('tracks multiple sequential changes to the parent component property', async () => {
         const { parentComponent, childComponent, child } = createParentChildPair('first');

         sut.attachBindings([child]);
         sut.rebindElements([child]);

         parentComponent.myProp = 'second';
         await nextTick();
         expect(childComponent.title).toBe('second');

         parentComponent.myProp = 'third';
         await nextTick();
         expect(childComponent.title).toBe('third');
      });

      it('resolves self-referential binding (title.oneway="title") from parent component and reacts to changes', async () => {
         // When propertyKey === bindingExpression, BindingsParser sets rightContext = ownerElement.parentNode
         // so the right expression reads from the parent component, not the child element itself.
         const parentComponent = { title: 'parent-title' };
         const parent = document.createElement('div');
         domElementData.register(parent, componentPropertyName, parentComponent);

         const childComponent = { title: '' };
         const child = document.createElement('div');
         domElementData.register(child, componentPropertyName, childComponent);
         child.setAttribute('title.oneway', 'title');  // self-referential: propertyKey === bindingExpression
         parent.appendChild(child);

         sut.attachBindings([child]);
         sut.rebindElements([child]);
         expect(childComponent.title).toBe('parent-title');

         parentComponent.title = 'updated-title';
         await nextTick();
         expect(childComponent.title).toBe('updated-title');
      });

      it('stops updating after detachBindings is called', async () => {
         const { parentComponent, childComponent, child } = createParentChildPair('initial');

         sut.attachBindings([child]);
         sut.rebindElements([child]);
         sut.detachBindings();

         parentComponent.myProp = 'changed';
         await nextTick();

         expect(childComponent.title).toBe('initial');
      });
   });

   // ── async data ────────────────────────────────────────────────────────────

   describe('async data', () => {
      let domElementData: IDomElementData;

      beforeEach(() => {
         domElementData = InjectionContainer.get<IDomElementData>(RsXUIInjectionTokens.IDomElementData);
      });

      it('propagates the resolved value when the property itself is a Promise', async () => {
         jest.useFakeTimers();
         try {
            // myProp IS the async value — a Promise that resolves after 2 seconds.
            // The expression system wraps it in a PromiseObserver which calls
            // .then(onValueResolved); when it resolves, the state change propagates
            // through the binding automatically, no rebindElements needed.
            const parentComponent: { myProp: Promise<string> | string } = {
               myProp: new Promise<string>(resolve => setTimeout(() => resolve('async-value'), 2_000)),
            };
            const parent = document.createElement('div');
            domElementData.register(parent, componentPropertyName, parentComponent);

            const childComponent = { title: '' };
            const child = document.createElement('div');
            domElementData.register(child, componentPropertyName, childComponent);
            child.setAttribute('title.oneway', 'myProp');
            parent.appendChild(child);

            sut.attachBindings([child]);

            // Resolve the Promise by advancing fake timers.
            jest.advanceTimersByTime(2_000);

            // Flush: Promise.then (native microtask) + queueMicrotask from the
            // expression commit cycle.
            await Promise.resolve();
            jest.runAllTicks();

            expect(childComponent.title).toBe('async-value');
         } finally {
            jest.useRealTimers();
         }
      });

      it('propagates each value emitted by an interval Observable', async () => {
         jest.useFakeTimers();
         try {
            // myProp IS an Observable — a live data stream that emits a new string
            // every second.  The expression system wraps it in an ObservableProxy
            // that subscribes and fires a state change on each emission.
            const parentComponent: { myProp: Observable<string> | string } = {
               myProp: interval(1000).pipe(map(i => `tick-${i + 1}`)),
            };
            const parent = document.createElement('div');
            domElementData.register(parent, componentPropertyName, parentComponent);

            const childComponent = { title: '' };
            const child = document.createElement('div');
            domElementData.register(child, componentPropertyName, childComponent);
            child.setAttribute('title.oneway', 'myProp');
            parent.appendChild(child);

            sut.attachBindings([child]);

            // First tick — Observable emits 'tick-1'.
            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
            expect(childComponent.title).toBe('tick-1');

            // Second tick — Observable emits 'tick-2'.
            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
            expect(childComponent.title).toBe('tick-2');

            // Third tick — Observable emits 'tick-3'.
            jest.advanceTimersByTime(1000);
            jest.runAllTicks();
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

      it('emits bound event even when attachBindings encounters a parse error', () => {
         const element = document.createElement('div');
         element.setAttribute('unknownprop.oneway', 'value');

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
