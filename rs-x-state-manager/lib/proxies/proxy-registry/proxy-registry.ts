import { Injectable } from '@rs-x-core';
import { IProxyRegistry } from './proxy-registry.interface';

@Injectable()
export class ProxyRegistry implements IProxyRegistry {
   private readonly _proxies = new Set<unknown>();

   public register(proxy: unknown): void {
      if (!this._proxies.has(proxy)) {
         this._proxies.add(proxy);
      }
   }

   public unregister(proxy: unknown): void {
      this._proxies.delete(proxy);
   }

   public isProxy(object: unknown): boolean {
      return this._proxies.has(object);
   }
}
