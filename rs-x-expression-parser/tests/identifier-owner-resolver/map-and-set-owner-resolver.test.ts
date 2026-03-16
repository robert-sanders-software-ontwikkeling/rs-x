import { MapKeyOwnerResolver } from '../../lib/identifier-owner-resolver/map-key-owner-resolver';
import { SetKeyOwnerResolver } from '../../lib/identifier-owner-resolver/set-key-owner-resolver';

describe('Map and Set owner resolvers', () => {
  it('MapKeyOwnerResolver resolves only Map keys', () => {
    const resolver = new MapKeyOwnerResolver();
    const map = new Map([['a', 1]]);
    const set = new Set(['a']);

    expect(resolver.resolve('a', map)).toBe(map);
    expect(resolver.resolve('a', set)).toBeNull();
  });

  it('SetKeyOwnerResolver resolves Set membership keys', () => {
    const resolver = new SetKeyOwnerResolver();
    const key = { id: 'A' };
    const set = new Set([key]);
    const map = new Map([[key, 1]]);

    expect(resolver.resolve(key, set)).toBe(set);
    expect(resolver.resolve(key, map as unknown as Set<unknown>)).toBeNull();
  });
});
