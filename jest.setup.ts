import { customMatchers } from './custom-matchers';
import structuredCloneModule from '@ungap/structured-clone';

process.env.TZ = "UTC";

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

expect.extend(customMatchers);
