import { PENDING } from '@rs-x/core';

import type { IExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager';
import { MemberExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/member-expression-evaluate-unit';

class SegmentUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public value: unknown;
  public context: unknown;
  public readonly commitChange = jest.fn();
  public readonly dispose = jest.fn();
  public readonly clear = jest.fn();
  public readonly watch = jest.fn(() => this.value);
  public readonly setContext = jest.fn();
  public readonly isCommitReady = jest.fn(() => true);

  constructor(
    public readonly index: unknown,
    initialValue?: unknown,
  ) {
    this.value = initialValue;
  }

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
  ): IExpressionEvaluateUnit | null {
    if (index !== this.index || context !== this.context) {
      return null;
    }

    this.value = value;
    return this;
  }
}

type IMemberUnitTestInternals = {
  _pendingStartSegmentIndex: number | undefined;
  _updatedSegmentIndexes: Set<number>;
};

describe('MemberExpressionEvaluateUnit', () => {
  it('updates root context, clears internal state and propagates context to first segment', () => {
    const a = new SegmentUnit('a');
    const b = new SegmentUnit('b');
    const start = { start: true };
    const unit = new MemberExpressionEvaluateUnit(start, 'a.b', [a, b]);

    unit.context = start;
    expect(a.clear).toHaveBeenCalledTimes(0);

    const next = { next: true };
    unit.context = next;
    expect(a.clear).toHaveBeenCalledTimes(1);
    expect(b.clear).toHaveBeenCalledTimes(1);
    expect(a.context).toBe(next);
  });

  it('returns undefined when last segment is pending during watch', () => {
    const a = new SegmentUnit('a', { mid: true });
    const b = new SegmentUnit('b', PENDING);
    a.context = { ctx: true };
    b.context = a.value;

    const unit = new MemberExpressionEvaluateUnit({ ctx: true }, 'a.b', [a, b]);
    const value = unit.watch();

    expect(value).toBeUndefined();
    expect(b.context).toBe(a.value);
  });

  it('watch falls back to segment.value when watch returns undefined', () => {
    const a = new SegmentUnit('a', { next: true });
    const b = new SegmentUnit('b', 7);
    a.watch.mockReturnValue(undefined);
    b.watch.mockReturnValue(undefined);
    a.context = { root: true };

    const unit = new MemberExpressionEvaluateUnit({ root: true }, 'a.b', [
      a,
      b,
    ]);
    const value = unit.watch();

    expect(b.context).toEqual({ next: true });
    expect(value).toBe(7);
  });

  it('propagates undefined context when an intermediate segment is pending', () => {
    const a = new SegmentUnit('a', PENDING);
    const b = new SegmentUnit('b', 1);
    a.context = { ctx: true };
    b.context = { stale: true };

    const unit = new MemberExpressionEvaluateUnit({ ctx: true }, 'a.b', [a, b]);
    unit.watch();

    expect(b.context).toBeUndefined();
  });

  it('setContext updates matching segment and ignores non-matching ones', () => {
    const a = new SegmentUnit('a');
    const b = new SegmentUnit('b');
    const unit = new MemberExpressionEvaluateUnit({ ctx: true }, 'a.b', [a, b]);

    const oldA = { oldA: true };
    const oldB = { oldB: true };
    const fresh = { fresh: true };

    a.context = oldA;
    b.context = oldB;

    unit.setContext(fresh, oldB, 'b');
    expect(b.context).toBe(fresh);

    unit.setContext({ ignored: true }, { nope: true }, 'z');
    expect(a.context).toBe(oldA);
  });

  it('setValue returns null for non-matching updates and isCommitReady false before start', () => {
    const a = new SegmentUnit('a');
    const b = new SegmentUnit('b');
    const unit = new MemberExpressionEvaluateUnit({ ctx: true }, 'a.b', [a, b]);

    expect(unit.isCommitReady()).toBe(false);
    expect(unit.setValue(1, { no: true }, 'z', true)).toBeNull();
  });

  it('commitChange is guarded by readiness and dispose is idempotent', () => {
    const a = new SegmentUnit('a');
    const b = new SegmentUnit('b');
    const unit = new MemberExpressionEvaluateUnit({ ctx: true }, 'a.b', [a, b]);

    const root = { ctx: true };
    const mid = { b: 1 };
    a.context = root;
    unit.setValue(PENDING, root, 'a', true);
    expect(unit.isCommitReady()).toBe(false);
    unit.commitChange();
    expect(b.commitChange).toHaveBeenCalledTimes(0);

    a.value = mid;
    b.context = mid;
    unit.setValue(1, mid, 'b', true);
    expect(unit.isCommitReady()).toBe(true);
    unit.commitChange();
    expect(b.commitChange).toHaveBeenCalledTimes(1);

    unit.dispose();
    unit.dispose();
    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(b.dispose).toHaveBeenCalledTimes(1);
  });

  it('commitChange safely handles missing last segment', () => {
    const unit = new MemberExpressionEvaluateUnit({ ctx: true }, 'empty', []);
    const internals = unit as unknown as IMemberUnitTestInternals;
    internals._pendingStartSegmentIndex = 0;
    internals._updatedSegmentIndexes.add(0);

    expect(unit.isCommitReady()).toBe(true);
    expect(() => unit.commitChange()).not.toThrow();
  });

  it('does not mark next segment updated when next context is undefined', () => {
    const a = new SegmentUnit('a', undefined);
    const b = new SegmentUnit('b', 1);
    const root = { root: true };
    a.context = root;
    b.context = { old: true };
    const unit = new MemberExpressionEvaluateUnit(root, 'a.b', [a, b]);

    unit.setValue(PENDING, root, 'a', true);
    const internals = unit as unknown as IMemberUnitTestInternals;
    expect(internals._updatedSegmentIndexes.has(1)).toBe(false);
  });

  it('marks next segment updated when initialized and next context exists', () => {
    const a = new SegmentUnit('a', { x: 1 });
    const b = new SegmentUnit('b', 2);
    const root = { root: true };
    a.context = root;
    const unit = new MemberExpressionEvaluateUnit(root, 'a.b', [a, b]);

    unit.setValue({ x: 2 }, root, 'a', true);
    const internals = unit as unknown as IMemberUnitTestInternals;
    expect(internals._updatedSegmentIndexes.has(1)).toBe(true);
  });
});
