import { Inject, Injectable } from '../dependency-injection';
import type { IProxyRegistry } from '../proxy-registry/proxy-registry.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IDeepClone } from './deep-clone.interface';
import type { IDeepCloneExcept } from './deep-clone-except.interface';

@Injectable()
export class LodashDeepClone implements IDeepClone {
  public readonly priority = 1;

  constructor(
    @Inject(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
    private readonly _deepCloneExcept: IDeepCloneExcept,
    @Inject(RsXCoreInjectionTokens.IProxyRegistry)
    private readonly _proxyRegistry: IProxyRegistry,
  ) {}

  public clone(source: unknown): unknown {
    return this.cloneInternal(
      this._proxyRegistry.getProxyTarget(source) ?? source,
      new WeakMap<object, unknown>(),
    );
  }

  private cloneInternal(
    source: unknown,
    cache: WeakMap<object, unknown>,
  ): unknown {
    const exceptValue = this._deepCloneExcept.except(source);
    if (exceptValue !== undefined) {
      return exceptValue;
    }

    if (source === null || typeof source !== 'object') {
      return source;
    }

    const resolvedSource = this._proxyRegistry.getProxyTarget(source) ?? source;
    const cached = cache.get(resolvedSource);
    if (cached !== undefined) {
      return cached;
    }

    if (Array.isArray(resolvedSource)) {
      const clonedArray: unknown[] = new Array(resolvedSource.length);
      cache.set(resolvedSource, clonedArray);

      for (let i = 0; i < resolvedSource.length; i += 1) {
        clonedArray[i] = this.cloneInternal(resolvedSource[i], cache);
      }

      return clonedArray;
    }

    if (resolvedSource instanceof Date) {
      return new Date(resolvedSource.getTime());
    }

    if (resolvedSource instanceof Map) {
      const clonedMap = new Map<unknown, unknown>();
      cache.set(resolvedSource, clonedMap);

      for (const [key, value] of resolvedSource) {
        clonedMap.set(
          this.cloneInternal(key, cache),
          this.cloneInternal(value, cache),
        );
      }

      return clonedMap;
    }

    if (resolvedSource instanceof Set) {
      const clonedSet = new Set<unknown>();
      cache.set(resolvedSource, clonedSet);

      for (const value of resolvedSource) {
        clonedSet.add(this.cloneInternal(value, cache));
      }

      return clonedSet;
    }

    if (resolvedSource instanceof ArrayBuffer) {
      return resolvedSource.slice(0);
    }

    if (ArrayBuffer.isView(resolvedSource)) {
      if (resolvedSource instanceof DataView) {
        return new DataView(
          resolvedSource.buffer.slice(0) as ArrayBufferLike,
          resolvedSource.byteOffset,
          resolvedSource.byteLength,
        );
      }

      const clonedBuffer = resolvedSource.buffer.slice(0) as ArrayBufferLike;
      return new (resolvedSource.constructor as new (
        buffer: ArrayBufferLike,
        byteOffset?: number,
        length?: number,
      ) => unknown)(
        clonedBuffer,
        (resolvedSource as { byteOffset: number }).byteOffset,
        (resolvedSource as { length?: number }).length,
      );
    }

    const prototype = Object.getPrototypeOf(resolvedSource);
    const clonedObject = Object.create(prototype) as Record<
      string | symbol,
      unknown
    >;
    cache.set(resolvedSource, clonedObject);

    const enumerableKeys = Object.keys(
      resolvedSource as Record<string, unknown>,
    );
    for (let i = 0; i < enumerableKeys.length; i += 1) {
      const key = enumerableKeys[i];
      clonedObject[key] = this.cloneInternal(
        (resolvedSource as Record<string, unknown>)[key],
        cache,
      );
    }

    const symbolKeys = Object.getOwnPropertySymbols(resolvedSource);
    for (let i = 0; i < symbolKeys.length; i += 1) {
      const key = symbolKeys[i];
      if (!Object.prototype.propertyIsEnumerable.call(resolvedSource, key)) {
        continue;
      }

      clonedObject[key] = this.cloneInternal(
        (resolvedSource as Record<string | symbol, unknown>)[key],
        cache,
      );
    }

    return clonedObject;
  }
}
