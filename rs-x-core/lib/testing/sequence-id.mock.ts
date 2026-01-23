import { type ISequenceWithId } from '../sequence-id';

export class SequenceWithIdMock implements ISequenceWithId {
    constructor(public readonly id: string, public readonly sequence: unknown[] = [] ) {}

    public readonly  dispose = jest.fn();
}