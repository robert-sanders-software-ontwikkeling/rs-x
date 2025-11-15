import { Type } from '@rs-x/core';
import { AbstractObserver } from '../../abstract-observer';
import { ObserverGroup } from '../../observer-group';
import { IObserver } from '../../observer.interface';
import { abstractObserverEqualTo } from './abstract-observer-equal-to';
import { observerEqualTo } from './observer.equal-to';

interface IObserverGrouoPrivate extends IObserver {
   rootObserver: AbstractObserver;
   _observers: IObserver[];
}

export function observerGroupEqualTo(
   x: AbstractObserver,
   y: AbstractObserver
): boolean {
   if (!(x instanceof ObserverGroup) || !(y instanceof ObserverGroup)) {
      console.log('x and y need to be instance of ObserverGroyp');

      return false;
   }

   const observerGroupX = Type.cast<IObserverGrouoPrivate>(x);
   const observerGroupY = Type.cast<IObserverGrouoPrivate>(y);

   if (!abstractObserverEqualTo(x, y)) {
      return false;
   }
   if (
      !observerEqualTo(observerGroupX.rootObserver, observerGroupY.rootObserver)
   ) {
      console.log(
         `${x.constructor.name} rootObserver  is not egual to comparing rootObserver`
      );
      return false;
   }

   if (observerGroupX._observers.length !== observerGroupY._observers.length) {
      console.log(
         `${x.constructor.name} does not have the same number of observers (${observerGroupX._observers.length} versus ${observerGroupY._observers.length}) as comparing observers`
      );
      return false;
   }

   let observerAreEqual = true;
   observerGroupX._observers.forEach((observer, index) => {
      if (!observerEqualTo(observer, observerGroupY._observers[index])) {
         console.log(
            `${x.constructor.name} nested observer at index ${index} is not equal to comparing nested observer`
         );
         observerAreEqual = false;
      }
   });
   return observerAreEqual;
}
