import { Observable } from 'rxjs';

import { Injectable } from '../dependency-injection';

import type { IValueMetadata } from './value-metadata.interface';


@Injectable()
export class ObservableMetadata implements IValueMetadata {
    public readonly priority = 5;

    public isAsync(): boolean {
       return true;
    }

    public needsProxy(): boolean {
        return true;
    }

    public applies(value: unknown): boolean {
       return value instanceof Observable;
    }
}