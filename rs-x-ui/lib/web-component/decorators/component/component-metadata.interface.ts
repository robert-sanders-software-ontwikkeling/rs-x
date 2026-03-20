import { ConstructorType } from '@rs-x/core';
import { WebComponentControllerFactoryToken } from '../../interfaces';

export interface IComponentMetadata {
   selector: string;
   template: string;
   styles?: string | string[];
   controllerFactoryToken?: WebComponentControllerFactoryToken;
   dependencies?: ConstructorType[];
}
