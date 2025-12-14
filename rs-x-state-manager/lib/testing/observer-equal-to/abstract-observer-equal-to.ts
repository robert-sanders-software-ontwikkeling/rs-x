import { IObserver } from '../../observer.interface';

export function abstractObserverEqualTo(x: IObserver, y: IObserver): boolean {
   if (!(y instanceof x.constructor)) {
      console.log(
         `${y.constructor.name} is not an instance of ${x.constructor.name}`
      );
      return false;
   }

   if (x.target !== y.target) {
      console.log(
         `${x.constructor.name} target is not egual to comparing target`
      );
      return false;
   }

   if (x.value !== y.value) {
      console.log(
         `${x.constructor.name}  initialValue '${x.value}' is not egual to comparing initial value '${y.value}' `
      );
      return false;
   }

   if (x.id !== y.id) {
      console.log(
         `${x.constructor.name}  id '${x.id}'  is not egual to comparing id '${y.id}' `
      );
      return false;
   }

   return true;
}
