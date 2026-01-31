import { type MatcherFunction } from 'expect';

import { type AbstractObserver } from '@rs-x/state-manager';
import { observerEqualTo as _observerEqualTo } from '@rs-x/state-manager/testing';

type SeenMap = WeakMap<object, string>;

export function findDifferences(
  a: object,
  b: object,
  path: string = '',
  seenA: SeenMap = new WeakMap(),
  seenB: SeenMap = new WeakMap(),
): string[] {
  const differences: string[] = [];

  if (a === b) return differences;

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) {
    differences.push(`${path}: types differ (${typeA} vs ${typeB})`);
    return differences;
  }

  if (typeA === 'function') {
    if (a.toString() !== b.toString()) {
      differences.push(`${path}: functions differ`);
    }
    return differences;
  }

  if (a === null || b === null) {
    if (a !== b) differences.push(`${path}: ${a} !== ${b}`);
    return differences;
  }

  if (typeA !== 'object') {
    if (a !== b)
      differences.push(
        `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`,
      );
    return differences;
  }

  // Only track for recursive plain objects (not Map/Set)
  const isPlain =
    Object.getPrototypeOf(a) === Object.prototype ||
    Object.getPrototypeOf(a) === null;

  if (isPlain) {
    if (seenA.has(a) || seenB.has(b)) {
      if (seenA.get(a) !== seenB.get(b)) {
        differences.push(`${path}: circular structure mismatch`);
      }
      return differences;
    }
    seenA.set(a, path);
    seenB.set(b, path);
  }

  // Handle Map
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size)
      differences.push(`${path}: map size differs (${a.size} vs ${b.size})`);

    for (const [key, valA] of a.entries()) {
      if (!b.has(key)) {
        differences.push(
          `${path}: missing key in expected map -> ${String(key)}`,
        );
      } else {
        const valB = b.get(key);
        differences.push(
          ...findDifferences(
            valA,
            valB,
            `${path}.get(${String(key)})`,
            seenA,
            seenB,
          ),
        );
      }
    }
    for (const key of b.keys()) {
      if (!a.has(key)) {
        differences.push(
          `${path}: missing key in received map -> ${String(key)}`,
        );
      }
    }
    return differences;
  }

  // Handle Set
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size)
      differences.push(`${path}: set size differs (${a.size} vs ${b.size})`);

    for (const valA of a) {
      if (![...b].some((valB) => Object.is(valA, valB))) {
        differences.push(
          `${path}: missing value in expected set -> ${String(valA)}`,
        );
      }
    }
    for (const valB of b) {
      if (![...a].some((valA) => Object.is(valA, valB))) {
        differences.push(
          `${path}: missing value in received set -> ${String(valB)}`,
        );
      }
    }
    return differences;
  }

  // Regular object
  const keysA = new Set(Object.keys(a));
  const keysB = new Set(Object.keys(b));
  const allKeys = new Set([...keysA, ...keysB]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    if (!(key in a)) differences.push(`${newPath}: missing in received`);
    else if (!(key in b)) differences.push(`${newPath}: missing in expected`);
    else
      differences.push(
        ...findDifferences(a[key], b[key], newPath, seenA, seenB),
      );
  }

  return differences;
}

const toDeepEqualCircular: MatcherFunction<[expected: unknown]> = function (
  this, // Jest matcher context
  received: unknown, // must be unknown, not object
  expected: unknown, // expected argument can also be unknown
) {
  // Optionally assert that received and expected are objects
  if (typeof received !== 'object' || received === null) {
    return {
      pass: false,
      message: () => 'Received value is not an object',
    };
  }

  if (typeof expected !== 'object' || expected === null) {
    return {
      pass: false,
      message: () => 'Expected value is not an object',
    };
  }

  // Now safe to cast
  const diffs = findDifferences(received as object, expected as object);
  const pass = diffs.length === 0;

  return {
    pass,
    message: () =>
      pass
        ? this.utils.matcherHint('.not.toDeepEqualCircularWithDiff') +
          '\n\nExpected values not to be deeply equal, but they were.'
        : this.utils.matcherHint('.toDeepEqualCircularWithDiff') +
          '\n\nFound the following differences:\n\n' +
          diffs.map((d) => `  • ${d}`).join('\n'),
  };
};

export function observerEqualTo(
  received: AbstractObserver,
  expected: AbstractObserver,
) {
  const pass = _observerEqualTo(received, expected);

  if (pass) {
    return {
      message: () =>
        `expected observer ${received.constructor.name} not to be equal to ${expected.constructor.name}`,
      pass: true,
    };
  } else {
    return {
      message: () =>
        `expected observer ${received.constructor.name} to be equal to ${expected.constructor.name}`,
      pass: false,
    };
  }
}

expect.extend({
  async toOutputAsync(receivedFn: () => Promise<unknown>, expected: string) {
    let output = '';
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      output += args.map((a) => String(a)).join(' ') + '\n';
    };

    try {
      await receivedFn();
    } finally {
      console.log = originalLog;
    }

    const pass = output.trim() === expected.trim();

    return {
      pass,
      message: () =>
        pass
          ? `Expected async output not to equal:\n${expected}`
          : `Expected async output:\n${expected}\n\nReceived:\n${output}`,
    };
  },

  isWritableProperty(received: object, propertyName: string) {
    const desc =
      Object.getOwnPropertyDescriptor(received, propertyName) ??
      Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(received),
        propertyName,
      );

    if (!desc) {
      return {
        pass: false,
        message: () =>
          `Expected object to have property '${propertyName}', but it does not exist.`,
      };
    }

    const hasGetter = typeof desc.get === 'function';
    const hasSetter = typeof desc.set === 'function';

    const pass = hasGetter && hasSetter;

    return {
      pass,
      message: () =>
        pass
          ? `Property '${propertyName}' does have getter and setter, but expected it NOT to.`
          : `Property '${propertyName}' is missing ${
              !hasGetter && !hasSetter
                ? 'getter and setter'
                : !hasGetter
                  ? 'getter'
                  : 'setter'
            }.`,
    };
  },
});

export const customMatchers = {
  toDeepEqualCircular,
  observerEqualTo,
};
