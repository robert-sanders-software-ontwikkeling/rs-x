export class EnumValues {
   public static getKeyStringValuePairs(
      enumerator: object
   ): { key: string; value: string }[] {
      return Object.keys(enumerator).map((key) => {
         return { key, value: enumerator[key] };
      });
   }

   public static getKeyNumberValuePairs(enumerator: {
      [key: number]: string;
   }): { key: string; value: number }[] {
      return Object.keys(enumerator)
         .filter((key) => isNaN(Number(key)))
         .map((key) => {
            return { key, value: enumerator[key] };
         });
   }

   public static getStringValues(e: object): string[] {
      return this.getObjectValues(e).filter(
         (v) => typeof v === 'string'
      ) as string[];
   }

   public static getNumberValues(e: object): number[] {
      return this.getObjectValues(e).filter(
         (v) => typeof v === 'number'
      ) as number[];
   }

   private static getObjectValues(e: object): (number | string)[] {
      return Object.keys(e).map((k) => e[k]);
   }
}
