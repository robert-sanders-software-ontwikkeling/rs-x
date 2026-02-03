export interface IProxyRegistry {
  getProxyTarget<T>(proxyToFind: unknown): T;
  getProxy<T>(proxyTarget: unknown): T;
  register(proxyTarget: unknown, proxy: unknown): void;
  unregister(proxyTarget: unknown): void;
  isProxy(object: unknown): boolean;
}
