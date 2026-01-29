import { Injectable } from '../dependency-injection';

import type { IGuidFactory } from './guid.factory.interface';

@Injectable()
export class GuidFactory  implements IGuidFactory {
    public create(): string {
        return crypto.randomUUID();
    }
}