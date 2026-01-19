import { IDisposableFunctionCallIndex } from '../function-call-index/function-call-index.interface';
import { IISequenceWithIdData } from '../sequence-id';

export class DisposableFunctionCallIndexMock implements IDisposableFunctionCallIndex {
    constructor(
        public readonly context: unknown,
        public readonly functionName: string,
        public readonly argumentsId: IISequenceWithIdData,
        public readonly id: string
    ) {
    }

    public readonly dispose = jest.fn();
}