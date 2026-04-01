import structuredCloneModule from '@ungap/structured-clone';

import { customMatchers } from './custom-matchers';

class ResizeObserverMock {
  public disconnect = jest.fn();
  public observe = jest.fn();
  public unobserve = jest.fn();
}

interface ICrypto {
  randomUUID?: () => string;
}

interface IGlobal {
  crypto: ICrypto;
}
window['__DEV__'] = true;

window.ResizeObserver = ResizeObserverMock;

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as IGlobal).crypto = {};
}

if (typeof globalThis.crypto.randomUUID !== 'function') {
  (globalThis.crypto as ICrypto).randomUUID = function randomUUID(): string {
    // Generate UUID v4
    // xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

const polyfillStructuredClone =
  // handle both default and named exports safely
  (
    structuredCloneModule as {
      structuredClone: (...args: unknown[]) => unknown;
    }
  ).structuredClone ?? structuredCloneModule;

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: polyfillStructuredClone,
    writable: false,
    configurable: false,
  });
}

// Keep memory lightweight during test runs by shrinking compiled plan cache.
// Increase via RSX_COMPILED_PLAN_CACHE_MAX in CI or specific performance runs.
if (!process.env.RSX_COMPILED_PLAN_CACHE_MAX) {
  process.env.RSX_COMPILED_PLAN_CACHE_MAX = '200';
}

expect.extend(customMatchers);
