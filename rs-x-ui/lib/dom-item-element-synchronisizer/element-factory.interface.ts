export interface IElementFactory {
   create(dataAlias?: string, data?: unknown): Node;
   setData(element: Element, dataAlias: string, data: unknown): void;
}
