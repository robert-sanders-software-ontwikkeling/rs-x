import { Injectable } from '@rs-x/core';
import type { IProxyRegistry } from './proxy-registry.interface';

@Injectable()
export class ProxyRegistry implements IProxyRegistry {
   private readonly _proxies = new Map<unknown,unknown>();

   public getProxyTarget<T>(proxyToFind: unknown): T {
       return Array.from(this._proxies.entries()).find(([_, proxy]) => proxy === proxyToFind )?.[0] as T
   }

   public getProxy<T>(proxyTarget: unknown): T {
      return this._proxies.get(proxyTarget) as T;
   }

   public register(proxyTarget: unknown, proxy: unknown): void {
      this._proxies.set(proxyTarget, proxy)
   }

   public unregister(proxyTarget: unknown): void {
      this._proxies.delete(proxyTarget);
   }

   public isProxy(object: unknown): boolean {
      return !!this.getProxyTarget(object);
   }
}
