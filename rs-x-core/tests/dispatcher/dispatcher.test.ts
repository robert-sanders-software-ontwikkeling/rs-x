import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { Dispatcher } from '../../lib/dispatcher/dispatcher';

describe('Dispatcher', () => {
  let dispatcher: Dispatcher<number>;

  beforeEach(() => {
    dispatcher = new Dispatcher<number>();
  });

  describe('addListener / dispatch', () => {
    it('calls registered listener on dispatch', () => {
      const cb = jest.fn();
      dispatcher.addListener('key', cb);
      dispatcher.dispatch(42);
      expect(cb).toHaveBeenCalledWith(42);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('calls multiple listeners on dispatch', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      dispatcher.addListener('k1', cb1);
      dispatcher.addListener('k2', cb2);
      dispatcher.dispatch(7);
      expect(cb1).toHaveBeenCalledWith(7);
      expect(cb2).toHaveBeenCalledWith(7);
    });

    it('replaces listener when same key is re-registered', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      dispatcher.addListener('key', cb1);
      dispatcher.addListener('key', cb2);
      dispatcher.dispatch(1);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledWith(1);
    });
  });

  describe('removeListener', () => {
    it('does not call listener after removal', () => {
      const cb = jest.fn();
      dispatcher.addListener('key', cb);
      dispatcher.removeListener('key');
      dispatcher.dispatch(99);
      expect(cb).not.toHaveBeenCalled();
    });

    it('silently ignores removal of unknown key', () => {
      expect(() => dispatcher.removeListener('nonexistent')).not.toThrow();
    });

    it('only removes the specified listener', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      dispatcher.addListener('k1', cb1);
      dispatcher.addListener('k2', cb2);
      dispatcher.removeListener('k1');
      dispatcher.dispatch(5);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledWith(5);
    });
  });

  describe('dispatch with no listeners', () => {
    it('does not throw when no listeners registered', () => {
      expect(() => dispatcher.dispatch(1)).not.toThrow();
    });
  });

  describe('observable (RxJS interop)', () => {
    it('emits values to observable subscribers', async () => {
      const promise = firstValueFrom(dispatcher.observable.pipe(take(1)));
      dispatcher.dispatch(123);
      await expect(promise).resolves.toBe(123);
    });

    it('supports multiple observable subscribers independently', async () => {
      const p1 = firstValueFrom(dispatcher.observable.pipe(take(1)));
      const p2 = firstValueFrom(dispatcher.observable.pipe(take(1)));
      dispatcher.dispatch(55);
      await expect(p1).resolves.toBe(55);
      await expect(p2).resolves.toBe(55);
    });

    it('each subscription gets its own incrementing id', async () => {
      const values1: number[] = [];
      const values2: number[] = [];
      const sub1 = dispatcher.observable.subscribe((v) => values1.push(v));
      const sub2 = dispatcher.observable.subscribe((v) => values2.push(v));
      dispatcher.dispatch(1);
      dispatcher.dispatch(2);
      sub1.unsubscribe();
      sub2.unsubscribe();
      expect(values1).toEqual([1, 2]);
      expect(values2).toEqual([1, 2]);
    });

    it('removes listener from map when observable subscription is unsubscribed', () => {
      const sub = dispatcher.observable.subscribe(() => {});
      const cb = jest.fn();
      dispatcher.addListener('extra', cb);
      sub.unsubscribe();
      // After unsubscribe the observable listener is removed; only 'extra' remains
      dispatcher.dispatch(10);
      expect(cb).toHaveBeenCalledWith(10);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('collects multiple emissions via take+toArray', async () => {
      const promise = firstValueFrom(
        dispatcher.observable.pipe(take(3), toArray()),
      );
      dispatcher.dispatch(1);
      dispatcher.dispatch(2);
      dispatcher.dispatch(3);
      await expect(promise).resolves.toEqual([1, 2, 3]);
    });
  });

  describe('mixed addListener and observable', () => {
    it('dispatches to both direct listeners and observable subscribers', () => {
      const direct = jest.fn();
      const rxjs: number[] = [];
      dispatcher.addListener('d', direct);
      const sub = dispatcher.observable.subscribe((v) => rxjs.push(v));
      dispatcher.dispatch(77);
      sub.unsubscribe();
      expect(direct).toHaveBeenCalledWith(77);
      expect(rxjs).toEqual([77]);
    });
  });
});
