export interface IItem {
   value: string;
   text: string;
}

export function createItems(count: number): IItem[] {
   const items: IItem[] = [];
   for (let i = 0; i < count; i++) {
      items.push(createItem(i + 1));
   }
   return items;
}

export function createItem(i: number): IItem {
   return {
      value: `${i}`,
      text: `text ${i}`,
   };
}
