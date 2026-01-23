import { type IPropertyChange } from '@rs-x/core';

export interface IObjectChange {
   root: object;
   mutation: IPropertyChange;
}
