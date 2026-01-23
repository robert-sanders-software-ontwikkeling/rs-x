import { Type } from '@rs-x/core';
import { type IObserver } from '../../observer.interface';
import { observerEqualTo } from './observer.equal-to';

interface IMapItemObserverPrivate {
   _mapObserver: IObserver;
}

export function mapItemObserverEqualTo(x: IObserver, y: IObserver): boolean {
   return (
      observerEqualTo(x, y) &&
      observerEqualTo(
         Type.cast<IMapItemObserverPrivate>(x)._mapObserver,
         Type.cast<IMapItemObserverPrivate>(y)._mapObserver
      )
   );
}
