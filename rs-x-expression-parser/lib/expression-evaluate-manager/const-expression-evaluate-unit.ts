import {
  type IExpressionEvaluateChangeManager,
  type IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';

export class ConstExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly context: unknown = undefined;
  public readonly index: unknown = undefined;
  public readonly count = 1;
  public locked = false;

  constructor(public readonly value: unknown) {}

  public dispose(): void {}

  public isCommitReady(): boolean {
    return true;
  }

  public watch(changeManager: IExpressionEvaluateChangeManager): void {
    changeManager.markDirty(this);
  }

  public commitChange(): void {}
}
