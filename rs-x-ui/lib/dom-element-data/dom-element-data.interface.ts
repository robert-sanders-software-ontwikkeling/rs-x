import { IDisposable } from '@rs-x/core';

export interface IDomElementData extends IDisposable {
   register(element: Node, key: string | symbol, data: unknown): void;
   unregister(node: Node, key?: string | symbol): void;
   getData<T>(element: Node, key: string | symbol): T;
   resolveContext(element: Node, fieldName: string): object | undefined;
}
