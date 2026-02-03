import { Injectable } from '../dependency-injection';

import type { IValueMetadata } from './value-metadata.interface';

@Injectable()
export class MapMetadata implements IValueMetadata {
  public readonly priority = 6;

  public isAsync(): boolean {
    return false;
  }

  public needsProxy(): boolean {
    return true;
  }

  public applies(value: unknown): boolean {
    return value instanceof Map;
  }
}
