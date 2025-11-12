import { ObserverGroup } from '../../observer-group';
import { IObserver } from '../../observer.interface';
import { abstractObserverEqualTo } from './abstract-observer-equal-to';
import { arrayItemObserverEqualTo } from './array-item-observer-equal-to';
import { mapItemObserverEqualTo } from './map-item-observer-equal-to';
import { observerGroupEqualTo } from './observer-group-equal-to';

export type ObserverComparator = (x: IObserver, y: IObserver) => boolean;

const comparatorRegistry = new Map<string, ObserverComparator>([
   [ObserverGroup.constructor.name, observerGroupEqualTo],
   ['ArrayItemObserver', arrayItemObserverEqualTo],
   ['MapItemObserver', mapItemObserverEqualTo],
]);

export function observerEqualTo(x: IObserver, y: IObserver): boolean {
   const equalTo =
      comparatorRegistry.get(x.constructor.name) ?? abstractObserverEqualTo;
   return equalTo(x, y);
}
