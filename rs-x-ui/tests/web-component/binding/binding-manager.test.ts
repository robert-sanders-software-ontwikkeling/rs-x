import { ErrorLogMock } from '@rs-x/core/testing';
import { IdentifierExpression } from '@rs-x/expression-parser';
import {
   ExpressionFactoryMock,
   ExpressionMock,
   IdentifierExpressionMock,
} from '@rs-x/expression-parser/testing';
import { BindingCollectionMock } from '../../../lib/testing/binding/binding-collection.mock';
import { BindingMock } from '../../../lib/testing/binding/binding.mock';
import { BindingParserMock } from '../../../lib/testing/binding/binding-parser.mock';
import {
   createCustomHtmlElementMock,
   CustomHtmlElementMock,
} from '../../../lib/testing/custom-html-element.mock';
import { InputContextMock } from '../../../lib/testing/input-context.mock';
import { InputMetadataMock } from '../../../lib/testing/input-meta-data.mock';
import { BindingManager } from '../../../lib/web-component/binding/binding-manager';
import {
   BindingType,
   IChangedBindingValues,
} from '../../../lib/web-component/binding/interfaces';

describe('BindingManager', () => {
   let ownerElement: CustomHtmlElementMock;
   let inputContext: InputContextMock;
   let bindingCollection: BindingCollectionMock;
   let errorLog: ErrorLogMock;
   let bindingsParser: BindingParserMock;
   let expressionFactory: ExpressionFactoryMock;
   let sut: BindingManager;

   beforeEach(() => {
      ownerElement = createCustomHtmlElementMock();
      inputContext = new InputContextMock();
      bindingCollection = new BindingCollectionMock();
      errorLog = new ErrorLogMock();
      bindingsParser = new BindingParserMock();
      expressionFactory = new ExpressionFactoryMock();
      sut = new BindingManager(
         ownerElement,
         inputContext,
         bindingCollection,
         errorLog,
         bindingsParser,
         expressionFactory,
      );
   });

   describe('bound', () => {
      it('is an Observable that emits after attachBindings completes', () => {
         const values: unknown[] = [];
         sut.bound.subscribe(() => values.push(null));

         bindingsParser.parse.mockReturnValue([]);
         sut.attachBindings([]);

         expect(values).toHaveLength(1);
      });

      it('emits after onBindingValuesChanged when no rebuildContentOnChange', () => {
         const values: unknown[] = [];
         sut.bound.subscribe(() => values.push(null));

         bindingsParser.parse.mockReturnValue([]);
         sut.attachBindings([]);
         values.length = 0; // reset after attachBindings emission

         const changes: IChangedBindingValues = {
            rightToLeftBindings: [
               new BindingMock({
                  bindingType: BindingType.OneWay,
                  inputInfo: new InputMetadataMock({ rebuildContentOnChange: false }),
                  right: new ExpressionMock({ value: 'val' }),
               }),
            ],
            leftToRightBindings: [],
         };
         bindingCollection.valuesChanged.next(changes);

         expect(values).toHaveLength(1);
      });
   });

   describe('attributeReflected', () => {
      it('is an Observable that emits reflected attribute events', async () => {
         const values: unknown[] = [];
         sut.attributeReflected.subscribe((v) => values.push(v));

         const inputInfo = new InputMetadataMock({
            propertyKey: 'someProp',
            attributeName: 'some-attr',
         });
         inputContext.getInputForAttribute.mockReturnValue(inputInfo);
         expressionFactory.create.mockReturnValue(new ExpressionMock({ value: 'test' }));

         jest.useFakeTimers();
         const promise = sut.setPropertyFromAttribute('some-attr', 'value');
         jest.advanceTimersByTime(100);
         await promise;
         jest.useRealTimers();

         expect(values).toHaveLength(1);
      });
   });

   describe('rebuildContent', () => {
      it('is an Observable that emits when content rebuild is requested', () => {
         const values: unknown[] = [];
         sut.rebuildContent.subscribe(() => values.push(null));

         bindingsParser.parse.mockReturnValue([]);
         sut.attachBindings([]);

         const changes: IChangedBindingValues = {
            rightToLeftBindings: [
               new BindingMock({
                  bindingType: BindingType.OneWay,
                  inputInfo: new InputMetadataMock({ rebuildContentOnChange: true }),
               }),
            ],
            leftToRightBindings: [],
         };

         bindingCollection.valuesChanged.next(changes);

         expect(values).toHaveLength(1);
      });
   });

   describe('setPropertyFromAttribute', () => {
      beforeEach(() => {
         jest.useFakeTimers();
      });

      afterEach(() => {
         jest.useRealTimers();
      });

      it('returns early when customElement is not available on ownerElement', async () => {
         const elementWithoutCustomElement = { customElement: undefined } as unknown as Element;
         const manager = new BindingManager(
            elementWithoutCustomElement,
            inputContext,
            bindingCollection,
            errorLog,
            bindingsParser,
            expressionFactory,
         );

         await manager.setPropertyFromAttribute('attr', 'value');

         expect(inputContext.getInputForAttribute).not.toHaveBeenCalled();
      });

      it('returns early when getInputForAttribute returns null', async () => {
         inputContext.getInputForAttribute.mockReturnValue(null);

         await sut.setPropertyFromAttribute('attr', 'value');

         expect(expressionFactory.create).not.toHaveBeenCalled();
      });

      it('throws InvalidOperationException when the attribute is already data bound', async () => {
         const inputInfo = new InputMetadataMock({ propertyKey: 'prop' });
         inputContext.getInputForAttribute.mockReturnValue(inputInfo);
         bindingCollection.items = [new BindingMock({ inputInfo })];

         await expect(
            sut.setPropertyFromAttribute('attr', 'value'),
         ).rejects.toThrow();
      });

      it('uses valueToString when provided on inputInfo', async () => {
         const valueToString = jest.fn().mockReturnValue('converted');
         const inputInfo = new InputMetadataMock({
            propertyKey: 'prop',
            attributeName: 'attr',
            valueToString,
         });
         inputContext.getInputForAttribute.mockReturnValue(inputInfo);
         expressionFactory.create.mockReturnValue(new ExpressionMock({ value: 42 }));

         const promise = sut.setPropertyFromAttribute('attr', 'value');
         jest.advanceTimersByTime(100);
         await promise;

         expect(valueToString).toHaveBeenCalledWith('value');
         expect(expressionFactory.create).toHaveBeenCalledWith(
            ownerElement.customElement,
            'converted',
         );
      });

      it('uses quoted string format when valueToString is not provided', async () => {
         const inputInfo = new InputMetadataMock({
            propertyKey: 'prop',
            attributeName: 'attr',
         });
         inputContext.getInputForAttribute.mockReturnValue(inputInfo);
         expressionFactory.create.mockReturnValue(new ExpressionMock({ value: 'hello' }));

         const promise = sut.setPropertyFromAttribute('attr', 'newVal');
         jest.advanceTimersByTime(100);
         await promise;

         expect(expressionFactory.create).toHaveBeenCalledWith(
            ownerElement.customElement,
            "'newVal'",
         );
      });

      it('sets the property on customElement to the expression value', async () => {
         const inputInfo = new InputMetadataMock({
            propertyKey: 'myProp',
            attributeName: 'my-attr',
         });
         inputContext.getInputForAttribute.mockReturnValue(inputInfo);
         expressionFactory.create.mockReturnValue(
            new ExpressionMock({ value: 'resolvedValue' }),
         );

         const promise = sut.setPropertyFromAttribute('my-attr', 'rawValue');
         jest.advanceTimersByTime(100);
         await promise;

         expect(
            (ownerElement.customElement as unknown as Record<string, unknown>)[
               'myProp'
            ],
         ).toBe('resolvedValue');
      });

      it('emits attributeReflected with correct metadata', async () => {
         const inputInfo = new InputMetadataMock({
            propertyKey: 'prop',
            attributeName: 'attr',
         });
         inputContext.getInputForAttribute.mockReturnValue(inputInfo);
         expressionFactory.create.mockReturnValue(
            new ExpressionMock({ value: 'propVal' }),
         );

         const reflected: unknown[] = [];
         sut.attributeReflected.subscribe((v) => reflected.push(v));

         const promise = sut.setPropertyFromAttribute('attr', 'newVal', 'oldVal');
         jest.advanceTimersByTime(100);
         await promise;

         expect(reflected).toHaveLength(1);
         expect(reflected[0]).toEqual({
            attributeName: 'attr',
            propertyName: 'prop',
            oldValue: 'oldVal',
            newValue: 'newVal',
            newPropertyValue: 'propVal',
         });
      });
   });

   describe('attachBindings', () => {
      it('parses content nodes and binds the resulting bindings', () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWay });
         bindingsParser.parse.mockReturnValue([binding]);
         const content = [document.createElement('div')];

         sut.attachBindings(content as unknown as Node[]);

         expect(bindingsParser.parse).toHaveBeenCalledWith(content);
         expect(bindingCollection.addRange).toHaveBeenCalledWith([binding]);
      });

      it('logs error to errorLog when bindingsParser.parse throws', () => {
         const error = new Error('parse failed');
         bindingsParser.parse.mockImplementation(() => {
            throw error;
         });

         sut.attachBindings([]);

         expect(errorLog.add).toHaveBeenCalledWith(
            expect.objectContaining({
               message: 'Failed to attach bindings',
               exception: error,
               context: sut,
            }),
         );
      });
   });

   describe('attachBindingsManually', () => {
      it('binds the provided bindings directly without parsing', () => {
         const binding = new BindingMock({ bindingType: BindingType.OneWay });

         sut.attachBindingsManually([binding]);

         expect(bindingCollection.addRange).toHaveBeenCalledWith([binding]);
      });

      it('logs error to errorLog when binding throws', () => {
         const error = new Error('bind failed');
         bindingCollection.addRange.mockImplementation(() => {
            throw error;
         });

         sut.attachBindingsManually([new BindingMock()]);

         expect(errorLog.add).toHaveBeenCalledWith(
            expect.objectContaining({
               message: 'Failed to attach bindings manually',
               exception: error,
               context: sut,
            }),
         );
      });
   });

   describe('rebindElements', () => {
      it('gets bindings for given elements and updates their left values', () => {
         const element = document.createElement('div');
         const binding = new BindingMock({
            bindingType: BindingType.OneWay,
            right: new ExpressionMock({ value: 'rightVal' }),
         });
         bindingCollection.getBindingsForElements.mockReturnValue([binding]);

         sut.rebindElements([element]);

         expect(bindingCollection.getBindingsForElements).toHaveBeenCalledWith([
            element,
         ]);
         expect(binding.left.setValue).toHaveBeenCalledWith('rightVal');
      });
   });

   describe('detachBindings', () => {
      it('disposes the binding collection', () => {
         sut.detachBindings();

         expect(bindingCollection.dispose).toHaveBeenCalledTimes(1);
      });

      it('unsubscribes from valuesChanged after bindings are attached', () => {
         bindingsParser.parse.mockReturnValue([]);
         sut.attachBindings([]);

         const subscription =
            bindingCollection.valuesChanged.subscribe.mock.results[0]
               ?.value as { unsubscribe: jest.Mock };

         sut.detachBindings();

         expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
      });

      it('does not throw when called before any bindings are attached', () => {
         expect(() => sut.detachBindings()).not.toThrow();
      });
   });

   describe('removeBindingsForElements', () => {
      it('delegates to bindings.removeForElements with the provided nodes', () => {
         const nodes = [
            document.createElement('div'),
            document.createTextNode('text'),
         ];

         sut.removeBindingsForElements(nodes);

         expect(bindingCollection.removeForElements).toHaveBeenCalledWith(nodes);
      });
   });

   describe('valuesChanged subscription', () => {
      it('subscribes to valuesChanged only once across multiple bind calls', () => {
         bindingsParser.parse.mockReturnValue([]);

         sut.attachBindings([]);
         sut.attachBindings([]);
         sut.attachBindingsManually([]);

         expect(bindingCollection.valuesChanged.subscribe).toHaveBeenCalledTimes(1);
      });
   });

   describe('updateLeftValue with reflectToAttribute', () => {
      function setupBindingWithReflect(
         value: unknown,
         toString?: (v: unknown) => string,
      ): { element: Element; binding: BindingMock } {
         const element = document.createElement('div');
         const inputInfo = new InputMetadataMock({
            reflectToAttribute: true,
            attributeName: 'test-attr',
            valueToString: toString,
         });
         const binding = new BindingMock({
            bindingType: BindingType.OneWay,
            inputInfo,
            bindingOwnerElement: element,
            right: new ExpressionMock({ value }),
         });
         bindingCollection.getBindingsForElements.mockReturnValue([binding]);
         return { element, binding };
      }

      it('removes attribute when value is null', () => {
         const { element } = setupBindingWithReflect(null);
         jest.spyOn(element, 'removeAttribute');

         sut.rebindElements([element]);

         expect(element.removeAttribute).toHaveBeenCalledWith('test-attr');
      });

      it('removes attribute when value is undefined', () => {
         const { element } = setupBindingWithReflect(undefined);
         jest.spyOn(element, 'removeAttribute');

         sut.rebindElements([element]);

         expect(element.removeAttribute).toHaveBeenCalledWith('test-attr');
      });

      it('removes attribute when value is empty string', () => {
         const { element } = setupBindingWithReflect('');
         jest.spyOn(element, 'removeAttribute');

         sut.rebindElements([element]);

         expect(element.removeAttribute).toHaveBeenCalledWith('test-attr');
      });

      it('sets attribute as JSON string when value is a plain object', () => {
         const value = { key: 'value' };
         const { element } = setupBindingWithReflect(value);
         jest.spyOn(element, 'setAttribute');

         sut.rebindElements([element]);

         expect(element.setAttribute).toHaveBeenCalledWith(
            'test-attr',
            JSON.stringify(value),
         );
      });

      it('uses the toString function when provided', () => {
         const toString = jest.fn().mockReturnValue('custom-string');
         const { element } = setupBindingWithReflect('someValue', toString);
         jest.spyOn(element, 'setAttribute');

         sut.rebindElements([element]);

         expect(toString).toHaveBeenCalledWith('someValue');
         expect(element.setAttribute).toHaveBeenCalledWith(
            'test-attr',
            'custom-string',
         );
      });

      it('uses quoted template format when no toString function and value is truthy', () => {
         const { element } = setupBindingWithReflect('hello');
         jest.spyOn(element, 'setAttribute');

         sut.rebindElements([element]);

         expect(element.setAttribute).toHaveBeenCalledWith('test-attr', "'hello'");
      });

      it('sets attribute to empty string when value is falsy but not null/undefined/empty', () => {
         const { element } = setupBindingWithReflect(0);
         jest.spyOn(element, 'setAttribute');

         sut.rebindElements([element]);

         expect(element.setAttribute).toHaveBeenCalledWith('test-attr', '');
      });

      it('calls binding.left.setValue with the new value', () => {
         const { binding } = setupBindingWithReflect('test');

         sut.rebindElements([document.createElement('div')]);

         expect(binding.left.setValue).toHaveBeenCalledWith('test');
      });
   });

   describe('onBindingValuesChanged', () => {
      beforeEach(() => {
         bindingsParser.parse.mockReturnValue([]);
         sut.attachBindings([]);
      });

      it('emits rebuildContent and skips value updates when any rightToLeft binding has rebuildContentOnChange', () => {
         const rebuildValues: unknown[] = [];
         sut.rebuildContent.subscribe(() => rebuildValues.push(null));

         const binding = new BindingMock({
            bindingType: BindingType.OneWay,
            inputInfo: new InputMetadataMock({ rebuildContentOnChange: true }),
         });

         const changes: IChangedBindingValues = {
            rightToLeftBindings: [binding],
            leftToRightBindings: [],
         };

         bindingCollection.valuesChanged.next(changes);

         expect(rebuildValues).toHaveLength(1);
         expect(binding.left.setValue).not.toHaveBeenCalled();
      });

      it('calls bindFromRightToLeft for rightToLeft bindings when no rebuildContentOnChange', () => {
         const rightToLeftBinding = new BindingMock({
            bindingType: BindingType.OneWay,
            inputInfo: new InputMetadataMock({ rebuildContentOnChange: false }),
            right: new ExpressionMock({ value: 'newRight' }),
         });

         const changes: IChangedBindingValues = {
            rightToLeftBindings: [rightToLeftBinding],
            leftToRightBindings: [],
         };

         bindingCollection.valuesChanged.next(changes);

         expect(rightToLeftBinding.left.setValue).toHaveBeenCalledWith('newRight');
      });

      it('calls setValue on IdentifierExpression right bindings in bindFromLeftToRight', () => {
         const rightIdentifier: IdentifierExpression & { setValue: jest.Mock } =
            Object.create(IdentifierExpression.prototype);
         Object.defineProperty(rightIdentifier, 'value', { get: () => 'rightValue' });
         rightIdentifier.setValue = jest.fn();

         const leftToRightBinding = new BindingMock({
            bindingType: BindingType.TwoWay,
            inputInfo: new InputMetadataMock({ rebuildContentOnChange: false }),
            left: new IdentifierExpressionMock({ value: 'leftVal' }),
            right: rightIdentifier as unknown as ExpressionMock,
         });

         const changes: IChangedBindingValues = {
            rightToLeftBindings: [],
            leftToRightBindings: [leftToRightBinding],
         };

         bindingCollection.valuesChanged.next(changes);

         expect(rightIdentifier.setValue).toHaveBeenCalledWith('leftVal');
      });

      it('does not call setValue on right when it is not an IdentifierExpression', () => {
         const setValue = jest.fn();
         const right = Object.assign(new ExpressionMock({ value: 'rightVal' }), { setValue });
         const leftToRightBinding = new BindingMock({
            bindingType: BindingType.TwoWay,
            inputInfo: new InputMetadataMock({ rebuildContentOnChange: false }),
            left: new IdentifierExpressionMock({ value: 'leftVal' }),
            right: right as unknown as ExpressionMock,
         });

         const changes: IChangedBindingValues = {
            rightToLeftBindings: [],
            leftToRightBindings: [leftToRightBinding],
         };

         bindingCollection.valuesChanged.next(changes);

         expect(setValue).not.toHaveBeenCalled();
      });

      it('logs error when the valuesChanged subscription encounters an error', () => {
         const error = new Error('rxjs error');

         const subscribeCallArg =
            bindingCollection.valuesChanged.subscribe.mock.calls[0]?.[0];
         subscribeCallArg?.error?.(error);

         expect(errorLog.add).toHaveBeenCalledWith(
            expect.objectContaining({
               message: error,
               fatal: true,
               context: sut,
            }),
         );
      });
   });
});
