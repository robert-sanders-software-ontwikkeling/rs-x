import { from, Observable, of } from 'rxjs';

export function toObservable<T>(
   value: unknown,
   mapFunction?: (value) => T,
   handleError?: (e) => void
): Observable<T> {
   let observable;
   if (value instanceof Observable) {
      observable = value;
   } else if (value instanceof Promise) {
      observable = from(value);
   } else {
      observable = of(value);
   }

   if (!mapFunction) {
      return observable;
   }

   return new Observable((observer) => {
      const processError = (e) => {
         handleError(e);
         observer.error(e);
      };
      observable.subscribe((result) => {
         try {
            observer.next(mapFunction(result));
            observer.complete();
         } catch (e) {
            processError(e);
         }
      }, processError);
   });
}

export const emptyValue = Symbol('empty');
export type AnyFunction = (...args: unknown[]) => unknown;
export const emptyFunction = () => {};
export const truePredicate = () => true;
export const echo = (value: unknown) => value;
