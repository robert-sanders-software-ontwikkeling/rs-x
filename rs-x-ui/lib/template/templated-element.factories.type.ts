import { IKeyedInstanceFactory } from '@rs-x/core';
import { IElementFactory } from '../dom-item-element-synchronisizer/element-factory.interface';

export type ITemplatedElementFactories = IKeyedInstanceFactory<
   HTMLTemplateElement,
   HTMLTemplateElement,
   IElementFactory
>;
