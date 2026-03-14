import { Observable } from 'rxjs';

import { Inject, Injectable } from '../dependency-injection';
import { PENDING } from '../index-value-accessor';
import type { IResolvedValueCache } from '../index-value-accessor/resolved-value-cache.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type { IDeepClone } from './deep-clone.interface';

@Injectable()
export class FastDeepClone implements IDeepClone {
  public readonly priority = 3;

  constructor(
    @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
    private readonly _resolvedValueCache: IResolvedValueCache,
  ) {}

  public clone(source: unknown): unknown {
    return this.cloneInternal(source, new WeakMap<object, unknown>());
  }

  private cloneInternal(
    source: unknown,
    cache: WeakMap<object, unknown>,
  ): unknown {
    const specialValue = this.getSpecialValue(source);
    if (specialValue !== undefined) {
      return specialValue;
    }

    if (source === null || typeof source !== 'object') {
      return source;
    }

    const cached = cache.get(source);
    if (cached !== undefined) {
      return cached;
    }

    if (Array.isArray(source)) {
      const clonedArray: unknown[] = new Array(source.length);
      cache.set(source, clonedArray);

      for (let i = 0; i < source.length; i += 1) {
        clonedArray[i] = this.cloneInternal(source[i], cache);
      }
      return clonedArray;
    }

    if (source instanceof Date) {
      return new Date(source.getTime());
    }

    if (source instanceof Map) {
      const clonedMap = new Map<unknown, unknown>();
      cache.set(source, clonedMap);
      for (const [key, value] of source) {
        clonedMap.set(
          this.cloneInternal(key, cache),
          this.cloneInternal(value, cache),
        );
      }
      return clonedMap;
    }

    if (source instanceof Set) {
      const clonedSet = new Set<unknown>();
      cache.set(source, clonedSet);
      for (const value of source) {
        clonedSet.add(this.cloneInternal(value, cache));
      }
      return clonedSet;
    }

    if (source instanceof ArrayBuffer) {
      return source.slice(0);
    }

    if (ArrayBuffer.isView(source)) {
      if (source instanceof DataView) {
        return new DataView(
          source.buffer.slice(0) as ArrayBufferLike,
          source.byteOffset,
          source.byteLength,
        );
      }

      const clonedBuffer = source.buffer.slice(0) as ArrayBufferLike;
      return new (
        source.constructor as new (
          buffer: ArrayBufferLike,
          byteOffset?: number,
          length?: number,
        ) => unknown
      )(
        clonedBuffer,
        (source as { byteOffset: number }).byteOffset,
        (source as { length?: number }).length,
      );
    }

    const prototype = Object.getPrototypeOf(source);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('FastDeepCloneUnsupported');
    }

    const clonedObject = Object.create(prototype) as Record<
      string | symbol,
      unknown
    >;
    cache.set(source, clonedObject);

    const enumerableKeys = Object.keys(source as Record<string, unknown>);
    for (let i = 0; i < enumerableKeys.length; i += 1) {
      const key = enumerableKeys[i];
      clonedObject[key] = this.cloneInternal(
        (source as Record<string, unknown>)[key],
        cache,
      );
    }

    const symbolKeys = Object.getOwnPropertySymbols(source);
    for (let i = 0; i < symbolKeys.length; i += 1) {
      const key = symbolKeys[i];
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) {
        continue;
      }
      clonedObject[key] = this.cloneInternal(
        (source as Record<string | symbol, unknown>)[key],
        cache,
      );
    }

    return clonedObject;
  }

  private getSpecialValue(value: unknown): unknown {
    if (value instanceof Promise || value instanceof Observable) {
      const resolvedValue = this._resolvedValueCache.get(value);
      return resolvedValue === undefined ? PENDING : resolvedValue;
    }

    return undefined;
  }
}
