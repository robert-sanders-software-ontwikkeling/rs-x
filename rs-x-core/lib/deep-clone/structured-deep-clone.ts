import { Injectable } from '../dependency-injection';
import { IDeepClone } from './deep-clone.interface';

@Injectable()
export class StructuredDeepClone implements IDeepClone {
    public readonly priority = 2;

    public clone(source: unknown): unknown {
        return structuredClone(source);
    }
}
