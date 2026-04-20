import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';

export class MemberExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count: number;
  private _isDipsosed = false;
  private readonly _updatedSegmentIndexes = new Set<number>();
  private _pendingStartSegmentIndex: number | undefined;

  private _changeManager!: IExpressionEvaluateChangeManager;
  private _segmentsChangeManager!: IExpressionEvaluateChangeManager;

  constructor(
    private _context: unknown,
    public readonly index: unknown,
    private readonly _segments: readonly IExpressionEvaluateUnit[],
  ) {
    this.count = 1;

    this._segmentsChangeManager = {
      markDirty: this.markDirty,
      isInitialized: () => this._changeManager.isInitialized(),
      incrementChangeCycle: () => this._changeManager.incrementChangeCycle(),
      decrementChangeCycle: () => this._changeManager.decrementChangeCycle(),
    };
  }

  public get context(): unknown {
    return this._context;
  }

  public get value(): unknown {
    return this._segments[this._segments.length - 1].value;
  }

  public dispose(): void {
    if (this._isDipsosed) {
      return;
    }
    this._isDipsosed = true;
    this._segments.forEach((segment) => segment.dispose());
  }

  public watch(changeManager: IExpressionEvaluateChangeManager): void {
    this._changeManager = changeManager;
    const segments = this._segments;
    if (segments.length > 0 && segments[0].context === undefined) {
      segments[0].context = this._context;
    }

    for (let i = 0; i < segments.length; i++) {
      segments[i].watch(this._segmentsChangeManager);
      if (i < segments.length - 1 && segments[i].value !== undefined) {
        segments[i + 1].context = segments[i].value;
      }
    }
  }

  private markDirty = (segement: IExpressionEvaluateUnit) => {
    const segementIndex = this._segments.indexOf(segement);
    this._pendingStartSegmentIndex =
      this._pendingStartSegmentIndex === undefined
        ? segementIndex
        : Math.min(this._pendingStartSegmentIndex, segementIndex);

    this._updatedSegmentIndexes.add(segementIndex);
    if (segementIndex === this._segments.length - 1) {
      this._changeManager.markDirty(this);
    } else {
      this._segments[segementIndex + 1].context = segement.value;
    }
  };

  public isCommitReady(): boolean {
    if (this._pendingStartSegmentIndex === undefined) {
      return false;
    }

    for (
      let i = this._pendingStartSegmentIndex;
      i < this._segments.length;
      i++
    ) {
      if (!this._updatedSegmentIndexes.has(i)) {
        return false;
      }
    }

    return true;
  }

  //This method is only call after changes when initialize
  public commitChange(): void {
    if (!this.isCommitReady()) {
      return;
    }

    this._segments.at(-1)?.commitChange();
    this._updatedSegmentIndexes.clear();
    this._pendingStartSegmentIndex = undefined;
  }
}
