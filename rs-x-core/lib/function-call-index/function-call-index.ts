import {
  type IISequenceWithIdData,
  type ISequenceWithId,
} from '../sequence-id';
import { type IDisposableOwner } from '../singleton-factory';

import { type IDisposableFunctionCallIndex } from './function-call-index.interface';

export class FunctionCallIndex implements IDisposableFunctionCallIndex {
  private _isDisposed = false;
  private _id: string | undefined;

  constructor(
    public readonly context: unknown,
    public readonly functionName: string,
    private readonly _sequenceWithId: ISequenceWithId,
    private readonly _owner: IDisposableOwner,
  ) {}

  public get id(): string {
    if (!this._id) {
      this._id = `${this.functionName}${this._sequenceWithId.id}`;
    }
    return this._id;
  }

  public get argumentsId(): IISequenceWithIdData {
    return this._sequenceWithId;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (this._owner.canDispose?.()) {
      this._isDisposed = true;
      this._sequenceWithId.dispose();
    }

    this._owner.release();
  }
}
