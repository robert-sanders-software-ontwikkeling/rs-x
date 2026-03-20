import {
   SubscriptionMock
} from '@rs-x/core/testing';
import {
   ExpressionMock,
   ExpressionChangeSubscriptionManagerMock,
   ExpressionChangeTransactionManagerMock
} from '@rs-x/expression-parser/testing';
import { BindingMock } from '../../../lib/testing/binding/binding.mock';
import { DomQueryMock } from '../../../lib/testing/dom-query.mock';
import { createElementMock, ElementMock } from '../../../lib/testing/element.mock';
import { BindingCollection } from '../../../lib/web-component/binding/binding-collection';
import { BindingType } from '../../../lib/web-component/binding/interfaces';


describe('Binding collection', () => {
   let defaultBindingCollection: BindingCollection;
   let defaultBindingOwnerElement: ElementMock;
   let domQuery: DomQueryMock;
   let expressionChangeSubscriptionManager: ExpressionChangeSubscriptionManagerMock;
   let expressionChangeTransactionManager: ExpressionChangeTransactionManagerMock;

   beforeEach(() => {
      defaultBindingOwnerElement = createElementMock();
      domQuery = new DomQueryMock();
      expressionChangeSubscriptionManager = new ExpressionChangeSubscriptionManagerMock();
      expressionChangeTransactionManager = new ExpressionChangeTransactionManagerMock();
      defaultBindingCollection = new BindingCollection(
         domQuery,
         expressionChangeSubscriptionManager,
         expressionChangeTransactionManager,
      );
   });

   describe('items', () => {
      it('Initially items are empty', () => {
         expect(defaultBindingCollection.items).toEqual([]);
      });

      it('Items return added items', async () => {
         const expected = [
            new BindingMock({
               bindingType: BindingType.OneTime,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.OneWay,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.OneWayText,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.TwoWay,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
         ];
         await defaultBindingCollection.addRange(expected);
         expect(defaultBindingCollection.items).toEqual(expected);
      });

      it('getBindingsForElements will return bindings with one time bindings at the front', async () => {
         const bindings = [
            new BindingMock({
               bindingType: BindingType.OneWay,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.OneTime,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.OneWayText,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.OneTime,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
            new BindingMock({
               bindingType: BindingType.TwoWay,
               bindingOwnerElement: defaultBindingOwnerElement,
            }),
         ];
         await defaultBindingCollection.addRange(bindings);

         const actual = defaultBindingCollection.getBindingsForElements([
            defaultBindingOwnerElement,
         ]);

         expect(actual).toEqual([
            bindings[1],
            bindings[3],
            bindings[0],
            bindings[2],
            bindings[4],
         ]);
      });

      it('getBindingsForElements will return bindings where the passed in element is an ancestor for the binding owned element', async () => {
         const bindingOwnerElement1 = createElementMock();
         const bindingOwnerElement2 = createElementMock();

         const bindings = [
            new BindingMock({
               bindingType: BindingType.OneWay,
               bindingOwnerElement: bindingOwnerElement1,
            }),
            new BindingMock({
               bindingType: BindingType.TwoWay,
               bindingOwnerElement: bindingOwnerElement2,
            }),
         ];
         await defaultBindingCollection.addRange(bindings);

         const element = createElementMock();

         domQuery.isAncestor.mockImplementation((ancestor, descendant) => {
            return bindingOwnerElement1 === descendant && element === ancestor;
         });

         const actual = defaultBindingCollection.getBindingsForElements([
            element,
         ]);

         expect(actual).toEqual([bindings[0]]);
      });
   });

   describe('add items', () => {
      it('addRange will only add new items', async () => {
         const binding1 = new BindingMock();
         const binding2 = new BindingMock();
         const binding3 = new BindingMock();
         await defaultBindingCollection.addRange([binding1, binding3]);

         await defaultBindingCollection.addRange([
            binding1,
            binding2,
            binding3,
         ]);
         expect(defaultBindingCollection.items).toEqual([
            binding1,
            binding3,
            binding2,
         ]);
      });

      it('addRange will emit change event', async () => {
         const bindings = [new BindingMock(), new BindingMock()];
         const expected = {
            added: bindings,
            removed: [],
         };

         let actual: unknown;
         defaultBindingCollection.changed.subscribe((v) => (actual = v));

         await defaultBindingCollection.addRange(bindings);

         expect(actual).toEqual(expected);
      });
   });

   describe('remove items', () => {
      it('removeForElements will remove all bindings for given element', async () => {
         const bindingOwnerElement = createElementMock();
         const binding1 = new BindingMock({
            bindingOwnerElement,
            bindingType: BindingType.OneWay,
         });

         const binding2 = new BindingMock({
            bindingOwnerElement,
            bindingType: BindingType.OneWay,
         });

         const binding3 = new BindingMock({
            bindingType: BindingType.OneWay,
         });
         await defaultBindingCollection.addRange([
            binding1,
            binding2,
            binding3,
         ]);

         defaultBindingCollection.removeForElements([bindingOwnerElement]);

         expect(defaultBindingCollection.items).toEqual([binding3]);
      });
   });

   describe('watch', () => {
      it('one way bindings register right expression with subscription manager when added', async () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWay });

         await defaultBindingCollection.addRange([binding]);

         expect(expressionChangeSubscriptionManager.create).toHaveBeenCalledWith(binding.right);
         expect(expressionChangeSubscriptionManager.create).not.toHaveBeenCalledWith(binding.left);
      });

      it('one way text bindings register right expression with subscription manager when added', async () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWayText });

         await defaultBindingCollection.addRange([binding]);

         expect(expressionChangeSubscriptionManager.create).toHaveBeenCalledWith(binding.right);
         expect(expressionChangeSubscriptionManager.create).not.toHaveBeenCalledWith(binding.left);
      });

      it('two way bindings register both left and right expressions with subscription manager when added', async () => {
         const binding = new BindingMock({ bindingType: BindingType.TwoWay });

         await defaultBindingCollection.addRange([binding]);

         expect(expressionChangeSubscriptionManager.create).toHaveBeenCalledWith(binding.left);
         expect(expressionChangeSubscriptionManager.create).toHaveBeenCalledWith(binding.right);
      });

      it('one time bindings do not register any expressions with subscription manager when added', async () => {
         const binding = new BindingMock({ bindingType: BindingType.OneTime });

         await defaultBindingCollection.addRange([binding]);

         expect(expressionChangeSubscriptionManager.create).not.toHaveBeenCalled();
      });

      it('suspendWatch delegates to expressionChangeTransactionManager.suspend', async () => {
         await defaultBindingCollection.addRange([
            new BindingMock({ bindingType: BindingType.TwoWay }),
         ]);

         defaultBindingCollection.suspendWatch();

         expect(expressionChangeTransactionManager.suspend).toHaveBeenCalledTimes(1);
      });

      it('continueWatch delegates to expressionChangeTransactionManager.continue', async () => {
         await defaultBindingCollection.addRange([
            new BindingMock({ bindingType: BindingType.TwoWay }),
         ]);

         defaultBindingCollection.continueWatch();

         expect(expressionChangeTransactionManager.continue).toHaveBeenCalledTimes(1);
      });
   });

   describe('events', () => {
      it('when right expression changes, valuesChanged emits rightToLeftBindings', async () => {
         const right = new ExpressionMock({ value: 'someValue' });
         const binding = new BindingMock({ bindingType: BindingType.OneWay, right });

         await defaultBindingCollection.addRange([binding]);

         let actual: unknown;
         defaultBindingCollection.valuesChanged.subscribe((v) => (actual = v));

         expressionChangeSubscriptionManager.changed.next(right);

         expect(actual).toEqual({
            rightToLeftBindings: [binding],
            leftToRightBindings: [],
         });
      });

      it('when left expression changes, valuesChanged emits leftToRightBindings', async () => {
         const binding = new BindingMock({ bindingType: BindingType.TwoWay });

         await defaultBindingCollection.addRange([binding]);

         let actual: unknown;
         defaultBindingCollection.valuesChanged.subscribe((v) => (actual = v));

         expressionChangeSubscriptionManager.changed.next(binding.left);

         expect(actual).toEqual({
            rightToLeftBindings: [],
            leftToRightBindings: [binding],
         });
      });

      it('expressionChangeSubscriptionManager.changed emitting triggers valuesChanged', async () => {
         const right = new ExpressionMock({ value: 'someValue' });
         const binding = new BindingMock({ bindingType: BindingType.OneWay, right });

         await defaultBindingCollection.addRange([binding]);

         let actual: unknown;
         defaultBindingCollection.valuesChanged.subscribe((v) => (actual = v));

         expressionChangeSubscriptionManager.changed.next(right);

         expect(actual).toEqual({
            rightToLeftBindings: [binding],
            leftToRightBindings: [],
         });
      });

      it('two bindings sharing the same right expression both appear in valuesChanged when it fires', async () => {
         const sharedRight = new ExpressionMock({ value: 'someValue' });

         const binding1 = new BindingMock({
            bindingType: BindingType.OneWay,
            right: sharedRight,
         });
         const binding2 = new BindingMock({
            bindingType: BindingType.OneWay,
            right: sharedRight,
         });

         await defaultBindingCollection.addRange([binding1, binding2]);

         let actual: unknown;
         defaultBindingCollection.valuesChanged.subscribe((v) => (actual = v));

         expressionChangeSubscriptionManager.changed.next(sharedRight);

         expect(actual).toEqual({
            rightToLeftBindings: [binding1, binding2],
            leftToRightBindings: [],
         });
      });

      it('two bindings with different right expressions each register with the subscription manager', async () => {
         const binding1 = new BindingMock({ bindingType: BindingType.OneWay });
         const binding2 = new BindingMock({ bindingType: BindingType.OneWay });

         await defaultBindingCollection.addRange([binding1, binding2]);

         expect(expressionChangeSubscriptionManager.create).toHaveBeenCalledWith(binding1.right);
         expect(expressionChangeSubscriptionManager.create).toHaveBeenCalledWith(binding2.right);
      });

      it('release is called for left and right expressions when a two-way binding is removed', async () => {
         const binding1 = new BindingMock({ bindingType: BindingType.TwoWay });
         const binding2 = new BindingMock({ bindingType: BindingType.OneWay });

         await defaultBindingCollection.addRange([binding1, binding2]);

         defaultBindingCollection.removeForElements([
            binding1.bindingOwnerElement,
         ]);

         expect(expressionChangeSubscriptionManager.release).toHaveBeenCalledWith(
            binding1.left,
         );
         expect(expressionChangeSubscriptionManager.release).toHaveBeenCalledWith(
            binding1.right,
         );
      });

      it('addRange will trigger changed event', async () => {
         const bindings = [
            new BindingMock({ bindingType: BindingType.TwoWay }),
            new BindingMock({ bindingType: BindingType.OneWay }),
         ];

         let actual: unknown;
         defaultBindingCollection.changed.subscribe((v) => (actual = v));

         await defaultBindingCollection.addRange(bindings);

         expect(actual).toEqual({
            added: bindings,
            removed: [],
         });
      });

      it('removeForElements will trigger changed event', async () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWay });
         await defaultBindingCollection.addRange([binding]);

         let actual: unknown;
         defaultBindingCollection.changed.subscribe((v) => (actual = v));

         defaultBindingCollection.removeForElements([
            binding.bindingOwnerElement,
         ]);

         expect(actual).toEqual({
            added: [],
            removed: [binding],
         });
      });

      it('valuesChanged is not emitted when right binding value is undefined', async () => {
         const right = new ExpressionMock(); // value is undefined by default
         const binding = new BindingMock({ bindingType: BindingType.OneWay, right });

         await defaultBindingCollection.addRange([binding]);

         let valuesChangedEmitted = false;
         defaultBindingCollection.valuesChanged.subscribe(() => (valuesChangedEmitted = true));

         expressionChangeSubscriptionManager.changed.next(right);

         expect(valuesChangedEmitted).toBe(false);
      });

      it('detached binding owner elements are excluded from rightToLeftBindings', async () => {
         const right = new ExpressionMock({ value: 'someValue' });
         const detachedElement = Object.assign(createElementMock(), {
            customElement: {
               controller: {
                  bindingManager: {
                     isDetached: true,
                  },
               },
            },
         });
         const binding = new BindingMock({
            bindingType: BindingType.OneWay,
            right,
            bindingOwnerElement: detachedElement,
         });

         await defaultBindingCollection.addRange([binding]);

         let valuesChangedEmitted = false;
         defaultBindingCollection.valuesChanged.subscribe(() => (valuesChangedEmitted = true));

         expressionChangeSubscriptionManager.changed.next(right);

         expect(valuesChangedEmitted).toBe(false);
      });
   });

   describe('dispose', () => {
      it('dispose will remove all items', async () => {
         await defaultBindingCollection.addRange([
            new BindingMock(),
            new BindingMock(),
         ]);
         defaultBindingCollection.dispose();
         expect(defaultBindingCollection.items.length).toEqual(0);
      });

      it('dispose will release all binding expressions via the subscription manager', async () => {
         const binding1 = new BindingMock({ bindingType: BindingType.TwoWay });
         const binding2 = new BindingMock({ bindingType: BindingType.OneWay });

         await defaultBindingCollection.addRange([binding1, binding2]);
         defaultBindingCollection.dispose();

         expect(expressionChangeSubscriptionManager.release).toHaveBeenCalledWith(
            binding1.left,
         );
         expect(expressionChangeSubscriptionManager.release).toHaveBeenCalledWith(
            binding1.right,
         );
         expect(expressionChangeSubscriptionManager.release).toHaveBeenCalledWith(
            binding2.right,
         );
      });

      it('dispose will call dispose on each binding', async () => {
         const binding1 = new BindingMock({ bindingType: BindingType.TwoWay });
         const binding2 = new BindingMock({ bindingType: BindingType.OneWay });

         await defaultBindingCollection.addRange([binding1, binding2]);
         defaultBindingCollection.dispose();

         expect(binding1.dispose).toHaveBeenCalledTimes(1);
         expect(binding2.dispose).toHaveBeenCalledTimes(1);
      });

      it('dispose will unsubscribe the global expressionChangeSubscriptionManager.changed subscription', async () => {
         const subscription = expressionChangeSubscriptionManager.changed.subscribe.mock.results[0]?.value as SubscriptionMock;

         defaultBindingCollection.dispose();

         expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
      });

      it('releaseBinding skips left release when binding.left is falsy', async () => {
         const binding = new BindingMock({
            bindingType: BindingType.OneWay,
            left: undefined,
         });
         await defaultBindingCollection.addRange([binding]);

         expect(() => defaultBindingCollection.dispose()).not.toThrow();
         expect(expressionChangeSubscriptionManager.release).not.toHaveBeenCalledWith(undefined);
      });

      it('releaseBinding skips right release when binding.right is falsy', async () => {
         const binding = new BindingMock({
            bindingType: BindingType.OneTime,
            right: undefined,
         });
         await defaultBindingCollection.addRange([binding]);

         expect(() => defaultBindingCollection.dispose()).not.toThrow();
         expect(expressionChangeSubscriptionManager.release).not.toHaveBeenCalledWith(undefined);
      });
   });

   describe('branch coverage', () => {
      it('addRange does nothing when all bindings are already present', async () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWay });
         await defaultBindingCollection.addRange([binding]);

         let changeEmitted = false;
         defaultBindingCollection.changed.subscribe(() => (changeEmitted = true));

         await defaultBindingCollection.addRange([binding]);

         expect(defaultBindingCollection.items).toEqual([binding]);
         expect(changeEmitted).toBe(false);
      });

      it('onExpressionChanged does not emit valuesChanged when expression matches no binding', async () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWay });
         await defaultBindingCollection.addRange([binding]);

         let valuesChangedEmitted = false;
         defaultBindingCollection.valuesChanged.subscribe(() => (valuesChangedEmitted = true));

         const unrelatedExpression = new ExpressionMock();
         expressionChangeSubscriptionManager.changed.next(unrelatedExpression);

         expect(valuesChangedEmitted).toBe(false);
      });
   });
});
