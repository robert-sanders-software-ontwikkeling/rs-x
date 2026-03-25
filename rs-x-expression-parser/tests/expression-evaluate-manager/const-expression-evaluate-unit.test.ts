import { ConstExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/const-expression-evaluate-unit';

describe('ConstExpressionEvaluateUnit', () => {
  it('returns constant value and is always commit-ready', () => {
    const unit = new ConstExpressionEvaluateUnit('ctx', 'k', 42);

    expect(unit.watch()).toBe(42);
    expect(unit.isCommitReady()).toBe(true);
    expect(unit.count).toBe(1);
  });

  it('setValue ignores initialized updates and matches only exact context/index otherwise', () => {
    const unit = new ConstExpressionEvaluateUnit('ctx', 'k', 42);

    expect(unit.setValue(1, 'ctx', 'k', true)).toBeNull();
    expect(unit.setValue(1, 'ctx', 'x', false)).toBeNull();
    expect(unit.setValue(1, 'other', 'k', false)).toBeNull();
    expect(unit.setValue(1, 'ctx', 'k', false)).toBe(unit);
  });

  it('no-op lifecycle methods do not throw', () => {
    const unit = new ConstExpressionEvaluateUnit('ctx', 'k', 42);
    expect(() => unit.clear()).not.toThrow();
    expect(() => unit.dispose()).not.toThrow();
    expect(() => unit.commitChange()).not.toThrow();
    expect(() => unit.setContext()).not.toThrow();
  });
});
