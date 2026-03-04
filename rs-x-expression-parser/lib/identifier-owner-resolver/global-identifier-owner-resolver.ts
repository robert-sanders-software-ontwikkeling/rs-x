import { Injectable, Type } from '@rs-x/core';

import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class GlobalIdentifierOwnerResolver implements IIdentifierOwnerResolver {
  private static readonly allowedGlobals = new Set<string>([
    'Math',
    'Date',
    'Number',
    'String',
    'Boolean',
    'BigInt',
    'Symbol',
    'Object',
    'Array',
    'RegExp',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'Promise',
    'Error',
    'TypeError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'URIError',
    'AggregateError',
    'JSON',
    'Intl',
    'Reflect',
    'Proxy',
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
    'encodeURI',
    'encodeURIComponent',
    'decodeURI',
    'decodeURIComponent',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'console',
  ]);

  public resolve(index: unknown): object | null {
    if (!Type.isString(index) || index.length === 0) {
      return null;
    }

    if (!GlobalIdentifierOwnerResolver.allowedGlobals.has(index)) {
      return null;
    }

    return Type.cast(globalThis);
  }
}
