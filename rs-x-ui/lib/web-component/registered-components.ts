import { Injectable } from '@rs-x/core';
import { IComponentMetadata } from './decorators/component/component-metadata.interface';
import {
   IRegisteredComponents,
   WebComponentElementConstructor,
} from './interfaces';

@Injectable()
export class RegisteredComponents implements IRegisteredComponents {
   public static readonly instance = new RegisteredComponents();

   private readonly _registeredComponents = new Map<
      WebComponentElementConstructor,
      IComponentMetadata
   >();

   public get components(): [
      WebComponentElementConstructor,
      IComponentMetadata,
   ][] {
      return Array.from(this._registeredComponents.entries());
   }

   public registerWebComponent(
      webComponentType: WebComponentElementConstructor,
      componentMetaData: IComponentMetadata
   ): void {
      this._registeredComponents.set(webComponentType, componentMetaData);
   }

   public getComponentInfo(
      webComponentType: WebComponentElementConstructor
   ): IComponentMetadata | undefined {
      return this._registeredComponents.get(webComponentType);
   }
}
