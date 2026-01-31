import { Injectable } from '../dependency-injection';

import type { IMapKeyAccessor } from './map-key-accessor.type';

@Injectable()
export class MapKeyAccessor implements IMapKeyAccessor {
   public readonly priority = 4;

   public getIndexes(map: Map<unknown, unknown>): IterableIterator<unknown, unknown, unknown> {
      return map.keys();
   }

   public hasValue(map: Map<unknown, unknown>, key: unknown): boolean {
      return map.has(key);
   }

   public getResolvedValue(map: Map<unknown, unknown>, key: unknown): unknown {
      return map.get(key);
   }

   public getValue(map: Map<unknown, unknown>, key: unknown): unknown {
      return this.getResolvedValue(map, key);
   }

   public setValue(
      map: Map<unknown, unknown>,
      key: unknown,
      value: unknown
   ): void {
      map.set(key, value);
   }

   public applies(map: unknown): boolean {
      return map instanceof Map;
   }
}
