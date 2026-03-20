import { IKeyedInstanceFactory } from '@rs-x/core';
import { ICustomElementConnector } from '../interfaces';
import { IBindingManager } from './binding-manager.interface';

export type IBindingManagerFactory = IKeyedInstanceFactory<
   ICustomElementConnector | Element,
   ICustomElementConnector | Element,
   IBindingManager
>;
