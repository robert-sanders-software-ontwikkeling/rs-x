import type { IExpressionEvaluateChangeManager } from '../expression-evaluate-manager/expression-evaluate-unit.interface';

declare const jest: {
  fn: <T extends (...args: unknown[]) => unknown>(implementation?: T) => T;
};

export class ExpressionEvaluateChangeManagerMock implements IExpressionEvaluateChangeManager {
  constructor(properties?: Partial<IExpressionEvaluateChangeManager>) {
    Object.assign(this, properties);
  }

  public readonly isInitialized = jest.fn(() => true);
  public readonly incrementChangeCycle = jest.fn();
  public readonly decrementChangeCycle = jest.fn();
  public readonly markDirty = jest.fn();
}
