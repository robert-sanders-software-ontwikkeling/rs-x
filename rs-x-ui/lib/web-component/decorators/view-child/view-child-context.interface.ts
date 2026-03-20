import { ConstructorType } from '@rs-x/core';
import { IViewChildMetadata } from './view-child-metadata.interface';

export interface IViewChildContext {
   getViewChildren(type: ConstructorType): IViewChildMetadata[];
   getViewChild(type: ConstructorType, name: string): IViewChildMetadata | undefined;
   clearViewChildren(object: object): void;
}
