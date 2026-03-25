import { PENDING } from '@rs-x/core';

import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export class MemberExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count: number;
  private _isDipsosed = false;
  private readonly _updatedSegmentIndexes = new Set<number>();
  private _pendingStartSegmentIndex: number | undefined;

  constructor(
    private _context: unknown,
    public readonly index: unknown,
    private readonly _segments: readonly IExpressionEvaluateUnit[],
  ) {
    this.count = 1;
  }

  public get context(): unknown {
    return this._context;
  }

  public set context(value: unknown) {
    if (this._context === value) {
      return;
    }
    this._context = value;

    this.clear();
    this._segments[0].context = value;
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

  public watch(): unknown {
    const segments = this._segments;
    segments[0].context = this.context;

    for (let i = 0; i < segments.length; i++) {
      const watchedValue = segments[i].watch();
      const currentValue =
        watchedValue === undefined ? segments[i].value : watchedValue;

      const nextSegmentIndex = i + 1;
      if (nextSegmentIndex < segments.length) {
        segments[nextSegmentIndex].context =
          currentValue === PENDING ? undefined : currentValue;
      }
    }

    return this.value === PENDING ? undefined : this.value;
  }

  public clear(): void {
    this._updatedSegmentIndexes.clear();
    this._pendingStartSegmentIndex = undefined;
    this._segments.forEach((segment) => segment.clear());
  }

  public setContext(
    context: unknown,
    oldContext: unknown,
    index: unknown,
  ): void {
    const segments = this._segments;
    const segmentIndex = segments.findIndex(
      (segment) => segment.context === oldContext && segment.index === index,
    );
    if (segmentIndex === -1) {
      return;
    }

    segments[segmentIndex].context = context;
  }

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
    initialized: boolean,
  ): IExpressionEvaluateUnit | null {
    const segments = this._segments;
    let segmentIndex = -1;
    let segement: IExpressionEvaluateUnit | null = null;

    for (let i = 0; i < segments.length; i++) {
      const currentSegment = segments[i].setValue(
        value,
        context,
        index,
        initialized,
      );

      if (currentSegment === null) {
        continue;
      }

      segmentIndex = i;
      segement = currentSegment;
      break;
    }

    if (segmentIndex === -1 || segement === null) {
      return null;
    }

    if (initialized) {
      this._updatedSegmentIndexes.add(segmentIndex);
      this._pendingStartSegmentIndex =
        this._pendingStartSegmentIndex === undefined
          ? segmentIndex
          : Math.min(this._pendingStartSegmentIndex, segmentIndex);
    }

    const nextSegmentIndex = segmentIndex + 1;
    if (nextSegmentIndex < this._segments.length) {
      const nextContext =
        segement.value === PENDING ? undefined : segement.value;
      this._segments[nextSegmentIndex].context = nextContext;
      if (initialized && nextContext !== undefined) {
        this._updatedSegmentIndexes.add(nextSegmentIndex);
      }
    }

    return this;
  }

  //This method is only call after changes when initialize
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

  public commitChange(): void {
    if (!this.isCommitReady()) {
      return;
    }

    this._segments.at(-1)?.commitChange();
    this._updatedSegmentIndexes.clear();
    this._pendingStartSegmentIndex = undefined;
  }
}
