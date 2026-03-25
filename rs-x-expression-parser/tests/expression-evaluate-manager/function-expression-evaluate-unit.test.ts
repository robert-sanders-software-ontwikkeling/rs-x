import { PENDING } from '@rs-x/core';

import type { IExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager';
import { FunctionExpressionEvaluateUnit } from '../../lib/expression-evaluate-manager/function-expression-evaluate-unit';

class DepUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public context: unknown;
  public value: unknown;
  public readonly commitChange = jest.fn();
  public readonly dispose = jest.fn();
  public readonly clear = jest.fn();
  public readonly watch = jest.fn(() => this.value);
  public readonly setContext = jest.fn();
  public readonly isCommitReady = jest.fn(() => true);

  constructor(
    public readonly index: unknown,
    private readonly _setValueMatcher: (index: unknown) => boolean = () =>
      false,
  ) {}

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
  ): IExpressionEvaluateUnit | null {
    if (!this._setValueMatcher(index)) {
      return null;
    }

    this.value = value;
    this.context = context;
    return this;
  }
}

describe('FunctionExpressionEvaluateUnit', () => {
  it('watch calls dependencies and returns cached value when evaluateOnWatch is false', () => {
    const dep = new DepUnit('a');
    const evaluate = jest.fn(() => 10);
    const commit = jest.fn();
    const unit = new FunctionExpressionEvaluateUnit(
      'fn',
      'ctx',
      [dep],
      evaluate,
      commit,
      false,
    );

    unit.setValueDirectly(5);
    expect(unit.watch()).toBe(5);
    expect(dep.watch).toHaveBeenCalledTimes(1);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('watch stores evaluated value unless pending/undefined', () => {
    const dep = new DepUnit('a');
    const commit = jest.fn();
    const evaluate = jest
      .fn()
      .mockReturnValueOnce(PENDING)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(12);
    const unit = new FunctionExpressionEvaluateUnit(
      'fn',
      'ctx',
      [dep],
      evaluate,
      commit,
      true,
    );

    expect(unit.watch()).toBeUndefined();
    expect(unit.watch()).toBeUndefined();
    expect(unit.watch()).toBe(12);
    expect(unit.value).toBe(12);
  });

  it('setValue handles direct match, dependency match and eager evaluate', () => {
    const dep = new DepUnit('arg', (index) => index === 'arg');
    const evaluate = jest.fn(() => 99);
    const commit = jest.fn();
    const unit = new FunctionExpressionEvaluateUnit(
      'fn',
      'ctx',
      [dep],
      evaluate,
      commit,
      true,
      true,
    );

    expect(unit.setValue(1, 'ctx', 'fn', true)).toBe(unit);
    expect(unit.value).toBe(1);
    expect(evaluate).not.toHaveBeenCalled();

    expect(unit.setValue(2, 'ctx', 'arg', true)).toBe(unit);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(unit.value).toBe(99);

    expect(unit.setValue(3, 'ctx', 'other', true)).toBeNull();
  });

  it('setContext, clear, dispose and commit forward as expected', () => {
    const d1 = new DepUnit('a');
    const d2 = new DepUnit('b');
    const commit = jest.fn();
    const unit = new FunctionExpressionEvaluateUnit(
      'fn',
      'ctx',
      [d1, d2],
      () => 1,
      commit,
    );

    unit.context = 'other';
    expect(unit.context).toBe('other');

    unit.setValueDirectly(123);
    unit.setContext('new', 'old', 'idx');
    expect(d1.setContext).toHaveBeenCalledWith('new', 'old', 'idx');
    expect(d2.setContext).toHaveBeenCalledWith('new', 'old', 'idx');

    unit.clear();
    expect(unit.value).toBeUndefined();
    expect(d1.clear).toHaveBeenCalledTimes(1);
    expect(d2.clear).toHaveBeenCalledTimes(1);

    unit.setValueDirectly(7);
    expect(unit.isCommitReady()).toBe(true);
    unit.commitChange();
    expect(commit).toHaveBeenCalledWith(7);

    unit.dispose();
    expect(d1.dispose).toHaveBeenCalledTimes(1);
    expect(d2.dispose).toHaveBeenCalledTimes(1);
  });
});
