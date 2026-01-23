import { type ISequenceIdFactory } from '../sequence-id/sequence-id-factory.interface';

export class SequenceIdFactoryMock implements ISequenceIdFactory {
    public readonly create = jest.fn();
    public readonly release= jest.fn();
    public readonly get= jest.fn();
}