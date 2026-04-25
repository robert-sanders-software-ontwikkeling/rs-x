import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Subject } from 'rxjs';

import { ObservableAccessor } from '../../lib/index-value-accessor/observable-accessor';
import { PENDING } from '../../lib/index-value-accessor/pending';
import { ResolvedValueCache } from '../../lib/index-value-accessor/resolved-value-cache';

describe('ObservableAccessor', () => {
  const createRootRxjs = (): typeof import('rxjs') => {
    const rootRequire = createRequire(join(process.cwd(), 'package.json'));
    return rootRequire('rxjs') as typeof import('rxjs');
  };

  it('indexes values from the cached emission of an observable context', () => {
    const cache = new ResolvedValueCache();
    const accessor = new ObservableAccessor(cache);
    const { BehaviorSubject } = createRootRxjs();
    const nested = new BehaviorSubject({ d: 200 });
    const root = new BehaviorSubject({
      c: nested,
      count: 1,
      optional: undefined,
    });

    cache.set(root, root.value);

    expect(accessor.applies(root, 'c')).toBe(true);
    expect(accessor.getValue(root, 'c')).toBe(nested);
    expect(accessor.getResolvedValue(root, 'count')).toBe(1);
    expect(accessor.hasValue(root, 'optional')).toBe(true);
    expect(accessor.getResolvedValue(root, 'missing')).toBe(PENDING);
  });

  it('resolves observable object properties from the cache', () => {
    const cache = new ResolvedValueCache();
    const accessor = new ObservableAccessor(cache);
    const observable = new Subject<number>();
    const model = { observable };

    expect(accessor.applies(model, 'observable')).toBe(true);
    expect(accessor.getResolvedValue(model, 'observable')).toBe(PENDING);

    cache.set(observable, 30);

    expect(accessor.getResolvedValue(model, 'observable')).toBe(30);
  });
});
