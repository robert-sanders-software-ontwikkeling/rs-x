import {
   ConstructorType,
   ConvertValueTypeToString,
   emptyFunction,
   IErrorLog,
   InvalidOperationException,
   Type,
   WaitForEvent
} from '@rs-x/core';
import {
   Observable,
   Subject,
   Subscription
} from 'rxjs';
import { IdentifierExpression, IExpressionFactory } from '../../../../rs-x-expression-parser/lib';
import { IInputContext } from '../decorators/input/input-context.interface';
import {
   ICustomElement,
   ICustomElementConnector,
   ICustomElementController,
} from '../interfaces';
import { IBindingManager } from './binding-manager.interface';
import {
   IBinding,
   IBindingCollection,
   IBindingsParser,
   IChangedBindingValues,
   IReflectedAttribute
} from './interfaces';

export class BindingManager implements IBindingManager {
   private readonly _bound = new Subject<void>();
   private readonly _attributeReflected = new Subject<IReflectedAttribute>();
   private readonly _rebuildContent = new Subject<void>();
   private _valuesChangedSubscription!: Subscription | null;
  


   constructor(
      private readonly _ownerElement: ICustomElementConnector | Element,
      private readonly _inputMetadataContext: IInputContext,
      private readonly _bindings: IBindingCollection,
      private readonly _errorLog: IErrorLog,
      private readonly _bindingsParser: IBindingsParser,
      private readonly _expressionFactory: IExpressionFactory
   ) {

   }

   public get bound(): Observable<void> {
      return this._bound;
   }

   public get attributeReflected(): Observable<IReflectedAttribute> {
      return this._attributeReflected;
   }

   public get rebuildContent(): Observable<void> {
      return this._rebuildContent;
   }

   public async setPropertyFromAttribute(
      attributeName: string,
      newValue: string,
      oldValue?: string
   ): Promise<void> {
      if (!this.customElement) {
         return;
      }

      const inputForAttribute = this._inputMetadataContext.getInputForAttribute(
         this.customElement.constructor as ConstructorType,
         attributeName,
         true
      );

      if (!inputForAttribute) {
         return;
      }

      if (
         this._bindings.items.some(
            (binding) => binding.inputInfo === inputForAttribute
         )
      ) {
         throw new InvalidOperationException(
            `Can't set attribute ${attributeName} for custom element ${this.customElement.element.tagName} from '${oldValue}' to '${newValue}' because it is data bound`
         );
      }

      const value = inputForAttribute.valueToString
         ? inputForAttribute.valueToString(newValue)
         : `'${newValue}'`

      const expression = this._expressionFactory.create(this.customElement, value);

      await new WaitForEvent(expression, 'changed').wait(emptyFunction);


      this.customElement[inputForAttribute.propertyKey] = expression.value;

      this.emitAttributeReflected({
         attributeName,
         propertyName: inputForAttribute.propertyKey,
         oldValue,
         newValue,
         newPropertyValue: expression.value,
      });
   }

   public attachBindings(content: Node[]): void {
      try {
         const bindings = this._bindingsParser.parse(content);
   
         this.bind(bindings);
      } catch (e) {
         this._errorLog.add({
            message: 'Failed to attach bindings',
            exception: e as Error,
            context: this,
         });
      } 
      this._bound.next();
   }

   public attachBindingsManually(bindings: IBinding[]): void {
      try {
         return this.bind(bindings);
      } catch (e) {
         this._errorLog.add({
            message: 'Failed to attach bindings manually',
            exception: e as Error,
            context: this,
         });
      }
   }

   public rebindElements(elements: Element[]): void {
      const bindings = this._bindings.getBindingsForElements(elements);
      this.bindFromRightToLeft(bindings)
   }

   public detachBindings(): void {
      this._bindings.dispose();
      this.unsubscribeToValueChangedSubscription();
   }

   public removeBindingsForElements(elements: Node[]): void {
      this._bindings.removeForElements(elements);
   }

   private get customElement(): ICustomElement<ICustomElementController> {
      return Type.cast<ICustomElementConnector>(this._ownerElement).customElement;
   }


   private bind(bindings: IBinding[]): void {
      this.subscribeToValueChangedEvent();
      this._bindings.addRange(bindings);
   }


   private emitAttributeReflected = (
      reflectedAttribute: IReflectedAttribute
   ) => {
      this._attributeReflected.next(reflectedAttribute);
   };

   private bindFromRightToLeft = (
      bindings: IBinding[]
   ): void => {
      bindings.forEach((binding) => this.updateLeftValue(binding, binding.right.value));

   };

   private bindFromLeftToRight(bindings: IBinding[]): void {
      bindings.forEach((binding) => {
         if (binding.right instanceof IdentifierExpression) {
            binding.right.setValue(binding.left.value)
         }
      });
   }

   private updateLeftValue(
      binding: IBinding,
      newValue: unknown,
   ): void {
      if (binding.inputInfo.reflectToAttribute) {
         this.setAttribute(
            binding.bindingOwnerElement as Element,
            binding.inputInfo.attributeName,
            newValue,
            binding.inputInfo.valueToString
         );
      }

      binding.left.setValue(newValue);
   }

   private setAttribute(
      element: Element,
      name: string,
      value: unknown,
      toString?: ConvertValueTypeToString
   ): void {
      if (Type.isEmpty(value)) {
         element.removeAttribute(name);
      } else if (Type.isPlainObject(value)) {
         element.setAttribute(name, JSON.stringify(value));
      } else {
         const convertedValue = toString
            ? toString(value)
            : value
               ? `'${value.toString()}'`
               : '';
         element.setAttribute(name, convertedValue);
      }
   }

   private subscribeToValueChangedEvent(): void {
      if (this._valuesChangedSubscription) {
         return;
      }
      this._valuesChangedSubscription = this._bindings.valuesChanged.subscribe({
         next: this.onBindingValuesChanged,
         error: (error) =>
            this._errorLog.add({
               message: error,
               fatal: true,
               context: this,
            }),
      });
   }

   private unsubscribeToValueChangedSubscription(): void {
      if (this._valuesChangedSubscription) {
         this._valuesChangedSubscription.unsubscribe();
         this._valuesChangedSubscription = null;
      }
   }

   private onBindingValuesChanged = async (changes: IChangedBindingValues) => {
      if (
         changes.rightToLeftBindings.some(
            (binding) => binding.inputInfo.rebuildContentOnChange
         )
      ) {
         this._rebuildContent.next();
         return;
      }

      this.bindFromRightToLeft(changes.rightToLeftBindings);
      this.bindFromLeftToRight(changes.leftToRightBindings);

      this._bound.next();
   };
}
