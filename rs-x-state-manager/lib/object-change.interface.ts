import { IPropertyChange } from '@rs-x-core';

export interface IObjectChange {
   root: object;
   mutation: IPropertyChange;
}
