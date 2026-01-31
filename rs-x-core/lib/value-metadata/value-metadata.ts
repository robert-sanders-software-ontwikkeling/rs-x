import { Injectable, MultiInject } from '../dependency-injection';
import { UnsupportedException } from '../exceptions/unsupported-exception';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Type } from '../types/type';

import type { IValueMetadata } from './value-metadata.interface';

@Injectable()
export class ValueMetadata implements IValueMetadata {
  public readonly priority = 11;
  private readonly _valueMetadataList: IValueMetadata[];

  constructor(
    @MultiInject(RsXCoreInjectionTokens.IValueMetadataList)
    valueMetadataList: readonly IValueMetadata[],
  ) {
    this._valueMetadataList = [...valueMetadataList].sort(
      (a, b) => b.priority - a.priority,
    );
  }

  public isAsync(value: unknown): boolean {
    return this.getValueMetadata(value).isAsync(value);
  }

  public needsProxy(value: unknown): boolean {
    return this.getValueMetadata(value).needsProxy(value);
  }

  public applies(value: unknown): boolean {
    return !!this.getValueMetadata(value);
  }

  private getValueMetadata(value: unknown): IValueMetadata {
    const valueMetadata = this._valueMetadataList.find((valueMetadata) =>
      valueMetadata.applies(value),
    );

    if (!valueMetadata) {
      throw new UnsupportedException(
        `No accessor found for ${Type.toObject(value)?.constructor.name}}`,
      );
    }

    return valueMetadata;
  }
}
