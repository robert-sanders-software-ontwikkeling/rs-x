import { Injectable } from '../dependency-injection';

import type { IValueMetadata } from './value-metadata.interface';


@Injectable()
export class DummyMetadata implements IValueMetadata {
    public readonly priority = -1000;

    public isAsync(): boolean {
       return false;
    }

    public needsProxy(): boolean {
        return false;
    }

    public applies(): boolean {
       return true;
    }
}