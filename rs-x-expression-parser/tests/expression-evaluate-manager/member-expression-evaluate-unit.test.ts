import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from '../../lib/expression-evaluate-manager';
import { MemberExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/member-expression-evaluate-unit';
import { ExpressionEvaluateChangeManagerMock } from '../../lib/testing';

class SegmentUnitMock implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public context: unknown;
  public value: unknown;
  public readonly commitChange = jest.fn();
  public readonly dispose = jest.fn();
  public readonly isCommitReady = jest.fn(() => true);
  public readonly watch = jest.fn(
    (_changeManager: IExpressionEvaluateChangeManager) => {},
  );

  constructor(
    public readonly index: unknown,
    initialValue?: unknown,
  ) {
    this.value = initialValue;
  }
}

describe('MemberExpressionEvaluateUnit', () => {
  it('seeds first segment context and propagates segment values during watch', () => {
    const a = new SegmentUnitMock('a', { mid: true });
    const b = new SegmentUnitMock('b', 1);
    const changeManager = new ExpressionEvaluateChangeManagerMock();
    const unit = new MemberExpressionEvaluateUnit({ root: true }, 'a.b', [
      a,
      b,
    ]);

    unit.watch(changeManager);

    expect(a.context).toEqual({ root: true });
    expect(b.context).toEqual({ mid: true });
    expect(a.watch).toHaveBeenCalledTimes(1);
    expect(b.watch).toHaveBeenCalledTimes(1);
    expect(unit.value).toBe(1);
  });

  it('forwards dirty leaf segment updates to parent change manager', () => {
    const a = new SegmentUnitMock('a', { mid: true });
    const b = new SegmentUnitMock('b', 1);
    const changeManager = new ExpressionEvaluateChangeManagerMock();
    const unit = new MemberExpressionEvaluateUnit({ root: true }, 'a.b', [
      a,
      b,
    ]);

    unit.watch(changeManager);

    const aChangeManager = a.watch.mock
      .calls[0][0] as IExpressionEvaluateChangeManager;
    const bChangeManager = b.watch.mock
      .calls[0][0] as IExpressionEvaluateChangeManager;

    a.value = { mid: 2 };
    aChangeManager.markDirty(a);
    expect(b.context).toEqual({ mid: 2 });
    expect(changeManager.markDirty).not.toHaveBeenCalledWith(unit);

    b.value = 2;
    bChangeManager.markDirty(b);
    expect(changeManager.markDirty).toHaveBeenCalledWith(unit);
    expect(unit.value).toBe(2);
  });

  it('commits only after all segments from pending start are updated', () => {
    const a = new SegmentUnitMock('a', { mid: true });
    const b = new SegmentUnitMock('b', 1);
    const changeManager = new ExpressionEvaluateChangeManagerMock();
    const unit = new MemberExpressionEvaluateUnit({ root: true }, 'a.b', [
      a,
      b,
    ]);

    unit.watch(changeManager);

    const aChangeManager = a.watch.mock
      .calls[0][0] as IExpressionEvaluateChangeManager;
    const bChangeManager = b.watch.mock
      .calls[0][0] as IExpressionEvaluateChangeManager;

    aChangeManager.markDirty(a);
    expect(unit.isCommitReady()).toBe(false);
    unit.commitChange();
    expect(b.commitChange).toHaveBeenCalledTimes(0);

    bChangeManager.markDirty(b);
    expect(unit.isCommitReady()).toBe(true);
    unit.commitChange();
    expect(b.commitChange).toHaveBeenCalledTimes(1);
    expect(unit.isCommitReady()).toBe(false);
  });

  it('dispose is idempotent', () => {
    const a = new SegmentUnitMock('a');
    const b = new SegmentUnitMock('b');
    const unit = new MemberExpressionEvaluateUnit({ root: true }, 'a.b', [
      a,
      b,
    ]);

    unit.dispose();
    unit.dispose();

    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(b.dispose).toHaveBeenCalledTimes(1);
  });
});
