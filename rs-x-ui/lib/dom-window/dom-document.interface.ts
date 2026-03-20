export interface IDomDocument {
   readonly documentElement: HTMLElement;
   readonly body: HTMLElement;
   createElement<K extends keyof HTMLElementTagNameMap>(
      tagName: K,
      options?: ElementCreationOptions
   ): HTMLElementTagNameMap[K];
   createElement(
      tagName: string,
      options?: ElementCreationOptions
   ): HTMLElement;
   createElementNS(
      namespaceURI: 'http://www.w3.org/1999/xhtml',
      qualifiedName: string
   ): HTMLElement;
   createElementNS<K extends keyof SVGElementTagNameMap>(
      namespaceURI: 'http://www.w3.org/2000/svg',
      qualifiedName: K
   ): SVGElementTagNameMap[K];
   createElementNS(
      namespaceURI: 'http://www.w3.org/2000/svg',
      qualifiedName: string
   ): SVGElement;
   createElementNS(
      namespaceURI: string | null,
      qualifiedName: string,
      options?: ElementCreationOptions
   ): Element;
   createElementNS(
      namespace: string | null,
      qualifiedName: string,
      options?: string | ElementCreationOptions
   ): Element;
}
