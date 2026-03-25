import { type IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export class ConstExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  public locked = false;

  constructor(
    public readonly context: unknown,
    public readonly index: unknown,
    public readonly value: unknown,
  ) {}

  public dispose(): void {}

  public clear(): void {}

  public isCommitReady(): boolean {
    return true;
  }

  public watch(): unknown {
    return this.value;
  }

  public commitChange(): void {}

  public setContext(): void {}

  public setValue(
    _value: unknown,
    context: unknown,
    index: unknown,
    initialized: boolean,
  ): IExpressionEvaluateUnit | null {
    if (initialized) {
      return null;
    }
    return this.context == context && this.index === index ? this : null;
  }
}
