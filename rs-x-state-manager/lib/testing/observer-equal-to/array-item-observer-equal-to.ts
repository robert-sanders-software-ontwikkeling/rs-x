import { Type } from '@rs-x/core';
import { IObserver } from '../../observer.interface';
import { observerEqualTo } from './observer.equal-to';

interface IArrayItemObserverPrivate {
   _arrayObserver: IObserver;
}

export function arrayItemObserverEqualTo(x: IObserver, y: IObserver): boolean {
   return (
      observerEqualTo(x, y) &&
      observerEqualTo(
         Type.cast<IArrayItemObserverPrivate>(x)._arrayObserver,
         Type.cast<IArrayItemObserverPrivate>(y)._arrayObserver
      )
   );
}
