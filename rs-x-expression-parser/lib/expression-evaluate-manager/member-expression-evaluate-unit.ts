import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';
import { ValueChange } from './value-change.enum';

export class MemberExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  constructor(
    public readonly index: unknown,
    private readonly _segments: IExpressionEvaluateUnit[],
  ) {}

  public dispose(): void {
    this._segments.forEach((segment) => segment.dispose());
  }

  public get value(): unknown {
    return this._segments[this._segments.length - 1].value;
  }

  public get context(): unknown {
    return this._segments[0]?.context;
  }

  public setValue(value: unknown, context: unknown, index: unknown): ValueChange {
    const segmentIndex = this._segments.findIndex(
      (segment) => segment.context === context && segment.index === index,
    );
    if (segmentIndex === -1) {
      return ValueChange.NotApplicable;
    }

    const prevValue = this.value;

    this._segments[segmentIndex].setValue(value, context, index);

    const nextSegmentIndex = segmentIndex + 1;
    if (nextSegmentIndex < this._segments.length) {
      this._segments[nextSegmentIndex].context = value;
    }

    const currentValue = this.value;

    return prevValue === currentValue
      ? ValueChange.Unchanged
      : prevValue === undefined
        ? ValueChange.Initialized
        : currentValue === undefined
          ? ValueChange.Unintialized
          : ValueChange.Changed;
  }

  public commit(): void {
    if (this.value === undefined) {
      return;
    }

    this._segments.forEach((segment) => segment.commit());
  }
}
