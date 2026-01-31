import { Injectable } from '../dependency-injection';

import type { IValueMetadata } from './value-metadata.interface';


@Injectable()
export class PromiseMetadata implements IValueMetadata {
    public readonly priority = 4;

    public isAsync(): boolean {
       return true;
    }

    public needsProxy(): boolean {
        return true;
    }

    public applies(value: unknown): boolean {
       return value instanceof Promise;
    }
}