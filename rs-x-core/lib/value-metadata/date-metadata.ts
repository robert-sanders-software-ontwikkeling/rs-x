import { Injectable } from '../dependency-injection';

import type { IValueMetadata } from './value-metadata.interface';

@Injectable()
export class DateMetadata implements IValueMetadata {
  public readonly priority = 7;

  public isAsync(): boolean {
    return false;
  }

  public needsProxy(): boolean {
    return true;
  }

  public applies(value: unknown): boolean {
    return value instanceof Date;
  }
}
