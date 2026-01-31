import { Injectable } from '../dependency-injection';

import type { IValueMetadata } from './value-metadata.interface';


@Injectable()
export class ArrayMetadata implements IValueMetadata {
    public readonly priority = 8;

    public isAsync(): boolean {
       return false;
    }

    public needsProxy(): boolean {
        return true;
    }

    public applies(value: unknown): boolean {
       return Array.isArray(value);
    }
}