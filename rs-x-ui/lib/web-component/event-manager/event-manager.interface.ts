export interface IEventManager {
   bindEvents(elements: (Element | HTMLSlotElement)[]): void;
   unbindAllEvents(): void;
   unbindEvents(elements: Element[]): void;
   emitEvent(target: unknown, eventName: string, args?: unknown): void;
}
