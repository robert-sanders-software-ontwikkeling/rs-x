export function removeFromArray<T>(array: T[], item: T): boolean {
   const index = array.indexOf(item);
   const found = index >= 0;
   if (found) {
      array.splice(index, 1);
   }
   return found;
}