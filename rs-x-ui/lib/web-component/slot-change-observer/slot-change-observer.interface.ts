export interface ISlotChangeObserver {
   startWatching(elements: Element[]): boolean;
   stopWatching(): void;
}
