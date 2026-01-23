import { type IDisposable } from '../types';

export interface IISequenceWithIdData {
     sequence: readonly unknown[];
    readonly id: string
}
export interface ISequenceWithId extends IISequenceWithIdData, IDisposable {
}

export interface ISequenceIdFactory {
    create(context: unknown, sequence: unknown[]): ISequenceWithId;
    release(context: unknown, id: string): void;
    get(context: unknown,sequence: unknown[]): ISequenceWithId;
}
