import { Observable } from 'rxjs';

import { FastDeepClone } from '../../lib/deep-clone/fast-deep-clone';
import { PENDING } from '../../lib/index-value-accessor';
import type { IResolvedValueCache } from '../../lib/index-value-accessor/resolved-value-cache.interface';

describe('FastDeepClone', () => {
  const createClone = (
    getResolvedValue: (source: WeakKey) => unknown = () => undefined,
  ) => {
    const resolvedValueCache: IResolvedValueCache = {
      set: () => undefined,
      get: getResolvedValue,
      delete: () => undefined,
    };

    return new FastDeepClone(resolvedValueCache);
  };

  it('clones plain nested object graphs, arrays, maps, sets and dates', () => {
    const source = {
      id: 'A',
      date: new Date('2026-01-02T03:04:05.000Z'),
      array: [1, { nested: true }],
      map: new Map<unknown, unknown>([
        ['a', 1],
        ['b', { deep: 'value' }],
      ]),
      set: new Set<unknown>([1, { item: 'x' }]),
    };
    const clone = createClone().clone(source) as typeof source;

    expect(clone).not.toBe(source);
    expect(clone.array).not.toBe(source.array);
    expect(clone.map).not.toBe(source.map);
    expect(clone.set).not.toBe(source.set);
    expect(clone.date).not.toBe(source.date);
    expect(clone.date.getTime()).toBe(source.date.getTime());
    expect(clone.array[1]).toEqual({ nested: true });
    expect(clone.map.get('b')).toEqual({ deep: 'value' });
    expect([...clone.set]).toEqual([...source.set]);
  });

  it('uses resolved value cache for Promise and Observable values', () => {
    const promise = Promise.resolve(10);
    const observable = new Observable<number>((subscriber) => {
      subscriber.next(20);
      subscriber.complete();
    });
    const clone = createClone((source) => {
      if (source === promise) {
        return 10;
      }
      if (source === observable) {
        return 20;
      }
      return undefined;
    });

    expect(clone.clone(promise)).toBe(10);
    expect(clone.clone(observable)).toBe(20);
    expect(createClone().clone(Promise.resolve(1))).toBe(PENDING);
  });

  it('throws for unsupported custom class prototypes', () => {
    class Custom {
      public constructor(public readonly value: number) {}
    }
    const source = new Custom(10);

    expect(() => createClone().clone(source)).toThrow('FastDeepCloneUnsupported');
  });
});
