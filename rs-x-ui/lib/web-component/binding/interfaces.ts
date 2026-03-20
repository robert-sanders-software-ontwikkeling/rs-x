import { IDisposable } from '@rs-x/core';
import { Observable } from 'rxjs';
import { IWebComponentElement } from '../interfaces';
import { IdentifierExpression, IExpression, IIdentifierExpression } from '@rs-x/expression-parser';
import { IInputMetadata } from '../decorators/input/input-metadata.interface';


export class BindingParseException extends Error {
   constructor(message: string) {
      super(message);
   }
}

export class BindingException extends Error {
   constructor(message: string) {
      super(message);
   }
}

export class BindingTargetNotFoundException extends Error {}


export interface IReflectedAttribute {
   attributeName: string;
   propertyName: string;
   oldValue?: string;
   newValue: string;
   newPropertyValue: unknown;
}

export interface ISlotBoundEventArgs {
   slot: HTMLSlotElement;
}

export enum BindingType {
   OneTime = 1,
   OneWay = 2,
   TwoWay = 3,
   OneWayText = 4,
}

export interface IBindingAttribute {
   name: string;
   bindingExpression: string;
   bindingType: BindingType;
   ownerElement: Element;
   component: IWebComponentElement;
}

export interface IBindingAttributeParser {
   parse(contentElements: Element[]): IBindingAttribute[];
}

export interface IBinding extends IDisposable {
   slot?: HTMLSlotElement;
   inputInfo: IInputMetadata;
   bindingOwnerElement: Element | Node;
   left: IIdentifierExpression;
   right: IExpression;
   bindingType: BindingType;
}

export function compareBinding(a: IBinding, b: IBinding): number {
   if (a.bindingType === b.bindingType) {
      return 0;
   }

   if (a.bindingType === BindingType.OneTime) {
      return -1;
   }

   return 1;
}


export interface IBindingsChanged {
   added: IBinding[];
   removed: IBinding[];
}

export interface IChangedBindingValues {
   rightToLeftBindings: IBinding[];
   leftToRightBindings: IBinding[];
}

export interface ITextContentExpressionParser {
   parse(textContent: string | null): IExpression | null;
}

export interface IBindingsParser {
   parse(content: Node[], slot?: HTMLSlotElement): IBinding[];
}

export interface IBindingCollection extends IDisposable {
   readonly valuesChanged: Observable<IChangedBindingValues>;
   readonly items: IBinding[];
   suspendWatch(): void;
   continueWatch(): void;
   addRange(bindings: IBinding[]): void
   removeForElements(elements: Node[]): void;
   dispose(): void;
   getBindingsForElements(elements: Node[]): IBinding[];
}
