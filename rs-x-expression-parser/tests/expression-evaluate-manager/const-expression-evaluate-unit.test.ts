import { ConstExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/const-expression-evaluate-unit';
import { ExpressionEvaluateChangeManagerMock } from '../../lib/testing';

describe('ConstExpressionEvaluateUnit', () => {
  it('is always commit-ready and exposes the configured constant value', () => {
    const unit = new ConstExpressionEvaluateUnit(42);

    expect(unit.value).toBe(42);
    expect(unit.isCommitReady()).toBe(true);
    expect(unit.count).toBe(1);
  });

  it('watch notifies through markDirty', () => {
    const unit = new ConstExpressionEvaluateUnit(42);
    const changeManager = new ExpressionEvaluateChangeManagerMock();

    unit.watch(changeManager);

    expect(changeManager.markDirty).toHaveBeenCalledWith(unit);
  });

  it('lifecycle no-op methods are safe', () => {
    const unit = new ConstExpressionEvaluateUnit(42);

    expect(() => unit.commitChange()).not.toThrow();
    expect(() => unit.dispose()).not.toThrow();
  });
});
