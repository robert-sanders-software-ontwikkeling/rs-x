export interface IProxyRegistry {
   register(proxy: unknown): void;
   unregister(proxy: unknown): void;
   isProxy(object: unknown): boolean;
}
