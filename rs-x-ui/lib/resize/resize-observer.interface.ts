export interface IResizeObserver {
   observe(target: Element): void;
   unobserve(target: Element): void;
   disconnect(): void;
}
