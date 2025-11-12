export function replaceSetItemAt<T = unknown>(
   set: Set<T>,
   oldValue: T,
   newValue: T
): Set<T> {
   const values = Array.from(set);
   const index = values.indexOf(oldValue);
   if (index === -1) {
      throw new RangeError('Index out of range');
   }

   values[index] = newValue;

   set.clear();
   values.forEach((value) => set.add(value));

   return set;
}
